# 🚀 Guide de Déploiement - Baccha Festival Ticket Platform

Ce guide couvre le déploiement en production sur Vercel, Netlify ou Firebase Hosting.

## 📋 Prérequis de Production

- [ ] Configuration Firebase finalisée
- [ ] Configuration Dynamic Labs avec domaines de production
- [ ] Configuration Stripe avec clés en production
- [ ] Cloud Functions déployées
- [ ] Règles Firestore sécurisées
- [ ] Tests complets passés

## 🔐 Sécurité en Production

### 1. Variables d'Environnement

Créez un fichier `.env.production`:

```env
# Firebase Production
REACT_APP_FIREBASE_API_KEY=votre_clé_production
REACT_APP_FIREBASE_AUTH_DOMAIN=baccha-festival.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=baccha-festival
REACT_APP_FIREBASE_STORAGE_BUCKET=baccha-festival.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=votre_id
REACT_APP_FIREBASE_APP_ID=votre_app_id

# Dynamic Labs Production
REACT_APP_DYNAMIC_ENV_ID=ev_prod_...

# Stripe Production
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 2. Règles Firestore Sécurisées

Déployer ces règles en production:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Ticket requests
    match /ticket_requests/{userId} {
      // Les utilisateurs ne peuvent voir que leurs propres tickets
      allow read: if request.auth.uid == userId;
      
      // Les utilisateurs peuvent créer leurs tickets (status=pending seulement)
      allow create: if request.auth.uid == userId &&
                       request.resource.data.status == 'pending' &&
                       request.resource.data.userId == request.auth.uid;
      
      // Les administrateurs peuvent mettre à jour (mint les tickets)
      allow update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Admin users
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 3. CORS Security

Configurer CORS dans Firebase:

1. Cloud Functions → Settings
2. Ajouter les domaines autorisés:
   ```
   https://baccha-festival.com
   https://www.baccha-festival.com
   ```

## ☁️ Déploiement sur Vercel

### Option 1: Via GitHub (Recommandé)

1. **Créer un repo GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Baccha Festival Ticket Platform"
   git branch -M main
   git remote add origin https://github.com/YOU/baccha-festival.git
   git push -u origin main
   ```

2. **Connecter à Vercel**
   - Allez sur [Vercel](https://vercel.com/)
   - Cliquez "Import Project"
   - Sélectionnez votre repo GitHub
   - Acceptez les paramètres par défaut

3. **Configurer les Variables d'Environnement**
   - Project Settings → Environment Variables
   - Ajoutez toutes les variables de `.env.production`
   - Déployez!

**Résultat:**
- URL: `https://baccha-festival.vercel.app`
- Déploiement automatique à chaque push sur `main`

### Option 2: Via CLI

```bash
# Installer Vercel CLI
npm install -g vercel

# Authentifier
vercel login

# Builder et déployer
npm run build
vercel --prod
```

## 🔥 Déploiement sur Firebase Hosting

1. **Installer Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialiser**
   ```bash
   firebase init hosting
   ```
   
   Répondre:
   - Public directory: `build`
   - Single-page app: `yes`
   - Overwrite `index.html`: `no`

3. **Builder et Déployer**
   ```bash
   npm run build
   firebase deploy
   ```

**Résultat:**
- URL: `https://baccha-festival.firebaseapp.com`

## 🌐 Déploiement sur Netlify

1. **Via UI**
   - Allez sur [Netlify](https://app.netlify.com/)
   - "Add new site" → "Import an existing project"
   - Connectez GitHub
   - Sélectionnez `baccha-festival` repo
   - Configurez: Build command: `npm run build`, Publish: `build`

2. **Via CLI**
   ```bash
   npm install -g netlify-cli
   netlify login
   npm run build
   netlify deploy --prod
   ```

**Résultat:**
- URL: `https://baccha-festival.netlify.app`

## 🔗 Configuration de Domaine Personnalisé

### Pour tout hébergeur:

1. **Acheter un domaine** (ex: baccha-festival.fr)
2. **Pointer les DNS:**
   - Vercel/Netlify: Utiliser leurs nameservers
   - Firebase: Configuration CNAME

3. **Configurer le domaine dans Dynamic Labs:**
   - Application Settings → URLs
   - Production: `https://baccha-festival.fr`

4. **Configurer Stripe:**
   - Dashboard → Settings
   - Ajouter le domaine autorisé

## 📦 Build Optimization

### Vérifier la taille du bundle:

```bash
npm run build
npm install -g serve
serve -s build

# Puis ouvrez http://localhost:3000
```

### Réduire la taille:

1. Code splitting (React.lazy)
2. Tree shaking dépendances inutilisées
3. Minification CSS/JS (fait automatiquement)

### Exemple Code Splitting:

```javascript
import React, { lazy, Suspense } from 'react';

const AdminPanel = lazy(() => import('./components/AdminPanel'));

// Dans le rendu:
<Suspense fallback={<div>Chargement...</div>}>
  <AdminPanel />
</Suspense>
```

## 📊 Monitoring & Analytics

### 1. Google Analytics

Installer:
```bash
npm install react-ga4
```

Utiliser:
```javascript
import ReactGA from "react-ga4";

ReactGA.initialize("G-XXXXX");
ReactGA.send("pageview");
```

### 2. Sentry (Error Tracking)

Installer:
```bash
npm install @sentry/react @sentry/tracing
```

Initialiser:
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 1.0,
});
```

### 3. Firebase Analytics

Déjà intégré via Firestore. Consultez:
- Firebase Console → Analytics

## 🔄 CI/CD Pipeline

### GitHub Actions (Automatiser les tests)

Créer `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - run: npm install
      - run: npm run build
      - run: npm test -- --watchAll=false
      
      - uses: actions/upload-artifact@v2
        with:
          name: build
          path: build
```

## 🚨 Monitoring en Production

### Checklist Quotidienne:

- [ ] Vérifier les logs Firebase
- [ ] Vérifier les erreurs Sentry
- [ ] Vérifier les stats Stripe
- [ ] Vérifier les tickets minted
- [ ] Vérifier les QR codes (samples)

### KPIs à Suivre:

1. **Conversion Rate**: Utilisateurs qui achètent / visiteurs
2. **Time to Mint**: Entrée → SBT reçu
3. **Error Rate**: Nombre d'erreurs / transactions
4. **Avg Response Time**: Temps moyen pour updater Firestore

## 📢 Communication

Créer une page d'info:

```
Site: https://baccha-festival.fr
Status: ✅ Opérationnel
Support: support@baccha-festival.fr
```

## 🚨 Rollback d'Urgence

Si quelque chose casse:

**Vercel:**
```bash
vercel rollback
```

**Firebase:**
```bash
firebase functions:delete mintTicket
firebase hosting:disable
```

**Netlify:**
- Deploy History → Click previous good deploy

## 📝 Checklist Pré-Lancement

- [ ] Tests finaux en production
- [ ] Vérifier les variables d'env
- [ ] Vérifier les règles Firestore
- [ ] Vérifier les Cloud Functions
- [ ] DNS propogé
- [ ] HTTPS activé
- [ ] Domaine personnalisé configuré
- [ ] Support contact configuré
- [ ] Analytics configuré
- [ ] Error tracking configuré
- [ ] Backup Firestore créé
- [ ] Documentation finalisée
- [ ] Équipe support formée

## 🎉 Lancement!

Une fois tout configuré:

1. Annoncez le lancement
2. Testez end-to-end en production
3. Monitorer les premières transactions
4. Répondre aux tickets support
5. Collectez les feedback

**Bienvenue sur Baccha Festival 2026!** 🚀🎪
