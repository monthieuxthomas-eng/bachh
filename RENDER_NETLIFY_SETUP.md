# Render + Netlify (fix paiement localhost)

Ce guide corrige l’erreur:

`Serveur de paiement inaccessible (http://localhost:5000)`

## 1) Déployer le backend sur Render

### Option A — Blueprint (rapide)
1. Push le repo sur GitHub.
2. Dans Render: **New +** → **Blueprint**.
3. Sélectionnez ce repo (fichier `render.yaml` détecté automatiquement).
4. Renseignez les variables demandées:
   - `REACT_APP_STRIPE_SECRET_KEY` (obligatoire pour démarrer)
   - `FRONTEND_BASE_URL` = URL Netlify (ex: `https://votre-site.netlify.app`)
   - Variables SBT si vous utilisez le mint on-chain (`SBT_*`, `TICKET_QR_SIGNING_SECRET`, etc.)

### Option B — Web Service manuel
- Build Command: `npm install`
- Start Command: `node server.js`
- Root directory: repo root

## 2) Configurer le front Netlify

Dans Netlify → Site settings → Environment variables:

- `REACT_APP_API_BASE_URL` = URL Render du backend
  - ex: `https://baccha-festival-backend.onrender.com`

Puis relancez un déploiement (Redeploy site).

Important:
- la variable `.env` locale de votre PC n'est pas utilisée une fois le site déployé;
- seule la variable configurée dans Netlify est prise en compte au build;
- si `REACT_APP_API_BASE_URL` contient `localhost` en production, le front bascule automatiquement sur le même domaine (`/.netlify/functions/...`).

## 3) Vérifications rapides

- Backend up: ouvrez `https://<backend-render>/` (peut retourner 404, c’est normal).
- Endpoint paiement: tester un POST vers:
  - `https://<backend-render>/create-checkout-session`
- Front Netlify: retester le bouton d’achat.

## Notes importantes

- En production, `localhost` ne fonctionne pas depuis Netlify.
- `FRONTEND_BASE_URL` côté backend doit pointer vers votre domaine frontend pour les redirections Stripe (`success_url`, `cancel_url`).
- Si Render est en `free`, le premier appel peut être lent (cold start).
