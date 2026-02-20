# 🧪 Guide de Test - Baccha Festival Ticket Platform

Ce guide vous montre comment tester complètement l'application en local avant le déploiement.

## 📋 Checklist de Test

- [ ] Configuration Firebase
- [ ] Configuration Dynamic Labs
- [ ] Test d'authentification
- [ ] Test d'achat de ticket
- [ ] Test de synchronisation Firestore
- [ ] Test du QR code
- [ ] Test du panel admin

## 🔥 1. Configuration Firebase

### 1.1 Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez "Add Project"
3. Nom: `baccha-festival` (ou autre)
4. Activer Google Analytics (optionnel)
5. Créer le projet

### 1.2 Activer Firestore

1. Dans Firebase Console, cliquez "Firestore Database"
2. Cliquez "Create database"
3. Mode: **Production mode** (vous configurerez les règles après)
4. Région: Choisissez la plus proche (ex: Europe - eu-west-1)

### 1.3 Récupérer les Clés

1. Paramètres projet (⚙️ en haut à gauche)
2. Onglet "General"
3. Scroll jusqu'à "Your apps"
4. Cliquez sur l'icône `</>`  web
5. Copier la config Firebase:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "baccha-festival.firebaseapp.com",
  projectId: "baccha-festival",
  storageBucket: "baccha-festival.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

6. Collez dans le fichier `.env`:

```
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=baccha-festival.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=baccha-festival
REACT_APP_FIREBASE_STORAGE_BUCKET=baccha-festival.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123...
```

### 1.4 Configurer les Règles Firestore

