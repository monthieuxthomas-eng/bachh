# 📖 SETUP_INSTRUCTIONS.md - Instructions d'Installation Détaillées

Guide étape par étape pour mettre en place Baccha Festival Ticket Platform.

## Prérequis

- **Node.js**: Version 16.x ou supérieure
- **npm**: Inclus avec Node.js
- **Compte Stripe** (optionnel, pour production)
- **Compte Firebase** (obligatoire)
- **Compte Dynamic Labs** (obligatoire)

## ✅ Étape 1: Vérifier Node.js

Ouvrez un terminal/PowerShell et vérifiez:

```bash
node --version
# Doit afficher: v16.0.0 ou supérieur

npm --version
# Doit afficher: 7.0.0 ou supérieur
```

Si ce n'est pas installé, téléchargez depuis [nodejs.org](https://nodejs.org/)

## ✅ Étape 2: Cloner/Créer le Projet

Si le projet n'est pas encore téléchargé:

```bash
# Créer le dossier
mkdir Bacchamelo
cd Bacchamelo

# Initialiser Git (optionnel)
git init
```

Sinon, naviguez au dossier:

```bash
cd c:\Bacchamelo  # Windows
# ou
cd ~/Bacchamelo    # Mac/Linux
```

## ✅ Étape 3: Installer les Dépendances

Tous les fichiers source sont déjà présents. Installez les packages:

```bash
npm install
```

Cela créera un dossier `node_modules/` (peut prendre 2-3 minutes).

## ✅ Étape 4: Configuration Firebase (15 min)

### 4.1: Créer un Projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez **"Create Project"**
3. **Project name**: `baccha-festival`
4. **Google Analytics**: Vous pouvez désactiver
5. Cliquez **"Create project"** et attendez (1-2 min)

### 4.2: Activer Firestore Database

1. Dans le menu de gauche: **"Build"** → **"Firestore Database"**
2. Cliquez **"Create Database"**
3. **Security rules**: Sélectionnez **"Production mode"**
4. **Location**: Choisissez la région Euros la plus proche (ex: `europe-west1`)
5. Cliquez **"Create"**

### 4.3: Récupérer les Clés de Configuration

1. Allez à **Settings** ⚙️ (coin haut gauche)
2. Onglet **"General"**
3. Scroll jusqu'à **"Your apps"**
4. Cliquez sur l'application créée (badge `</>`  pour Web)
5. Vous voyez la configuration Firebase:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "baccha-festival.firebaseapp.com",
  projectId: "baccha-festival",
  storageBucket: "baccha-festival.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### 4.4: Mettre à Jour le Fichier `.env`

Ouvrez le fichier `.env` à la racine du projet (c:\Bacchamelo\.env):

```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=baccha-festival.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=baccha-festival
REACT_APP_FIREBASE_STORAGE_BUCKET=baccha-festival.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

**Important**: Copier les valeurs EXACTEMENT comme dans Firebase

### 4.5: Configurer les Règles Firestore

1. Dans Firebase, allez à **Firestore Database**
2. Onglet **"Rules"**
3. Remplacez tout par:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ticket_requests/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
```

4. Cliquez **"Publish"**

## ✅ Étape 5: Configuration Dynamic Labs (10 min)

### 5.1: Créer un Compte Dynamic

