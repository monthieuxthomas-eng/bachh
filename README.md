# 🎉 Baccha Festival 2026 - Plateforme de Tickets SBT

Bienvenue sur la plateforme de tickets Soulbound Token (SBT) du Baccha Festival 2026! Cette application web permet aux festivaliers de s'authentifier, d'acheter un ticket à 1€ et de recevoir un SBT lié à leur identité.

## 🚀 Caractéristiques Principales

✨ **Authentification Sécurisée**
- Intégration Dynamic SDK pour connexion par Email ou Réseaux Sociaux
- Portefeuille embedded automatique
- Gestion complète des utilisateurs

💳 **Flux d'Achat Fluide**
- Interface intuitive pour l'achat de tickets
- Paiement simulé Stripe (à intégrer en production)
- Création automatique de demandes dans Firestore
- Attente en temps réel avec animation tropicale

🎫 **Tickets SBT (Soulbound Token)**
- QR code dynamique et sécurisé
- Génération automatique une fois validé par l'admin
- Non transférable et lié à l'identité
- Design magnifique avec thème Or/Émeraude

🔄 **Synchronisation Temps Réel**
- Écoute en temps réel des changements de statut Firestore
- Mise à jour instantanée de l'interface
- Gestion propre du cycle de vie des tickets

## 📋 Prérequis

- Node.js 16.x ou supérieur
- npm ou yarn
- Compte Firebase avec Firestore activé
- Compte Dynamic Labs
- Compte Stripe (pour la production)

## 🔧 Installation

### 1. Cloner le projet et installer les dépendances

```bash
cd Bacchamelo
npm install
```

### 2. Configurer les Variables d'Environnement

Créez un fichier `.env` à la racine du projet:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=votre_clé_api_firebase
REACT_APP_FIREBASE_AUTH_DOMAIN=votre_projet.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=votre_id_projet
REACT_APP_FIREBASE_STORAGE_BUCKET=votre_projet.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=votre_id_sender
REACT_APP_FIREBASE_APP_ID=votre_app_id

# Dynamic Labs Configuration
REACT_APP_DYNAMIC_ENV_ID=votre_dynamic_env_id

# Stripe Configuration (Production)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_votre_clé_stripe

