# 🎯 GUIDE DE DÉMARRAGE RAPIDE - Baccha Festival

Ceci est le guide le plus court et le plus direct pour démarrer en moins de 30 minutes.

## ⚡ Installation Ultra-Rapide (5 minutes)

### Windows:
```bash
cd c:\Bacchamelo
install.bat
```

### Linux/Mac:
```bash
cd Bacchamelo
chmod +x install.sh
./install.sh
```

## 🔑 Configuration des Clés (10 minutes)

### 1️⃣ Firebase

1. Allez à https://console.firebase.google.com/
2. Créez un nouveau projet: "baccha-festival"
3. Activez Firestore Database (Mode Production)
4. ⚙️ Paramètres → Onglet "General"
5. Scroll jusqu'à "Your apps" → cliquez `</>`
6. Copiez la configuration
7. Éditez `.env`:

```env
REACT_APP_FIREBASE_API_KEY=YOUR_VALUE
REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_VALUE
REACT_APP_FIREBASE_PROJECT_ID=YOUR_VALUE
REACT_APP_FIREBASE_STORAGE_BUCKET=YOUR_VALUE
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_VALUE
REACT_APP_FIREBASE_APP_ID=YOUR_VALUE
```

### 2️⃣ Dynamic Labs

1. Allez à https://app.dynamicauth.com/
2. Sign up
3. Create Application → "Baccha Festival"
4. Copiez l'Environment ID
5. Éditez `.env`:

```env
REACT_APP_DYNAMIC_ENV_ID=ev_...
```

## 🚀 Démarrer l'App (5 minutes)

```bash
npm start
```

L'app s'ouvre sur http://localhost:3000

## ✅ Test Rapide (10 minutes)

### Test 1: Se connecter
1. Cliquez "Se connecter"
2. Choisissez "Email"
3. Entrez un email
4. Vérifiez et cliquez le lien

**Résultat attendu**: Vous voyez l'écran "Obtenir mon Pass Baccha"

### Test 2: Acheter un ticket
1. Cliquez "Acheter mon Pass - 1€"
2. Patientez 2 secondes

**Résultat attendu**: Animation "Traitement en cours..." pour 
  
### Test 3: Valider le ticket (Admin)
1. Ouvrez Firebase Console → Firestore
2. Collection `ticket_requests` → Sélectionnez le document
3. Changez `status` de `"pending"` à `"minted"`
4. Ajoutez un champ: `transactionHash: "0x123abc"`
5. Sauvegardez

**Résultat attendu**: L'app affiche instantanément le QR code!

## 📁 Fichiers Importants à Connaître

| Fichier | Rôle |
|---------|------|
| `src/App.js` | Logique principale et états |
| `src/firebase.js` | Configuration Firebase |
| `.env` | Variables sensibles |
| `README.md` | Documentation complète |
| `TESTING_GUIDE.md` | Guide de test détaillé |

## 🔧 Troubleshooting Rapide

### ❌ "Cannot find module '@dynamic-labs/sdk-react-core'"
```bash
npm install @dynamic-labs/sdk-react-core @dynamic-labs/ethers-v6
```

### ❌ "Firebase is not initialized"
Vérifiez les clés dans `.env` et redémarrez `npm start`

### ❌ "DynamicContextProvider is not a valid"
Vérifiez `REACT_APP_DYNAMIC_ENV_ID` dans `.env`

### ❌ "Firestore connection timeout"
Vérifiez votre connexion internet et les clés Firebase

## 📚 Documentation Complète

- **Installation détaillée**: [README.md](README.md)
- **Tests complets**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Déploiement**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Architecture**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **Cloud Functions**: [CLOUD_FUNCTIONS.md](CLOUD_FUNCTIONS.md)

## 🎯 Prochaines Étapes

1. ✅ Installation
2. ✅ Configuration des clés
3. ✅ Tests locaux
4. ➜ **Déployer en production** (voir [DEPLOYMENT.md](DEPLOYMENT.md))
5. ➜ **Mettre en place l'admin panel** (voir [ADMIN_PANEL_EXAMPLE.jsx](ADMIN_PANEL_EXAMPLE.jsx))
6. ➜ **Configurer les Cloud Functions** (voir [CLOUD_FUNCTIONS.md](CLOUD_FUNCTIONS.md))

## 💬 Support Rapide

| Problème | Solution |
|----------|----------|
| App ne démarre pas | Vérifier Node.js version 16+ |
| Erreurs Firebase | Vérifier les clés `.env` |
| QR code ne scanne pas | Vérifier que `transactionHash` est rempli |
| Authentification échoue | Vérifier `REACT_APP_DYNAMIC_ENV_ID` |

## 🎉 Vous êtes Prêt!

```bash
npm start
```

Allez à http://localhost:3000 et testez! 🚀

---

**Questions?** Consultez [README.md](README.md) ou [TESTING_GUIDE.md](TESTING_GUIDE.md)
