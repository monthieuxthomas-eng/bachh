const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { ethers } = require('ethers');
require('dotenv').config({ override: true });

const STRIPE_SECRET_KEY = process.env.REACT_APP_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
let stripeClient = null;
const getStripeClient = () => {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key missing. Configure REACT_APP_STRIPE_SECRET_KEY or STRIPE_SECRET_KEY.');
  }

  if (!stripeClient) {
    stripeClient = require('stripe')(STRIPE_SECRET_KEY);
  }

  return stripeClient;
};
const app = express();

app.use(cors());
app.use(express.json());

const TICKET_PRICE = 100; // 1 EUR en centimes

const SBT_RPC_URL = process.env.SBT_RPC_URL;
const SBT_CONTRACT_ADDRESS = process.env.SBT_CONTRACT_ADDRESS;
const SBT_CHAIN_ID = process.env.SBT_CHAIN_ID || '1';
const SBT_EXPLORER_BASE_URL = process.env.SBT_EXPLORER_BASE_URL || 'https://etherscan.io';
const SBT_DEFAULT_TOKEN_URI = process.env.SBT_DEFAULT_TOKEN_URI || 'ipfs://baccha-festival-2026-ticket';
const TICKET_QR_SIGNING_SECRET = process.env.TICKET_QR_SIGNING_SECRET;
const WALLET_CHALLENGE_TTL_MS = Number(process.env.WALLET_CHALLENGE_TTL_MS || 120000);
const TEST_MINT_API_KEY = process.env.TEST_MINT_API_KEY;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
const normalizePrivateKey = (value) => {
  if (!value) return '';
  return value.startsWith('0x') ? value : `0x${value}`;
};

const SBT_MINTER_PRIVATE_KEY = normalizePrivateKey(process.env.SBT_MINTER_PRIVATE_KEY);
const SBT_VOUCHER_SIGNER_PRIVATE_KEY = normalizePrivateKey(
  process.env.SBT_VOUCHER_SIGNER_PRIVATE_KEY || process.env.SBT_MINTER_PRIVATE_KEY
);
const SBT_VOUCHER_TTL_SECONDS = Number(process.env.SBT_VOUCHER_TTL_SECONDS || 900);

const SBT_ABI = [
  'function mintSoulbound(address to, string tokenURI_) external returns (uint256)',
  'function mintWithVoucher(address to, string tokenURI_, string ticketId, uint256 expiry, bytes signature) external returns (uint256)',
  'function voucherSigner() view returns (address)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

const walletChallenges = new Map();

const isValidEthAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address || '');

const parseTokenIdFromReceipt = (receipt) => {
  const transferTopic = ethers.id('Transfer(address,address,uint256)');

  for (const log of receipt.logs || []) {
    if ((log.topics || [])[0] === transferTopic && log.topics.length >= 4) {
      return ethers.toBigInt(log.topics[3]).toString();
    }
  }

  return null;
};

const recoverTokenIdFromTx = async ({ provider, txHash, contractAddress }) => {
  if (!provider || !txHash) {
    return null;
  }

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    return null;
  }

  const transferTopic = ethers.id('Transfer(address,address,uint256)');
  const normalizedContract = (contractAddress || '').toLowerCase();

  for (const log of receipt.logs || []) {
    const isTransfer = (log.topics || [])[0] === transferTopic && (log.topics || []).length >= 4;
    const sameContract = !normalizedContract || String(log.address || '').toLowerCase() === normalizedContract;

    if (isTransfer && sameContract) {
      return ethers.toBigInt(log.topics[3]).toString();
    }
  }

  return null;
};

const normalizeMintErrorMessage = (error) => {
  const raw = error?.message || '';
  const combined = `${raw} ${error?.code || ''}`.toLowerCase();

  if (combined.includes('insufficient funds') || combined.includes('insufficient_funds')) {
    return 'Wallet minter sans fonds pour le gas. Ajoutez des ETH Sepolia au wallet serveur puis réessayez.';
  }

  if (combined.includes('invalid private key')) {
    return 'Clé privée minter invalide. Vérifiez SBT_MINTER_PRIVATE_KEY dans .env.';
  }

  return raw || 'Erreur mint SBT';
};