1. Dans Firestore, allez à l'onglet "Rules"
2. Remplacez par:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Les utilisateurs peuvent lire/écrire leurs propres documents
    match /ticket_requests/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Les administrateurs peuvent tout faire
    match /{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
```

3. Cliquez "Publish"

## 🔐 2. Configuration Dynamic Labs

### 2.1 Créer un Compte Dynamic

1. Allez sur [Dynamic Labs Dashboard](https://app.dynamicauth.com/)
2. Sign up avec votre email
3. Créez une organisation

### 2.2 Créer une Application

1. Dashboard → "Applications"
2. Cliquez "Create Application"
3. Nom: `Baccha Festival`
4. Description: `Ticket Platform for Baccha Festival 2026`
5. URLs:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

### 2.3 Récupérer l'Environment ID

1. Dans Application Settings
2. Copiez l'`Environment ID` (commence par `ev_`)
3. Collez dans `.env`:

```
REACT_APP_DYNAMIC_ENV_ID=ev_...
```

### 2.4 Configurer les Networks

1. Dans "Network Configuration"
2. Activer les réseaux que vous voulez:
   - Ethereum ✅
   - Polygon ✅
   - Sepolia (testnet) ✅

## 💳 3. Configuration Stripe (Production)

Pour le test, nous simulons le paiement. Pour la production:

1. Allez sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. Cliquez "Developers" → "API Keys"
3. Copiez la `Publishable Key`
4. Collez dans `.env`:

```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## 🚀 4. Démarrer l'Application

```bash
cd Bacchamelo
npm start
```

L'app ouvrira sur `http://localhost:3000`

## 🧪 5. Test d'Authentification

### Test 1: Connexion avec Email

1. Cliquez "Se connecter"
2. Choisissez "Email"
3. Entrez votre email: `test@example.com`
4. Vérifiez votre email et cliquez le lien
5. Vous êtes connecté!

**Résultat attendu:**
- ✅ Vous voyez l'écran "Obtenir mon Pass Baccha"
- ✅ L'adresse wallet s'affiche en bas
- ✅ Vous pouvez cliquer "Acheter mon Pass"

### Test 2: Connexion avec Google

1. Cliquez "Se connecter"
2. Choisissez "Google"
3. Authentifiez-vous avec Google
4. Pas de fenêtre popup, retour à l'app

**Résultat attendu:**
- ✅ Même que Test 1

## 🎫 6. Test d'Achat de Ticket

1. Sur l'écran "Obtenir mon Pass Baccha"
2. Cliquez "Acheter mon Pass - 1€"
3. Patientez 2 secondes (simulation du paiement)

**Résultat attendu:**
- ✅ Message "Traitement en cours..." apparaît
- ✅ Animation tropicale (soleil, palmier, ananas)
- ✅ Étape "Paiement validé" en vert
- ✅ Étape "Génération du token..." en animation

**Vérifier dans Firestore:**

1. Console Firebase → Firestore
2. Collection `ticket_requests`
3. Vous devriez voir un document avec:

```
userId: ev_... (votre ID Dynamic)
userAddress: 0x123... (adresse wallet)
userName: test@example.com
status: "pending"
timestamp: (timestamp actuel)
amount: 1.0
currency: "EUR"
stripePaymentId: "sim_..."
```

## 📡 7. Test de Synchronisation Firestore

### Test: Changer le statut du ticket

1. Restez sur l'écran "Traitement en cours..."
2. Ouvrez Firestore Console
3. Trouvez le document du ticket
4. Cliquez "Edit"
5. Changez le champ `status` de `"pending"` à `"minted"`
6. Ajoutez un champ `transactionHash` avec la valeur `"0xabcd1234567890abcdef"`
7. Cliquez "Save"

**Résultat attendu:**
- ✅ L'écran se met à jour IMMÉDIATEMENT
- ✅ L'animation disparaît
- ✅ Le QR code s'affiche
- ✅ Aucun rechargement de page nécessaire!

## 🎟️ 8. Test du QR Code

### Test: Scanner le QR Code

Sur l'écran du ticket:

1. Cliquez "Télécharger"
   - ✅ L'image QR code se télécharge
   - ✅ Nom: `baccha-sbt-ev_....png`

2. Cliquez "Imprimer"
   - ✅ Le dialogue d'impression s'ouvre
   - ✅ Vous pouvez imprimer

3. Cliquez "Copier" (adresse wallet)
   - ✅ Le texte s'affiche "Copié!"
   - ✅ L'adresse est dans le presse-papiers

### Test: Vérifier les données du QR Code

1. Utilisez un lecteur QR en ligne: [QR Reader](https://zxing.org/w/decode.jspx)
2. Uploadez l'image téléchargée
3. Les données devraient être: `0x123...abcd|0xabcd1234567890abcdef|BACCHA2026`

**Format:** `{adresse_wallet}|{transactionHash}|BACCHA2026`

## 👨‍💼 9. Test du Panel Admin

### Intégration du Panel Admin

1. Copiez le fichier `ADMIN_PANEL_EXAMPLE.jsx`
2. Mettez-le dans `src/components/AdminPanel.jsx`
3. Importez-le dans `App.js`:

```javascript
import AdminPanel from './components/AdminPanel';
```

4. Ajoutez une route vers le panel:

```javascript
// Sur l'écran d'authentification
<button onClick={() => window.location.href = '/admin'}>
  Admin Panel
</button>
```

### Test du Panel Admin

1. Accédez au panel admin
2. Vous voyez les stats: Pending (1), Minted (0), Failed (0)
3. Cliquez sur le ticket en attente
4. Entrez un hash: `0x999888777`
5. Cliquez "Valider"

**Résultat attendu:**
- ✅ Le ticket passe en "Minted"
- ✅ Sur le client, l'app se met à jour automatiquement
- ✅ Le QR code s'affiche

## 🔄 10. Test du Cycle Complet (End-to-End)

1. **Authentification**: Se connecter
2. **Achat**: Cliquer "Acheter mon Pass"
3. **Attente**: Voir l'écran avec animation
4. **Admin**: Changer le statut à "minted"
5. **Réception**: QR code s'affiche
6. **Téléchargement**: Télécharger le QR code
7. **Vérification**: Scanner et vérifier les données

Tous les points devraient être cochés ✅

## 🐛 Dépannage

### ❌ "Module not found: @dynamic-labs/sdk-react-core"

```bash
npm install @dynamic-labs/sdk-react-core @dynamic-labs/ethers-v6
```

### ❌ "Firebase is not initialized"

Vérifiez le fichier `.env`:
```bash
cat .env
```

Les clés doivent commencer par `REACT_APP_`

Redémarrez l'app: `npm start`

### ❌ "DynamicContextProvider is not a valid"

Dynamic Widget n'est pas rendu. Vérifiez que vous wrappe l'app avec `<DynamicContextProvider>`

### ❌ "QR code ne scanne pas"

1. Vérifiez que `transactionHash` est rempli dans Firestore
2. Testez avec un scanner différent
3. Assurez-vous que les données suivent le format: `adresse|hash|BACCHA2026`

### ❌ Firestore ne se met pas à jour en temps réel

1. Vérifiez que `onSnapshot` est appelé
2. Vérifiez que le document existe dans Firestore
3. Vérifiez les règles Firestore (permissions)

## ✅ Checklist Finale

Avant de lancer en production:

- [ ] Tous les tests passent en local
- [ ] Firebase configuré et sécurisé
- [ ] Dynamic Labs configuré avec les bons domaines
- [ ] Stripe configuré (clés en production)
- [ ] Cloud Functions déployées
- [ ] Règles Firestore sécurisées
- [ ] Admin panel sécurisé (authentification requise)
- [ ] Documentation mise à jour
- [ ] Numéro de support résilience
- [ ] Backup Firestore configuré

## 📞 Support

Si vous avez des questions:

1. Consultez la [doc Dynamic Labs](https://docs.dynamic.xyz/)
2. Consultez la [doc Firebase](https://firebase.google.com/docs)
3. Testez sur un autre navigateur
4. Vérifiez la console (F12 → Console)

---

**Prêt pour la production!** 🚀
