# 📁 Structure Complète du Projet - Baccha Festival

Visualisation de la structure du projet:

```
Bacchamelo/
│
├── 📄 Configuration Files
│   ├── package.json                    # Dépendances et scripts
│   ├── .env                            # Variables d'environnement (local)
│   ├── .env.production                 # Variables d'environnement (prod)
│   ├── .gitignore                      # Fichiers ignorés par Git
│   ├── tailwind.config.js              # Configuration Tailwind CSS
│   └── postcss.config.js               # Configuration PostCSS
│
├── 📚 Documentation
│   ├── README.md                       # Guide principal
│   ├── TESTING_GUIDE.md                # Guide de test complet
│   ├── DEPLOYMENT.md                   # Guide de déploiement
│   ├── CLOUD_FUNCTIONS.md              # Cloud Functions Firebase
│   ├── PROJECT_STRUCTURE.md            # Ce fichier
│   └── SETUP_INSTRUCTIONS.md           # Instructions d'installation (détaillées)
│
├── 🔧 Scripts Installation
│   ├── install.sh                      # Installation rapide (Linux/Mac)
│   └── install.bat                     # Installation rapide (Windows)
│
├── public/
│   └── index.html                      # Page HTML principale
│
├── src/
│   ├── index.js                        # Point d'entrée React
│   ├── index.css                       # Styles globaux
│   ├── App.js                          # Composant principal
│   ├── App.css                         # Styles App
│   ├── firebase.js                     # Configuration Firebase
│   ├── utils.js                        # Fonctions utilitaires
│   │
│   └── components/
│       ├── AuthComponent.jsx           # Écran d'authentification
│       ├── BuyTicketComponent.jsx      # Écran d'achat de ticket
│       ├── WaitingComponent.jsx        # Écran d'attente (animation)
│       ├── TicketComponent.jsx         # Écran du QR code
│       ├── ErrorBoundary.jsx           # Gestion des erreurs
│       └── AdminPanel.jsx              # Panel admin (optionnel)
│
├── functions/                          # Cloud Functions Firebase (optional)
│   ├── index.js                        # Fonctions principales
│   ├── package.json                    # Dépendances Cloud Functions
│   └── .env.local                      # Variables Cloud Functions
│
└── build/                              # Généré après npm run build
    └── (fichiers de production)
```

## 📊 Flux de Données

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│              Utilisateur Visiteur                            │
│                    ↓                                          │
│         ┌──────────────────────┐                             │
│         │   [Auth Component]   │                             │
│         │  Dynamic SDK Widget  │                             │
│         └──────────────┬───────┘                             │
│                        ↓                                      │
│              Utilisateur Connecté                            │
│         (Email + Wallet Address)                             │
│                        ↓                                      │
│         ┌──────────────────────────┐                         │
│         │ [Buy Ticket Component]   │                         │
│         │  - Affiche le formulaire │                         │
│         │  - Bouton "Acheter"      │                         │
│         └──────────────┬───────────┘                         │
│                        ↓                                      │
│         ┌──────────────────────────┐                         │
│         │  Simulation Stripe API   │                         │
│         │  (2 secondes)            │                         │
│         └──────────────┬───────────┘                         │
│                        ↓                                      │
│         ┌──────────────────────────────────────────┐         │
│         │ Firestore: CREATE ticket_requests doc   │         │
│         │ {                                        │         │
│         │   userId: "ev_...",                      │         │
│         │   userAddress: "0x123...",               │         │
│         │   status: "pending",                     │         │
│         │   timestamp: Date.now()                  │         │
│         │ }                                        │         │
│         └──────────────┬───────────────────────────┘         │
│                        ↓                                      │
│         ┌──────────────────────────────┐                     │
│         │  [Waiting Component]         │                     │
│         │  - Animation tropicale       │                     │
│         │  - onSnapshot listening      │                     │
│         └──────────────┬───────────────┘                     │
│                        ↓                                      │
│         ┌──────────────────────────────────┐                 │
│         │ Admin Panel: Valide le ticket    │                 │
│         │ UPDATE status: "minted"          │                 │
│         │ ADD transactionHash: "0xabc..."  │                 │
│         └──────────────┬───────────────────┘                 │
│                        ↓                                      │
│         ┌──────────────────────────────┐                     │
│         │  Firestore: onSnapshot        │                    │
│         │  détecte status="minted"      │                    │
│         │  → App passe à state="ticket" │                    │
│         └──────────────┬───────────────┘                     │
│                        ↓                                      │
│         ┌──────────────────────────────┐                     │
│         │  [Ticket Component]          │                     │
│         │  - Affiche QR code           │                    │
│         │ Données: 0x123|0xabc|2026    │                    │
│         │  - Boutons: Download/Print   │                    │
│         └──────────────────────────────┘                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 États de l'Application

```
┌─────────────┐
│   "auth"    │ Authentification (connexion)
└──────┬──────┘
       │ onAuthSuccess()
       ↓
┌─────────────┐
│   "buy"     │ Choix d'achat du ticket
└──────┬──────┘
       │ onPurchaseStart()
       ↓
┌──────────────┐
│  "waiting"   │ Attente de validation admin
└──────┬───────┘
       │ status="minted" (Firestore onSnapshot)
       ↓
┌─────────────┐
│  "ticket"   │ Affichage du QR code final
└─────────────┘
```

## 🗄️ Structure Firestore

### Collection: `ticket_requests`

