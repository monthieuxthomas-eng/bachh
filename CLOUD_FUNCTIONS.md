// Cloud Functions - Firebase Realtime Database Integration Guide
// Placez ces fonctions dans votre dossier functions/ de Firebase

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * Function: Créer un ticket request et simuler un paiement
 * Cette fonction crée automatiquement un document dans ticket_requests
 */
exports.createTicketRequest = functions.https.onCall(async (data, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }

  const { userAddress, userName, userEmail } = data;
  const userId = context.auth.uid;

  try {
    // Créer le document ticket_request
    await db.collection('ticket_requests').doc(userId).set({
      userId: userId,
      userAddress: userAddress,
      userName: userName,
      userEmail: userEmail,
      status: 'pending',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      amount: 1.0,
      currency: 'EUR',
      stripePaymentId: `sim_${Date.now()}`,
    });

    console.log(`Ticket request created for user: ${userId}`);
    return { success: true, ticketId: userId };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Function: Valider un ticket et générer le SBT
 * À utiliser uniquement par les administrateurs
 * Déclenche la génération du QR code côté client
 */
exports.mintTicket = functions.https.onCall(async (data, context) => {
  // Vérifier que l'utilisateur est administrateur
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin access required'
    );
  }

  const { userId, transactionHash } = data;

  if (!userId || !transactionHash) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId and transactionHash required'
    );
  }

  try {
    // Mettre à jour le statut du ticket
    await db.collection('ticket_requests').doc(userId).update({
      status: 'minted',
      transactionHash: transactionHash,
      mintedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Ticket minted for user: ${userId}`);
    return { success: true, transactionHash };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Function: Rejeter un ticket (en cas de problème)
 * À utiliser uniquement par les administrateurs
 */
exports.failTicket = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin access required'
    );
  }

  const { userId, reason } = data;

  try {
    await db.collection('ticket_requests').doc(userId).update({
      status: 'failed',
      failureReason: reason || 'Unknown error',
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Firestore Trigger: Envoyer un email quand le statut change en 'minted'
 * Nécessite: npm install nodemailer
 */
exports.onTicketMinted = functions.firestore
  .document('ticket_requests/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Si le statut passe à 'minted', envoyer un email
    if (before.status === 'pending' && after.status === 'minted') {
      console.log(`Ticket minted for ${after.userEmail}`);
      
      // Ici, vous pouvez ajouter l'envoi d'email
      // Exemple avec Sendgrid ou nodemailer
      
      return { success: true };
    }

    return null;
  });

/**
 * Firestore Trigger: Nettoyer les tickets 'pending' après 24h
 */
exports.cleanupOldPendingTickets = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const snapshot = await db
      .collection('ticket_requests')
      .where('status', '==', 'pending')
      .where('timestamp', '<', cutoffTime)
      .get();

    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'expired',
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} expired tickets`);
    return null;
  });

/**
 * REST API: Obtenir les stats des tickets (admin)
 */
exports.getTicketStats = functions.https.onRequest(async (req, res) => {
  // Simple authentication avec un token admin
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized');
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    // Vérifier le token (vous pouvez utiliser Admin SDK pour vérifier un JWT)
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await admin.auth().getUser(decodedToken.uid);
    
    // Vérifier le custom claim d'admin
    if (!decodedToken.admin) {
      return res.status(403).send('Admin access required');
    }

    // Récupérer les stats
    const pendingSnapshot = await db
      .collection('ticket_requests')
      .where('status', '==', 'pending')
      .get();

    const mintedSnapshot = await db
      .collection('ticket_requests')
      .where('status', '==', 'minted')
      .get();

    const failedSnapshot = await db
      .collection('ticket_requests')
      .where('status', '==', 'failed')
      .get();

    res.json({
      pending: pendingSnapshot.size,
      minted: mintedSnapshot.size,
      failed: failedSnapshot.size,
      total: pendingSnapshot.size + mintedSnapshot.size + failedSnapshot.size,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});