const recoverReceiptFromBroadcastError = async ({ error, provider }) => {
  const rawMessage = String(error?.message || '').toLowerCase();
  const recoverableBroadcastError =
    rawMessage.includes('already known') ||
    rawMessage.includes('nonce too low') ||
    rawMessage.includes('replacement transaction underpriced');

  if (!recoverableBroadcastError) {
    return null;
  }

  const rawTx = error?.payload?.params?.[0];
  if (!rawTx || typeof rawTx !== 'string') {
    return null;
  }

  try {
    const txHash = ethers.keccak256(rawTx);
    const receipt = await provider.waitForTransaction(txHash, 1, 120000);
    return receipt || null;
  } catch (_) {
    return null;
  }
};

const canonicalizeQrPayload = (payload) => {
  const normalized = {
    v: payload.v,
    ticketId: payload.ticketId,
    chainId: String(payload.chainId),
    contractAddress: String(payload.contractAddress).toLowerCase(),
    tokenId: String(payload.tokenId),
    owner: String(payload.owner).toLowerCase(),
    issuedAt: payload.issuedAt,
  };

  return JSON.stringify(normalized);
};

const signQrPayload = (payload) => {
  if (!TICKET_QR_SIGNING_SECRET) {
    throw new Error('TICKET_QR_SIGNING_SECRET manquant dans .env');
  }

  const data = canonicalizeQrPayload(payload);

  return crypto
    .createHmac('sha256', TICKET_QR_SIGNING_SECRET)
    .update(data)
    .digest('hex');
};

const createSignedTicketQrData = ({
  ticketId,
  chainId,
  contractAddress,
  tokenId,
  owner,
}) => {
  const payload = {
    v: 1,
    ticketId,
    chainId: String(chainId),
    contractAddress,
    tokenId: String(tokenId),
    owner,
    issuedAt: new Date().toISOString(),
  };

  const signature = signQrPayload(payload);
  const signed = { payload, signature };
  const encoded = Buffer.from(JSON.stringify(signed), 'utf8').toString('base64url');

  return `baccha://ticket/${encoded}`;
};

const parseSignedTicketQrData = (qrData) => {
  if (!qrData || typeof qrData !== 'string' || !qrData.startsWith('baccha://ticket/')) {
    throw new Error('Format QR invalide');
  }

  const encoded = qrData.replace('baccha://ticket/', '');
  const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
  const parsed = JSON.parse(decoded);

  if (!parsed?.payload || !parsed?.signature) {
    throw new Error('QR incomplet');
  }

  return parsed;
};

const createMintVoucher = async ({ userAddress, sessionId }) => {
  if (!SBT_VOUCHER_SIGNER_PRIVATE_KEY || !SBT_CONTRACT_ADDRESS || !SBT_CHAIN_ID) {
    throw new Error('Configuration voucher manquante. Vérifiez SBT_VOUCHER_SIGNER_PRIVATE_KEY, SBT_CONTRACT_ADDRESS et SBT_CHAIN_ID.');
  }

  const ticketId = String(sessionId);
  const tokenURI = SBT_DEFAULT_TOKEN_URI;
  const expiry = Math.floor(Date.now() / 1000) + SBT_VOUCHER_TTL_SECONDS;

  const signer = new ethers.Wallet(SBT_VOUCHER_SIGNER_PRIVATE_KEY);
  const provider = new ethers.JsonRpcProvider(SBT_RPC_URL);
  const contract = new ethers.Contract(SBT_CONTRACT_ADDRESS, SBT_ABI, provider);
  const onChainVoucherSigner = await contract.voucherSigner();

  if (onChainVoucherSigner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(
      `Voucher signer mismatch. onChain=${onChainVoucherSigner} backend=${signer.address}`
    );
  }

  const digest = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'address', 'string', 'string', 'uint256'],
    [
      SBT_CONTRACT_ADDRESS,
      BigInt(SBT_CHAIN_ID),
      userAddress,
      tokenURI,
      ticketId,
      BigInt(expiry),
    ]
  );
  const signature = await signer.signMessage(ethers.getBytes(digest));

  return {
    contractAddress: SBT_CONTRACT_ADDRESS,
    chainId: String(SBT_CHAIN_ID),
    ticketId,
    tokenURI,
    expiry,
    signature,
  };
};