```
ticket_requests/
├── {userId: "ev_123abc..."} → Document
│   ├── userId: "ev_123abc..."
│   ├── userAddress: "0x123...abc"
│   ├── userName: "john@example.com"
│   ├── userEmail: "john@example.com"
│   ├── status: "pending" | "minted" | "failed" | "expired"
│   ├── timestamp: Timestamp (2026-02-17T14:30:00Z)
│   ├── amount: 1.0
│   ├── currency: "EUR"
│   ├── stripePaymentId: "sim_1234567890"
│   ├── transactionHash: "0xabc123..." (ajouté à "minted")
│   ├── mintedAt: Timestamp (quand l'admin a validé)
│   ├── failureReason: "Payment error" (si failed)
│   └── expiredAt: Timestamp (si expired)
│
├── {userId: "ev_456def..."} → Document
│   └── (même structure)
│
└── ...
```

### Collection: `users` (pour l'admin)

```
users/
├── {userId: "admin_user"} → Document
│   ├── role: "admin"
│   ├── email: "admin@baccha-festival.fr"
│   └── createdAt: Timestamp
│
└── ...
```

## 🔐 Cloud Functions Requises

### 1. `createTicketRequest`
- **Type**: HTTPS Callable
- **Authentification**: Utilisateur connecté
- **Entrée**: userAddress, userName, userEmail
- **Sortie**: { success: true, ticketId: userId }
- **Action**: Crée un document dans ticket_requests avec status="pending"

### 2. `mintTicket`
- **Type**: HTTPS Callable
- **Authentification**: Utilisateur admin
- **Entrée**: userId, transactionHash
- **Sortie**: { success: true, transactionHash }
- **Action**: Bascule status="pending" → "minted"
- **Trigger**: Le client détecte et affiche le QR code

### 3. `failTicket`
- **Type**: HTTPS Callable
- **Authentification**: Utilisateur admin
- **Entrée**: userId, reason
- **Sortie**: { success: true }
- **Action**: Bascule status="pending" → "failed"

### 4. `onTicketMinted` (Trigger)
- **Type**: Firestore trigger
- **Event**: ticket_requests → status: "pending" → "minted"
- **Action**: Envoyer un email de confirmation

### 5. `cleanupOldPendingTickets` (Scheduled)
- **Type**: Pub/Sub scheduled
- **Schedule**: "every 24 hours"
- **Action**: Arrêter les tickets "pending" après 24h → status="expired"

## 🎨 Palette de Couleurs

```
┌─────────────────────────────────────────────┐
│ Baccha Festival Design System               │
├─────────────────────────────────────────────┤
│                                             │
│  🟡 Primaire (Or/Jaune)                    │
│     Hex: #FFCC00                           │
│     Utilisation: Buttons, accents          │
│                                             │
│  🟩 Accent (Émeraude)                      │
│     Hex: #004D40                           │
│     Utilisation: Textes, backgrounds       │
│                                             │
│  ⬜ Arrière-plan (Beige Clair)             │
│     Hex: #F5F5F0                           │
│     Utilisation: Page background           │
│                                             │
│  ⚪ Blanc                                   │
│     Hex: #FFFFFF                           │
│     Utilisation: Cards, content            │
│                                             │
└─────────────────────────────────────────────┘
```

## 📦 Dépendances Principales

```
react@^18.2.0                  # UI Framework
react-dom@^18.2.0              # DOM rendering
firebase@^10.7.0               # Backend
@dynamic-labs/sdk-react-core   # Authentification wallet
qrcode.react@^1.0.1            # QR code generation
lucide-react@^0.292.0          # Iconography
stripe@^13.0.0                 # Payment processing
axios@^1.6.2                   # HTTP client
tailwindcss@^3.3.0             # CSS framework
```

## 🧪 Fichiers de Test (à créer)

```
src/
└── __tests__/
    ├── App.test.js
    ├── components/
    │   ├── AuthComponent.test.js
    │   ├── BuyTicketComponent.test.js
    │   ├── WaitingComponent.test.js
    │   └── TicketComponent.test.js
    └── utils.test.js
```

Exemple test:
```javascript
import { render, screen } from '@testing-library/react';
import App from '../App';

test('rend le composant sans crash', () => {
  render(<App />);
  expect(screen.getByText(/Baccha Festival/i)).toBeInTheDocument();
});
```

## 📊 Architecture Globale

```
CLIENT (React App)
├── UI Components
│   ├── AuthComponent (Dynamic SDK)
│   ├── BuyTicketComponent
│   ├── WaitingComponent
│   └── TicketComponent
├── Firebase Client SDK
│   ├── Authentication
│   └── Firestore Listener (onSnapshot)
└── Dynamic SDK
    └── Wallet Management

BACKEND (Firebase)
├── Authentication
│   └── Dynamic JWT
├── Firestore Database
│   ├── ticket_requests collection
│   └── users collection
├── Cloud Functions
│   ├── createTicketRequest
│   ├── mintTicket
│   ├── failTicket
│   ├── Triggers
│   └── Scheduled tasks
└── Hosting

THIRD PARTIES
├── Dynamic Labs (Wallet auth)
├── Stripe (Payments)
└── Email Service (Confirmations)
```

## 🚀 Chemin Critique pour Lancer

1. ✅ Firebase Firestore setup
2. ✅ Dynamic Labs setup
3. ✅ Local development (npm start)
4. ✅ Test cycle complet
5. ✅ Cloud Functions deployment
6. ✅ Firestore rules configuration
7. ✅ Admin panel setup
8. ✅ Production environment variables
9. ✅ Deploy (Vercel/Firebase/Netlify)
10. ✅ Monitor metrics

---

Pour plus de détails, consultez:
- [README.md](README.md) - Guide principal
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Tests
- [DEPLOYMENT.md](DEPLOYMENT.md) - Déploiement