1. Allez sur [Dynamic Dashboard](https://app.dynamicauth.com/)
2. Cliquez **"Sign Up"**
3. Remplissez votre email et mot de passe
4. Vérifiez votre email
5. Vous êtes dans le dashboard

### 5.2: Créer une Application

1. Menu de gauche: **"Applications"**
2. Cliquez **"Create Application"**
3. **Application name**: `Baccha Festival`
4. **Description**: `Ticket Platform for Baccha Festival 2026`
5. Cliquez **"Create"**

### 5.3: Configurer les URLs

1. Dans votre application: **Settings** → **General**
2. **Development URL**: `http://localhost:3000`
3. **Production URL**: `https://baccha-festival.com` (remplacez par votre domaine)
4. Sauvegardez

### 5.4: Récupérer l'Environment ID

1. Restez dans **Settings** → **General**
2. Copiez l'**Environment ID** (commence par `ev_`)
3. Ouvrez `.env` et ajoutez:

```env
REACT_APP_DYNAMIC_ENV_ID=ev_...
```

### 5.5: Configurer les Networks (Optionnel)

1. Onglet **"Network Configuration"**
2. Sélectionnez les réseaux:
   - ✅ Ethereum
   - ✅ Polygon
   - ✅ Sepolia (testnet)
3. Sauvegardez

## ✅ Étape 6: Vérifier le Fichier `.env`

Votre fichier `.env` doit ressembler à:

```env
# Firebase
REACT_APP_FIREBASE_API_KEY=AIzaSyDa...
REACT_APP_FIREBASE_AUTH_DOMAIN=baccha-festival.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=baccha-festival
REACT_APP_FIREBASE_STORAGE_BUCKET=baccha-festival.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123

# Dynamic
REACT_APP_DYNAMIC_ENV_ID=ev_abcd1234

# Stripe (production seulement)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...

# SBT Ethereum (server.js)
SBT_RPC_URL=https://mainnet.infura.io/v3/...
SBT_MINTER_PRIVATE_KEY=0x...
SBT_CONTRACT_ADDRESS=0x...
SBT_CHAIN_ID=1
SBT_EXPLORER_BASE_URL=https://etherscan.io
SBT_DEFAULT_TOKEN_URI=ipfs://...
```

Le contrat SBT doit inclure la méthode `mintSoulbound(address to, string tokenURI_)`.

## ✅ Étape 7: Démarrer l'Application

```bash
npm start
```

Vous devriez voir:

```
> react-scripts start

Compiled successfully!

You can now view baccha-festival in the browser.

  Local:            http://localhost:3000
  
Press q to quit.
```

L'app s'ouvre sur http://localhost:3000

## ✅ Étape 8: Test Basic (Verification)

### Test 1: Page d'accueil charge

- ✅ Vous voyez "Baccha Festival 2026"
- ✅ Il y a un bouton "Se connecter"
- ✅ L'emoji 🎉 s'affiche

### Test 2: Authentification fonctionne

1. Cliquez "Se connecter"
2. Choisissez "Email"
3. Entrez: `test@example.com`
4. Vérifiez votre email (vérification link)
5. Cliquez le lien dans l'email

**Résultat**: Vous voyez l'écran "Obtenir mon Pass Baccha"

### Test 3: Achat de ticket fonctionne

1. Cliquez "Acheter mon Pass - 1€"
2. Attendez 2 secondes

**Résultat**: Vous voyez "Traitement en cours..."

### Test 4: Firestore reçoit la demande

1. Ouvrez Firebase Console
2. **Firestore Database**
3. Collection `ticket_requests`
4. Vous devriez voir un document avec `status: "pending"`

## ✅ Étape 9: Configuration Admin (Optionnel)

Pour tester la validation du ticket:

1. Dans Firestore, sélectionnez le document
2. Cliquez "Edit"
3. Changez `status`: `"pending"` → `"minted"`
4. Ajoutez un champ: `transactionHash: "0xtest123"`
5. Cliquez "Confirmer"

**Résultat**: L'app affiche le QR code!

## ✅ Étape 10: Structure des Fichiers Finaux

Vérifiez que vous avez:

```
Bacchamelo/
├── node_modules/        (créé par npm install)
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── AuthComponent.jsx
│   │   ├── BuyTicketComponent.jsx
│   │   ├── WaitingComponent.jsx
│   │   └── TicketComponent.jsx
│   ├── App.js
│   ├── firebase.js
│   ├── index.js
│   └── index.css
├── .env               (IMPORTANT!)
├── package.json
└── README.md
```

## 🎯 Prochaines Étapes

1. **Apprendre la structure**: Lisez [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
2. **Tester complètement**: Lisez [TESTING_GUIDE.md](TESTING_GUIDE.md)
3. **Déployer**: Lisez [DEPLOYMENT.md](DEPLOYMENT.md)

## 🚨 Troubleshooting Installation

### ❌ "npm: command not found"
- Node.js n'est pas installé ou mal configuré
- Téléchargez depuis [nodejs.org](https://nodejs.org/)
- Redémarrez votre terminal après installation

### ❌ "Module not found"
```bash
# Réinstallez les dépendances
rm -rf node_modules package-lock.json
npm install
```

### ❌ "'REACT_APP_FIREBASE_API_KEY' is not recognized"
- Redémarrez le terminal/PowerShell après écrire `.env`
- Vérifiez que `.env` est à la racine (c:\Bacchamelo\.env)

### ❌ "Port 3000 is already in use"
```bash
# Sur Windows PowerShell:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Sur Mac/Linux:
lsof -i :3000
kill -9 <PID>
```

### ❌ "Firebase initialization failed"
- Vérifiez les clés dans `.env`
- Testez avec: `console.log(process.env.REACT_APP_FIREBASE_PROJECT_ID)`
- Redémarrez `npm start`

## ✅ Confirmation d'Installation Réussie

Vous devriez voir:

1. **Terminal**: Pas d'erreur rouge
2. **Browser**: http://localhost:3000 charge
3. **Page**: Bouton "Se connecter" visible
4. **Firebase**: Collection `ticket_requests` existe
5. **Dynamic**: L'auth widget charge

## 🎉 Félicitations!

Vous avez configuré avec succès Baccha Festival!

Prochaine étape: Lire [TESTING_GUIDE.md](TESTING_GUIDE.md) pour un test complet.

---

**Besoin d'aide?** Consultez [README.md](README.md) ou [QUICK_START.md](QUICK_START.md)