const validateTicketQrAndOnChain = async (qrData) => {
  if (!TICKET_QR_SIGNING_SECRET) {
    throw new Error('TICKET_QR_SIGNING_SECRET manquant');
  }

  const parsed = parseSignedTicketQrData(qrData);
  const expectedSignature = signQrPayload(parsed.payload);

  if (expectedSignature !== parsed.signature) {
    throw new Error('Signature QR invalide (ticket falsifié)');
  }

  const payload = parsed.payload;
  const normalizedContract = String(payload.contractAddress || '').toLowerCase();
  const officialContract = String(SBT_CONTRACT_ADDRESS || '').toLowerCase();

  if (!officialContract || normalizedContract !== officialContract) {
    throw new Error('Contrat non officiel');
  }

  const provider = new ethers.JsonRpcProvider(SBT_RPC_URL);
  const contract = new ethers.Contract(SBT_CONTRACT_ADDRESS, SBT_ABI, provider);
  const chainNetwork = await provider.getNetwork();
  const chainId = chainNetwork.chainId.toString();

  if (chainId !== String(payload.chainId)) {
    throw new Error('Mauvais réseau blockchain');
  }

  const ownerOnChain = await contract.ownerOf(payload.tokenId);

  if (ownerOnChain.toLowerCase() !== String(payload.owner).toLowerCase()) {
    throw new Error('Propriétaire on-chain différent (ticket invalide)');
  }

  return {
    payload,
    ownerOnChain,
  };
};

