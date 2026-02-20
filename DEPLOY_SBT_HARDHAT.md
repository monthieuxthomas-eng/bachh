# Déploiement SBT (MetaMask direct) avec Hardhat

## 1) Préparer `.env`

Variables minimales:

- `SBT_RPC_URL` (RPC du réseau cible)
- `SBT_CHAIN_ID` (ex: `11155111` pour Sepolia)
- `SBT_MINTER_PRIVATE_KEY` (clé deployer/minter)
- `SBT_VOUCHER_SIGNER_PRIVATE_KEY` (clé qui signe les vouchers backend)

Optionnelles:

- `SBT_OWNER_ADDRESS` (owner du contrat, sinon deployer)
- `SBT_VOUCHER_SIGNER_ADDRESS` (adresse du signer on-chain, sinon deployer)

## 2) Installer les dépendances

```bash
npm install
```

## 3) Compiler le contrat

```bash
npm run contracts:compile
```

## 4) Déployer

```bash
npm run contracts:deploy:sbt
```

Le script affiche l'adresse déployée:

- `SBT_CONTRACT_ADDRESS=0x...`

## 5) Mettre à jour `.env`

- Collez la nouvelle adresse dans `SBT_CONTRACT_ADDRESS`
- Vérifiez que `SBT_CHAIN_ID` et `SBT_RPC_URL` correspondent au même réseau
- Redémarrez backend + frontend

## 6) Tester le flow

1. Paiement Stripe
2. Retour app
3. Signature MetaMask + mint direct via `mintWithVoucher`
4. Affichage ticket + QR sécurisé