# SBT Ethereum (backend server.js)
SBT_RPC_URL=https://mainnet.infura.io/v3/votre_project_id
SBT_MINTER_PRIVATE_KEY=0xvotre_cle_privee_minter
SBT_CONTRACT_ADDRESS=0xVotreContratSBT
SBT_CHAIN_ID=1
SBT_EXPLORER_BASE_URL=https://etherscan.io
SBT_DEFAULT_TOKEN_URI=ipfs://votre-metadata-sbt
TICKET_QR_SIGNING_SECRET=une_cle_longue_et_aleatoire
WALLET_CHALLENGE_TTL_MS=120000
TEST_MINT_API_KEY=cle_api_pour_test_mint
```

> Le contrat SBT doit exposer la fonction `mintSoulbound(address to, string tokenURI_)`.

Le backend expose aussi `POST /verify-ticket`:
- entrée: `{ qrData: "baccha://ticket/..." }`
- vérifie la signature du QR (anti falsification)
- vérifie le contrat officiel + owner on-chain via `ownerOf(tokenId)`
- rejette tout QR fabriqué depuis une autre clé/contrat.

### Vérification forte à l'entrée (challenge wallet)

1. Le scanner admin lit le QR et appelle `POST /verify-ticket`.
2. Si valide, le scanner appelle `POST /wallet-challenge/request` avec le même `qrData`.
3. Le backend renvoie un `message` (nonce unique + expiration).
4. Le festivalier signe ce `message` avec son wallet MetaMask.
5. Le scanner envoie la signature vers `POST /wallet-challenge/verify`.
6. Si `verified: true`, la personne contrôle bien le wallet propriétaire du SBT.

### Mint test direct (sans Stripe)

Endpoint: `POST /test-mint-sbt`
- header: `x-test-api-key: <TEST_MINT_API_KEY>`
- body: `{ "walletAddress": "0x...", "ticketId": "test-001" }`
- résultat: nouveau SBT + `ticketQrData` signé.

### 3. Configuration Firebase Firestore

Créez les collections dans Firestore:

**Collection: `ticket_requests`**
- Document ID: userId (auto-generated)
- Champs:
  ```
  userId: string
  userAddress: string (adresse wallet)
  userName: string
  userEmail: string
  status: "pending" | "minted" | "failed"
  timestamp: timestamp
  amount: number (1.0)
  currency: string ("EUR")
  stripePaymentId: string
  transactionHash: string (ajouté par l'admin)
  ```

### 4. Configuration Dynamic Labs

1. Créez un compte sur [Dynamic Labs](https://www.dynamic.xyz/)
2. Créez une nouvelle application
3. Copiez votre `ENVIRONMENT_ID`
4. Configurez les réseaux autorisés (Ethereum, Polygon, etc.)

## 🏃 Démarrer l'Application

```bash
npm start
```

L'app ouvrira sur `http://localhost:3000`

## 📱 Architecture & Flux de l'Application

### État de l'Application (4 états)

```
auth (Authentification)
  ↓
buy (Achat du Ticket)
  ↓
waiting (Attente de Validation Admin)
  ↓
ticket (Affichage du QR Code SBT)
```

### Composants Principaux

1. **AuthComponent** (`src/components/AuthComponent.jsx`)
   - Affiche le widget Dynamic pour la connexion
   - Récupère l'adresse du portefeuille

2. **BuyTicketComponent** (`src/components/BuyTicketComponent.jsx`)
   - Affiche le formulaire d'achat
   - Simule le paiement Stripe
   - Crée la demande dans Firestore

3. **WaitingComponent** (`src/components/WaitingComponent.jsx`)
   - Animation tropicale pendant l'attente
   - Affiche la progression (Paiement → Génération → QR Code)

4. **TicketComponent** (`src/components/TicketComponent.jsx`)
  - Affiche le QR code on-chain (URL transaction/token Etherscan)
   - Boutons de téléchargement/impression
   - Informations du ticket

### App.js Architecture

```
App (avec DynamicContextProvider)
  ├── AppContent (gère les états)
  │   ├── Écoute Dynamic User & Wallet
  │   ├── Écoute Firestore (onSnapshot)
  │   ├── Gère les transitions d'état
  │   └── Rend le composant approprié
```

## 🎨 Design & Thème

### Couleurs Baccha
- **Or/Jaune**: `#FFCC00` (primaire, CTA)
- **Émeraude**: `#004D40` (accentuation, texte)
- **Beige Clair**: `#F5F5F0` (arrière-plan)

### Iconographie
- Utilise `lucide-react` pour les icônes
- Emojis festifs pour l'ambiance tropicale
- Animations fluides et engageantes

## 🔐 Sécurité

- Authentification via Dynamic (ERC-4337, Smart Wallets)
- Portefeuille embedded, pas d'export de clés privées
- SBT non transférable par nature
- Validation côté admin requise pour valider le paiement
- QR code contient: adresse + hash + identifiant festival

## 💾 Flux Firestore en Détail

### Étape 1: Création de Demande
```javascript
POST /ticket_requests (userId)
{
  status: "pending",
  timestamp: serverTimestamp(),
  stripePaymentId: "pi_xxxxx"
}
```

### Étape 2: Mint SBT Ethereum (automatique au paiement validé)
```javascript
UPDATE /ticket_requests/{userId}
{
  status: "minted",
  transactionHash: "0x789abc...",
  tokenId: "123",
  contractAddress: "0x..."
}
```

### Étape 3: L'app détecte le changement
- OnSnapshot déclenche la mise à jour de l'état
- Interface passe automatiquement à l'écran de ticket

## ⚙️ Configuration Backend (Cloud Functions)

Pour automatiser la validation admin, créez une Cloud Function (`addStatus.js`):

```javascript
// Cette fonction est réservée à l'admin
exports.mintTicket = functions.https.onCall(async (data, context) => {
  // Vérifier que l'appelant est admin
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin required');
  }

  const { userId, transactionHash } = data;

  // Mettre à jour Firestore
  await admin.firestore().collection('ticket_requests').doc(userId).update({
    status: 'minted',
    transactionHash: transactionHash,
    mintedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});
```

## 🧪 Tester l'Intégration

### 1. Tester l'Authentification
- Cliquer sur "Se connecter"
- Choisir Email ou Réseau Social
- Vérifier que l'adresse wallet s'affiche

### 2. Tester l'Achat
- Cliquer "Acheter mon Pass - 1€"
- Vérifier la création du document Firestore
- Écran "Traitement en cours" doit apparaître

### 3. Tester la Synchronisation
- Dans Firestore Console:
  - Ouvrir le document `ticket_requests/{userId}`
  - Changer `status` de "pending" à "minted"
  - Ajouter `transactionHash: "0x123abc..."`
- L'app doit instantanément afficher le QR code!

### 4. Tester le QR Code
- Cliquer "Télécharger" pour sauvegarder l'image
- Scanner avec un lecteur QR standard
- Vérifier les données: `adresse|hash|BACCHA2026`

## 📦 Structure des Fichiers

```
Bacchamelo/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── AuthComponent.jsx
│   │   ├── BuyTicketComponent.jsx
│   │   ├── WaitingComponent.jsx
│   │   └── TicketComponent.jsx
│   ├── App.js
│   ├── App.css
│   ├── firebase.js
│   ├── index.js
│   └── index.css
├── .env
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 🚀 Déploiement

### Vercel (Recommandé)
```bash
npm run build
# Connecter le repo GitHub
# Déployer via Vercel Dashboard
```

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy
```

### Netlify
```bash
npm run build
# Connecter le repo GitHub
# Déployer via Netlify Dashboard
```

## 🛠️ Dépannage

### "Module not found: @dynamic-labs/sdk-react-core"
```bash
npm install @dynamic-labs/sdk-react-core @dynamic-labs/ethers-v6
```

### Firestore non initialisé
- Vérifiez les clés `.env`
- Assurez-vous que Firestore est activé dans Firebase Console

### QR Code ne scanne pas
- Vérifiez que `qrcode.react` est bien installé
- Testez avec un scanner QR différent
- Vérifiez les données: format `adresse|hash|BACCHA2026`

## 📞 Support & Contact

Pour toute question ou problème:
- Consultez la [documentation Dynamic Labs](https://docs.dynamic.xyz/)
- Consultez la [documentation Firebase](https://firebase.google.com/docs)
- Ouvrez une issue sur le repo

## 📄 Licence

Ce projet est sous licence MIT. Libre d'utilisation pour Baccha Festival.

---

**Prêt? Exécutez `npm start` et commencez!** 🎉🎫