const mintSoulboundTicket = async ({ userAddress }) => {
  if (!SBT_RPC_URL || !SBT_MINTER_PRIVATE_KEY || !SBT_CONTRACT_ADDRESS) {
    throw new Error(
      'Configuration SBT manquante. Vérifiez SBT_RPC_URL, SBT_MINTER_PRIVATE_KEY et SBT_CONTRACT_ADDRESS.'
    );
  }

  if (!isValidEthAddress(userAddress)) {
    throw new Error('Adresse wallet invalide pour le mint SBT.');
  }

  const provider = new ethers.JsonRpcProvider(SBT_RPC_URL);
  const signer = new ethers.Wallet(SBT_MINTER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(SBT_CONTRACT_ADDRESS, SBT_ABI, signer);

  let predictedTokenId = null;
  try {
    const previewTokenId = await contract.mintSoulbound.staticCall(userAddress, SBT_DEFAULT_TOKEN_URI);
    predictedTokenId = previewTokenId ? previewTokenId.toString() : null;
  } catch (_) {
    predictedTokenId = null;
  }

  let receipt;
  try {
    const tx = await contract.mintSoulbound(userAddress, SBT_DEFAULT_TOKEN_URI);
    receipt = await tx.wait();
  } catch (mintError) {
    const recoveredReceipt = await recoverReceiptFromBroadcastError({
      error: mintError,
      provider,
    });

    if (!recoveredReceipt) {
      throw mintError;
    }

    receipt = recoveredReceipt;
  }

  let tokenId = predictedTokenId || parseTokenIdFromReceipt(receipt);
  if (!tokenId) {
    tokenId = await recoverTokenIdFromTx({
      provider,
      txHash: receipt.hash,
      contractAddress: SBT_CONTRACT_ADDRESS,
    });
  }

  if (!tokenId) {
    throw new Error('Mint on-chain confirmé mais tokenId introuvable.');
  }

  const explorerTxUrl = `${SBT_EXPLORER_BASE_URL}/tx/${receipt.hash}`;
  const explorerTokenUrl = tokenId
    ? `${SBT_EXPLORER_BASE_URL}/token/${SBT_CONTRACT_ADDRESS}?a=${tokenId}`
    : null;

  return {
    chainId: String(SBT_CHAIN_ID),
    contractAddress: SBT_CONTRACT_ADDRESS,
    tokenId,
    transactionHash: receipt.hash,
    explorerTxUrl,
    explorerTokenUrl,
  };
};

app.post(['/create-checkout-session', '/api/create-checkout-session'], async (req, res) => {
  try {
    const stripe = getStripeClient();
    const { userEmail, userId, userAddress } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: TICKET_PRICE,
            product_data: {
              name: 'Baccha Festival 2026 Ticket',
              description: 'Soulbound Token Ticket',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${FRONTEND_BASE_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_BASE_URL}/?payment=cancel`,
      customer_email: userEmail,
      metadata: {
        userId,
        userAddress,
        userEmail,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post(['/verify-payment', '/api/verify-payment'], async (req, res) => {
  try {
    const stripe = getStripeClient();
    const { sessionId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const alreadyMinted =
        session.metadata?.mintedTxHash &&
        (session.metadata?.mintedTokenId || session.metadata?.mintedTokenId === '') &&
        session.metadata?.mintedContractAddress;

      if (alreadyMinted) {
        const provider = new ethers.JsonRpcProvider(SBT_RPC_URL);
        let recoveredTokenId = session.metadata?.mintedTokenId || null;

        if (!recoveredTokenId && session.metadata?.mintedTxHash) {
          recoveredTokenId = await recoverTokenIdFromTx({
            provider,
            txHash: session.metadata.mintedTxHash,
            contractAddress: session.metadata.mintedContractAddress,
          });
        }

        if (recoveredTokenId && !session.metadata?.mintedTokenId) {
          await stripe.checkout.sessions.update(sessionId, {
            metadata: {
              ...(session.metadata || {}),
              mintedTokenId: recoveredTokenId,
            },
          });
        }

        const existingQrData = session.metadata?.ticketQrData || createSignedTicketQrData({
          ticketId: sessionId,
          chainId: session.metadata?.mintedChainId || String(SBT_CHAIN_ID),
          contractAddress: session.metadata.mintedContractAddress,
          tokenId: recoveredTokenId || session.metadata.mintedTokenId || '',
          owner: session.metadata?.userAddress,
        });

        return res.json({
          success: true,
          payment_intent: session.payment_intent,
          metadata: session.metadata,
          minted: {
            chainId: session.metadata?.mintedChainId || String(SBT_CHAIN_ID),
            contractAddress: session.metadata.mintedContractAddress,
            tokenId: recoveredTokenId || session.metadata.mintedTokenId || null,
            transactionHash: session.metadata.mintedTxHash,
            explorerTxUrl:
              session.metadata?.mintedExplorerTxUrl ||
              `${SBT_EXPLORER_BASE_URL}/tx/${session.metadata.mintedTxHash}`,
            explorerTokenUrl: session.metadata?.mintedExplorerTokenUrl || null,
            ticketQrData: existingQrData,
          },
        });
      }

      const userAddress = session.metadata?.userAddress;
      const minted = await mintSoulboundTicket({ userAddress });
      const ticketQrData = createSignedTicketQrData({
        ticketId: sessionId,
        chainId: minted.chainId,
        contractAddress: minted.contractAddress,
        tokenId: minted.tokenId,
        owner: userAddress,
      });

      await stripe.checkout.sessions.update(sessionId, {
        metadata: {
          ...(session.metadata || {}),
          mintedTxHash: minted.transactionHash,
          mintedTokenId: minted.tokenId || '',
          mintedContractAddress: minted.contractAddress,
          mintedChainId: minted.chainId,
          mintedExplorerTxUrl: minted.explorerTxUrl,
          mintedExplorerTokenUrl: minted.explorerTokenUrl || '',
          ticketQrData,
        },
      });

      res.json({
        success: true,
        payment_intent: session.payment_intent,
        metadata: {
          ...(session.metadata || {}),
          mintedTxHash: minted.transactionHash,
          mintedTokenId: minted.tokenId || '',
          mintedContractAddress: minted.contractAddress,
          mintedChainId: minted.chainId,
          mintedExplorerTxUrl: minted.explorerTxUrl,
          mintedExplorerTokenUrl: minted.explorerTokenUrl || '',
          ticketQrData,
        },
        minted: {
          ...minted,
          ticketQrData,
        },
      });
    } else {
      res.status(400).json({ success: false, error: 'Payment not completed' });
    }
  } catch (error) {
    const message = normalizeMintErrorMessage(error);
    console.error('Verification error:', message);
    res.status(500).json({ error: message });
  }
});

app.post('/issue-ticket-qr', async (req, res) => {
  try {
    const stripe = getStripeClient();
    const { sessionId, tokenId, transactionHash, owner } = req.body || {};

    if (!sessionId || !tokenId || !owner) {
      return res.status(400).json({ success: false, error: 'sessionId, tokenId et owner sont requis' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Paiement non validé' });
    }

    if (String(session.metadata?.userAddress || '').toLowerCase() !== String(owner).toLowerCase()) {
      return res.status(400).json({ success: false, error: 'Owner ne correspond pas au paiement' });
    }

    const provider = new ethers.JsonRpcProvider(SBT_RPC_URL);
    const contract = new ethers.Contract(SBT_CONTRACT_ADDRESS, SBT_ABI, provider);
    const ownerOnChain = await contract.ownerOf(tokenId);

    if (String(ownerOnChain).toLowerCase() !== String(owner).toLowerCase()) {
      return res.status(400).json({ success: false, error: 'Token non détenu par ce wallet' });
    }

    const ticketQrData = createSignedTicketQrData({
      ticketId: sessionId,
      chainId: SBT_CHAIN_ID,
      contractAddress: SBT_CONTRACT_ADDRESS,
      tokenId: String(tokenId),
      owner,
    });

    const explorerTxUrl = transactionHash
      ? `${SBT_EXPLORER_BASE_URL}/tx/${transactionHash}`
      : null;
    const explorerTokenUrl = `${SBT_EXPLORER_BASE_URL}/token/${SBT_CONTRACT_ADDRESS}?a=${tokenId}`;

    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...(session.metadata || {}),
        mintedTxHash: transactionHash || '',
        mintedTokenId: String(tokenId),
        mintedContractAddress: SBT_CONTRACT_ADDRESS,
        mintedChainId: String(SBT_CHAIN_ID),
        mintedExplorerTxUrl: explorerTxUrl || '',
        mintedExplorerTokenUrl: explorerTokenUrl,
        ticketQrData,
      },
    });

    return res.json({
      success: true,
      minted: {
        chainId: String(SBT_CHAIN_ID),
        contractAddress: SBT_CONTRACT_ADDRESS,
        tokenId: String(tokenId),
        transactionHash: transactionHash || null,
        explorerTxUrl,
        explorerTokenUrl,
        ticketQrData,
      },
    });
  } catch (error) {
    console.error('Issue QR error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Impossible d\'émettre le QR ticket' });
  }
});

app.post('/verify-ticket', async (req, res) => {
  try {
    const { qrData } = req.body || {};
    const { payload } = await validateTicketQrAndOnChain(qrData);

    return res.json({
      valid: true,
      reason: 'Ticket authentique',
      ticket: {
        ticketId: payload.ticketId,
        tokenId: payload.tokenId,
        owner: payload.owner,
        contractAddress: payload.contractAddress,
        chainId: payload.chainId,
      },
    });
  } catch (error) {
    console.error('Ticket verification error:', error.message);
    return res.status(400).json({ valid: false, error: error.message || 'QR invalide' });
  }
});

app.post('/wallet-challenge/request', async (req, res) => {
  try {
    const { qrData } = req.body || {};
    const { payload } = await validateTicketQrAndOnChain(qrData);

    const challengeId = crypto.randomUUID();
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + WALLET_CHALLENGE_TTL_MS;
    const message = [
      'Baccha Festival 2026 - Proof of wallet ownership',
      `Ticket: ${payload.ticketId}`,
      `Token: ${payload.tokenId}`,
      `Owner: ${payload.owner}`,
      `Nonce: ${nonce}`,
      `Challenge: ${challengeId}`,
      `ExpiresAt: ${new Date(expiresAt).toISOString()}`,
    ].join('\n');

    walletChallenges.set(challengeId, {
      challengeId,
      nonce,
      ticketId: payload.ticketId,
      tokenId: String(payload.tokenId),
      owner: String(payload.owner).toLowerCase(),
      message,
      expiresAt,
      used: false,
    });

    return res.json({
      success: true,
      challengeId,
      message,
      expiresAt,
      walletAddress: payload.owner,
      ticketId: payload.ticketId,
      tokenId: payload.tokenId,
    });
  } catch (error) {
    console.error('Wallet challenge request error:', error.message);
    return res.status(400).json({ success: false, error: error.message || 'Impossible de créer le challenge' });
  }
});

app.post('/wallet-challenge/verify', async (req, res) => {
  try {
    const { challengeId, signature, qrData } = req.body || {};

    if (!challengeId || !signature || !qrData) {
      return res.status(400).json({ success: false, verified: false, error: 'challengeId, signature et qrData sont requis' });
    }

    const challenge = walletChallenges.get(challengeId);

    if (!challenge) {
      return res.status(400).json({ success: false, verified: false, error: 'Challenge inconnu' });
    }

    if (challenge.used) {
      return res.status(400).json({ success: false, verified: false, error: 'Challenge déjà utilisé' });
    }

    if (Date.now() > challenge.expiresAt) {
      walletChallenges.delete(challengeId);
      return res.status(400).json({ success: false, verified: false, error: 'Challenge expiré' });
    }

    const { payload } = await validateTicketQrAndOnChain(qrData);

    if (
      challenge.ticketId !== payload.ticketId ||
      challenge.tokenId !== String(payload.tokenId) ||
      challenge.owner !== String(payload.owner).toLowerCase()
    ) {
      return res.status(400).json({ success: false, verified: false, error: 'Challenge et ticket ne correspondent pas' });
    }

    const recovered = ethers.verifyMessage(challenge.message, signature);

    if (String(recovered).toLowerCase() !== challenge.owner) {
      return res.status(400).json({ success: false, verified: false, error: 'Signature wallet invalide' });
    }

    challenge.used = true;
    walletChallenges.set(challengeId, challenge);

    return res.json({
      success: true,
      verified: true,
      ticket: {
        ticketId: challenge.ticketId,
        tokenId: challenge.tokenId,
        walletAddress: challenge.owner,
      },
    });
  } catch (error) {
    console.error('Wallet challenge verify error:', error.message);
    return res.status(400).json({ success: false, verified: false, error: error.message || 'Vérification impossible' });
  }
});

app.post('/test-mint-sbt', async (req, res) => {
  try {
    const apiKey = req.headers['x-test-api-key'];

    if (!TEST_MINT_API_KEY || apiKey !== TEST_MINT_API_KEY) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { walletAddress, ticketId } = req.body || {};

    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return res.status(400).json({ success: false, error: 'walletAddress invalide' });
    }

    const minted = await mintSoulboundTicket({ userAddress: walletAddress });
    const qrData = createSignedTicketQrData({
      ticketId: ticketId || `test-${Date.now()}`,
      chainId: minted.chainId,
      contractAddress: minted.contractAddress,
      tokenId: minted.tokenId,
      owner: walletAddress,
    });

    return res.json({
      success: true,
      minted: {
        ...minted,
        ticketQrData: qrData,
      },
    });
  } catch (error) {
    const message = normalizeMintErrorMessage(error);
    console.error('Test mint error:', message);
    return res.status(500).json({ success: false, error: message || 'Mint test échoué' });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Stripe server running on http://localhost:${PORT}`);
    console.log(`📝 Endpoints:`);
    console.log(`  POST http://localhost:${PORT}/create-checkout-session`);
    console.log(`  POST http://localhost:${PORT}/verify-payment`);
    console.log(`  POST http://localhost:${PORT}/issue-ticket-qr`);
    console.log(`  POST http://localhost:${PORT}/verify-ticket`);
    console.log(`  POST http://localhost:${PORT}/wallet-challenge/request`);
    console.log(`  POST http://localhost:${PORT}/wallet-challenge/verify`);
    console.log(`  POST http://localhost:${PORT}/test-mint-sbt`);
  });
}

module.exports = app;
