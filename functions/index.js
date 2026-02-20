require('dotenv').config();

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

const getStripeClient = () => {
  const secretKey =
    process.env.STRIPE_SECRET_KEY ||
    (functions.config().stripe && functions.config().stripe.secret);
  if (!secretKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Stripe secret key missing.'
    );
  }
  return require('stripe')(secretKey);
};

const getTicketConfig = async () => {
  const fallback = {
    amount: 1,
    currency: 'eur',
    description: 'Baccha Festival SBT Pass',
    successUrl: 'http://localhost:3000/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'http://localhost:3000/?checkout=cancel',
  };

  const configSnap = await db.collection('ticket_config').doc('default').get();
  if (!configSnap.exists) {
    return fallback;
  }

  const data = configSnap.data() || {};
  return {
    amount: Number(data.amount || fallback.amount),
    currency: String(data.currency || fallback.currency).toLowerCase(),
    description: data.description || fallback.description,
    successUrl: data.successUrl || fallback.successUrl,
    cancelUrl: data.cancelUrl || fallback.cancelUrl,
  };
};

exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const { userId, userEmail, userAddress } = data || {};

  if (!userId || !userEmail || !userAddress) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing user data.');
  }

  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid user.');
  }

  const stripe = getStripeClient();
  const config = await getTicketConfig();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: config.currency,
          product_data: {
            name: config.description,
          },
          unit_amount: Math.round(config.amount * 100),
        },
        quantity: 1,
      },
    ],
    customer_email: userEmail,
    success_url: config.successUrl,
    cancel_url: config.cancelUrl,
    metadata: {
      userId,
      userAddress,
    },
  });

  await db.collection('ticket_requests').doc(userId).set(
    {
      userId,
      userAddress,
      userName: userEmail,
      userEmail,
      status: 'checkout_started',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      amount: config.amount,
      currency: config.currency.toUpperCase(),
      stripeSessionId: session.id,
    },
    { merge: true }
  );

  return { url: session.url };
});

exports.verifyCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const { sessionId, userId } = data || {};
  if (!sessionId || !userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing session data.');
  }

  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid user.');
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session || session.payment_status !== 'paid') {
    throw new functions.https.HttpsError('failed-precondition', 'Payment not completed.');
  }

  if (session.metadata?.userId && session.metadata.userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Session mismatch.');
  }

  await db.collection('ticket_requests').doc(userId).set(
    {
      status: 'pending',
      stripeSessionId: session.id,
      stripePaymentStatus: session.payment_status,
      stripePaymentIntent: session.payment_intent,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { status: 'paid' };
});
