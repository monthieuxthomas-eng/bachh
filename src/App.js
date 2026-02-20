import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db, firebaseInitError } from './firebase';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { arrayUnion, doc, onSnapshot, setDoc } from 'firebase/firestore';
import BuyTicketComponent from './components/BuyTicketComponent';
import WaitingComponent from './components/WaitingComponent';
import TicketComponent from './components/TicketComponent';
import AdminPanel from './components/AdminPanel';
import './App.css';

const sanitizeApiBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');
const isLocalhostApiUrl = (value) => /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/.*)?$/i.test(String(value || '').trim());
const configuredApiBaseUrl = sanitizeApiBaseUrl(process.env.REACT_APP_API_BASE_URL);
const API_BASE_URL = (() => {
  if (!configuredApiBaseUrl) {
    return process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '';
  }

  if (process.env.NODE_ENV !== 'development' && isLocalhostApiUrl(configuredApiBaseUrl)) {
    return '';
  }

  return configuredApiBaseUrl;
})();
const PAYMENT_API_BASE_CANDIDATES = (() => {
  const candidates = [API_BASE_URL];

  if (process.env.NODE_ENV !== 'development') {
    candidates.push('');
    candidates.push('/.netlify/functions/api');
  }

  return Array.from(new Set(candidates.map((item) => sanitizeApiBaseUrl(item)).filter((item) => item !== null && item !== undefined)));
})();

const buildPaymentApiUrl = (baseUrl, path) => {
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

const isNetworkFetchError = (error) => (
  error?.name === 'TypeError' ||
  /Failed to fetch|NetworkError|Load failed/i.test(error?.message || '')
);

const shouldRetryOnHttpStatus = (status) => [404, 408, 425, 429, 502, 503, 504].includes(Number(status));

const fetchPaymentApiWithFallback = async (path, options, settings = {}) => {
  const fallbackOnHttpError = Boolean(settings?.fallbackOnHttpError);
  let lastError = null;
  let attemptedUrl = '';

  for (const baseUrl of PAYMENT_API_BASE_CANDIDATES) {
    attemptedUrl = buildPaymentApiUrl(baseUrl, path);

    try {
      const response = await fetch(attemptedUrl, options);

      if (!response.ok && fallbackOnHttpError && shouldRetryOnHttpStatus(response.status)) {
        lastError = new Error(`Payment API HTTP ${response.status} on ${attemptedUrl}`);
        continue;
      }

      return { response, attemptedUrl, baseUrl };
    } catch (error) {
      lastError = error;

      if (!isNetworkFetchError(error)) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Aucun endpoint paiement joignable (${attemptedUrl || 'non résolu'})`);
};

const buildVerifyPaymentPayload = (sessionId, userAddress) => {
  const normalized = String(sessionId || '').trim();
  const normalizedAddress = String(userAddress || '').trim();
  return {
    sessionId: normalized,
    session_id: normalized,
    userAddress: normalizedAddress,
    walletAddress: normalizedAddress,
  };
};

const PENDING_CHECKOUT_STORAGE_KEY = 'baccha_pending_checkout';
const ADMIN_EMAILS = String(process.env.REACT_APP_ADMIN_EMAILS || '')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const savePendingCheckoutSession = (sessionId, walletAddress) => {
  if (!sessionId) return;

  try {
    const payload = {
      sessionId,
      walletAddress: String(walletAddress || '').trim() || null,
      createdAt: Date.now(),
    };
    localStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {
    // ignore storage errors
  }
};

const readPendingCheckoutPayload = () => {
  try {
    const raw = localStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.sessionId) {
      return null;
    }

    return {
      sessionId: String(parsed.sessionId),
      walletAddress: String(parsed.walletAddress || '').trim() || null,
    };
  } catch (_) {
    return null;
  }
};

const readPendingCheckoutSession = () => readPendingCheckoutPayload()?.sessionId || null;

const clearPendingCheckoutSession = () => {
  try {
    localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
  } catch (_) {
    // ignore storage errors
  }
};

function App() {
  const [appState, setAppState] = useState('auth'); // auth, buy, waiting, ticket
  const [userInfo, setUserInfo] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutHandled, setCheckoutHandled] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const firebaseReady = Boolean(auth && db);
  const firebaseErrorMessage = firebaseInitError || 'Configuration Firebase invalide.';
  const ticketListenerRef = useRef(null);
  const currentTicketRef = useRef(null);
  const isAdminUser = Boolean(
    userInfo?.email && (
      ADMIN_EMAILS.length === 0 ||
      ADMIN_EMAILS.includes(String(userInfo.email).toLowerCase())
    )
  );

  const resolveAppStateFromTicket = useCallback((ticketData) => {
    const status = String(ticketData?.status || '').toLowerCase().trim();
    const hasMintedProof = Boolean(
      ticketData?.tokenId ||
      ticketData?.ticketQrData ||
      ticketData?.explorerTokenUrl ||
      (ticketData?.transactionHash && ticketData?.contractAddress)
    );

    if (hasMintedProof || status === 'minted') {
      return 'ticket';
    }

    if (['pending', 'checkout_started', 'processing', 'paid'].includes(status)) {
      return 'waiting';
    }

    if (status === 'failed') {
      return 'buy';
    }

    return 'buy';
  }, []);

  useEffect(() => {
    currentTicketRef.current = currentTicket;
  }, [currentTicket]);

  const checkUserTicket = useCallback((userId) => {
    if (typeof ticketListenerRef.current === 'function') {
      ticketListenerRef.current();
      ticketListenerRef.current = null;
    }

    const ticketDocRef = doc(db, 'ticket_requests', userId);
    const unsubscribe = onSnapshot(
      ticketDocRef,
      (docSnapshot) => {
        const inMemoryTicketState = resolveAppStateFromTicket(currentTicketRef.current);
        const hasInMemoryMintedTicket = inMemoryTicketState === 'ticket';

        if (docSnapshot.exists()) {
          const ticketData = docSnapshot.data();
          const incomingState = resolveAppStateFromTicket(ticketData);

          if (ticketData.userAddress) {
            setWalletAddress(ticketData.userAddress);
          }

          if (incomingState === 'ticket') {
            setCurrentTicket(ticketData);
            setAppState('ticket');
            return;
          }

          if (hasInMemoryMintedTicket) {
            return;
          }

          setCurrentTicket(ticketData);
          setAppState(incomingState);
          return;
        }

        if (hasInMemoryMintedTicket) {
          return;
        }

        setCurrentTicket(null);
        setAppState('buy');
      },
      (snapshotError) => {
        console.error('Firestore ticket listener error:', snapshotError);
        setError('Impossible de lire le ticket Firebase. Vérifiez les règles Firestore.');

        const inMemoryTicketState = resolveAppStateFromTicket(currentTicketRef.current);
        if (inMemoryTicketState === 'ticket') {
          return;
        }

        setAppState('buy');
      }
    );

    ticketListenerRef.current = unsubscribe;
    return unsubscribe;
  }, [resolveAppStateFromTicket]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setAppState('auth');
      return undefined;
    }

    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUserInfo({
          userId: currentUser.uid,
          email: currentUser.email,
          connected: true,
        });
        checkUserTicket(currentUser.uid);
      } else {
        const params = new URLSearchParams(window.location.search);
        const returnStatus = params.get('payment') || params.get('checkout');
        const hasSessionId = Boolean(params.get('session_id')) || Boolean(readPendingCheckoutSession());
        const hasCheckoutReturn = hasSessionId && returnStatus !== 'cancel';
        const inMemoryTicketState = resolveAppStateFromTicket(currentTicketRef.current);
        const hasInMemoryMintedTicket = inMemoryTicketState === 'ticket';

        if (hasCheckoutReturn) {
          setAppState('waiting');
        } else if (hasInMemoryMintedTicket) {
          setAppState('ticket');
        } else {
          setAppState('auth');
        }

        setUserInfo(null);

        if (!hasInMemoryMintedTicket) {
          setWalletAddress(null);
        }

        if (!hasCheckoutReturn && !hasInMemoryMintedTicket) {
          setCurrentTicket(null);
        }

        setAdminView(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [checkUserTicket, resolveAppStateFromTicket]);

  useEffect(() => {
    return () => {
      if (typeof ticketListenerRef.current === 'function') {
        ticketListenerRef.current();
      }
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment') || params.get('checkout');
    const pendingCheckout = readPendingCheckoutPayload();
    const sessionId = params.get('session_id') || pendingCheckout?.sessionId || null;

    if (checkoutHandled) {
      return;
    }

    if (paymentStatus === 'cancel') {
      setCheckoutHandled(true);
      setError('Paiement annulé. Vous pouvez réessayer.');
      clearPendingCheckoutSession();
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const shouldVerifySession = Boolean(sessionId) && paymentStatus !== 'cancel';

    if (shouldVerifySession) {
      setCheckoutHandled(true);
      setLoading(true);

      const verifyPayment = async () => {
        const maxRetries = 4;
        let lastError = null;

        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
          try {
            const verifyPayloadAddress = walletAddress || currentTicketRef.current?.userAddress || pendingCheckout?.walletAddress || null;
            const { response: res } = await fetchPaymentApiWithFallback('/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(buildVerifyPaymentPayload(sessionId, verifyPayloadAddress)),
            }, { fallbackOnHttpError: true });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
              let mintedData = data.minted || null;

              if (!mintedData?.tokenId && data?.metadata?.mintedTokenId) {
                mintedData = {
                  ...(mintedData || {}),
                  tokenId: data.metadata.mintedTokenId,
                  transactionHash: mintedData?.transactionHash || data.metadata?.mintedTxHash || null,
                  contractAddress: mintedData?.contractAddress || data.metadata?.mintedContractAddress || null,
                  chainId: mintedData?.chainId || data.metadata?.mintedChainId || null,
                  explorerTxUrl: mintedData?.explorerTxUrl || data.metadata?.mintedExplorerTxUrl || null,
                  explorerTokenUrl: mintedData?.explorerTokenUrl || data.metadata?.mintedExplorerTokenUrl || null,
                  ticketQrData: mintedData?.ticketQrData || data.metadata?.ticketQrData || null,
                };
              }

              if (!mintedData?.tokenId) {
                if (attempt < maxRetries) {
                  await new Promise((resolve) => setTimeout(resolve, 1500));
                  continue;
                }
                throw new Error('SBT non encore créé. Réessayez dans quelques secondes.');
              }

              const resolvedWalletAddress = data.metadata?.userAddress || walletAddress;
              const resolvedTicket = {
                userId: userInfo?.userId || data?.metadata?.userId || null,
                userEmail: userInfo?.email || data?.metadata?.userEmail || null,
                userAddress: resolvedWalletAddress,
                status: 'minted',
                stripeSessionId: sessionId,
                stripePaymentStatus: 'paid',
                stripePaymentIntent: data.payment_intent,
                transactionHash: mintedData?.transactionHash || null,
                tokenId: mintedData?.tokenId || null,
                contractAddress: mintedData?.contractAddress || null,
                chainId: mintedData?.chainId || null,
                explorerTxUrl: mintedData?.explorerTxUrl || null,
                explorerTokenUrl: mintedData?.explorerTokenUrl || null,
                ticketQrData: mintedData?.ticketQrData || data.metadata?.ticketQrData || null,
                paidAt: new Date(),
                mintedAt: new Date(),
                latestTicketSessionId: sessionId,
              };

              setWalletAddress(resolvedWalletAddress);
              setCurrentTicket(resolvedTicket);
              setAppState('ticket');

              if (userInfo?.userId) {
                const ticketRef = doc(db, 'ticket_requests', userInfo.userId);
                const ticketEntry = {
                  stripeSessionId: sessionId,
                  userAddress: resolvedWalletAddress,
                  transactionHash: mintedData?.transactionHash || null,
                  tokenId: mintedData?.tokenId || null,
                  contractAddress: mintedData?.contractAddress || null,
                  chainId: mintedData?.chainId || null,
                  explorerTxUrl: mintedData?.explorerTxUrl || null,
                  explorerTokenUrl: mintedData?.explorerTokenUrl || null,
                  ticketQrData: mintedData?.ticketQrData || data.metadata?.ticketQrData || null,
                  mintedAt: new Date(),
                };

                try {
                  await setDoc(ticketRef, {
                    userId: userInfo.userId,
                    userEmail: userInfo.email,
                    userAddress: resolvedWalletAddress,
                    status: mintedData?.tokenId ? 'minted' : 'pending',
                    amount: 1,
                    currency: 'EUR',
                    stripeSessionId: sessionId,
                    stripePaymentStatus: 'paid',
                    stripePaymentIntent: data.payment_intent,
                    transactionHash: mintedData?.transactionHash || null,
                    tokenId: mintedData?.tokenId || null,
                    contractAddress: mintedData?.contractAddress || null,
                    chainId: mintedData?.chainId || null,
                    explorerTxUrl: mintedData?.explorerTxUrl || null,
                    explorerTokenUrl: mintedData?.explorerTokenUrl || null,
                    ticketQrData: mintedData?.ticketQrData || data.metadata?.ticketQrData || null,
                    paidAt: new Date(),
                    mintedAt: mintedData?.tokenId ? new Date() : null,
                    latestTicketSessionId: sessionId,
                    ticketsHistory: arrayUnion(ticketEntry),
                  }, { merge: true });
                } catch (firestoreWriteError) {
                  console.error('Firestore write error after mint:', firestoreWriteError);
                }
              }

              window.history.replaceState({}, document.title, window.location.pathname);
              clearPendingCheckoutSession();
              setError('');
              return;
            }

            const backendMessage = data?.error || data?.message || 'Paiement non validé.';
            const canRetry = /payment not completed|not completed|en attente|pending/i.test(backendMessage);

            if (canRetry && attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              continue;
            }

            throw new Error(backendMessage);
          } catch (err) {
            lastError = err;

            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              continue;
            }
          }
        }

        setError(lastError?.message || 'Paiement non validé.');
      };

      verifyPayment().finally(() => {
        setLoading(false);
      });
    }
  }, [checkoutHandled, userInfo, walletAddress]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!isValidEmail) {
      setError('Email invalide. Exemple: test@example.com');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
      const signedInUser = userCredential.user;
      setUserInfo({
        userId: signedInUser.uid,
        email: signedInUser.email,
        connected: true,
      });
      setAppState('buy');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!isValidEmail) {
      setError('Email invalide. Exemple: test@example.com');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
      const signedInUser = userCredential.user;
      setUserInfo({
        userId: signedInUser.uid,
        email: signedInUser.email,
        connected: true,
      });
      setAppState('buy');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAppState('auth');
      setUserInfo(null);
      setWalletAddress(null);
      setCurrentTicket(null);
      setAdminView(false);
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    }
  };

  const handleOpenAdminPanel = () => {
    if (!isAdminUser) {
      setError('Accès admin refusé. Ajoutez votre email dans REACT_APP_ADMIN_EMAILS.');
      return;
    }

    setError('');
    setAdminView(true);
  };

  const handleCloseAdminPanel = () => {
    setAdminView(false);
  };

  const handlePurchaseStart = async (addressOverride) => {
    const normalizeWalletAddress = (value) => String(value || '').trim();
    let effectiveWalletAddress = normalizeWalletAddress(addressOverride || walletAddress);

    if ((!effectiveWalletAddress || !/^0x[a-fA-F0-9]{40}$/.test(effectiveWalletAddress)) && window.ethereum) {
      try {
        const fallbackAccounts = await window.ethereum.request({ method: 'eth_accounts' });
        const fallbackAddress = normalizeWalletAddress(fallbackAccounts?.[0]);
        if (/^0x[a-fA-F0-9]{40}$/.test(fallbackAddress)) {
          effectiveWalletAddress = fallbackAddress;
          setWalletAddress(fallbackAddress);
        }
      } catch (_) {
        // ignore fallback wallet lookup errors
      }
    }

    if (!effectiveWalletAddress || !/^0x[a-fA-F0-9]{40}$/.test(effectiveWalletAddress)) {
      throw new Error('Connectez un wallet Ethereum valide avant d\'acheter.');
    }

    setCheckoutHandled(false);
    setLoading(true);
    setError('');

    try {
      const { response } = await fetchPaymentApiWithFallback('/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userInfo.userId,
          userEmail: userInfo.email,
          userAddress: effectiveWalletAddress,
        }),
      }, { fallbackOnHttpError: true });

      if (!response.ok) {
        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        const errorPayload = contentType.includes('application/json')
          ? await response.json().catch(() => ({}))
          : {};
        const errorText = !contentType.includes('application/json')
          ? await response.text().catch(() => '')
          : '';
        const detailedMessage =
          errorPayload?.error ||
          errorPayload?.message ||
          (errorText ? errorText.slice(0, 180).trim() : '');

        throw new Error(detailedMessage || `Serveur paiement indisponible (HTTP ${response.status}).`);
      }

      const data = await response.json();

      if (data.url) {
        savePendingCheckoutSession(data.sessionId, effectiveWalletAddress);
        window.location.href = data.url;
        return;
      }

      throw new Error(data.error || 'Lien de paiement indisponible.');
    } catch (err) {
      const isNetworkError = isNetworkFetchError(err);

      const backendLabel = API_BASE_URL || 'même domaine (Netlify Functions)';
      const message = isNetworkError
        ? API_BASE_URL
          ? `Serveur de paiement inaccessible (${backendLabel}). Vérifiez que votre backend public est en ligne puis réessayez.`
          : 'Serveur de paiement inaccessible (même domaine). Vérifiez vos Netlify Functions ou configurez REACT_APP_API_BASE_URL vers votre backend public puis réessayez.'
        : err.message || 'Erreur de paiement.';

      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyAnotherTicket = () => {
    setCheckoutHandled(false);
    setError('');
    setAppState('buy');
  };

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      const message = 'MetaMask (ou wallet EVM compatible) est requis pour mint un vrai SBT.';
      setError(message);
      throw new Error(message);
    }

    setWalletLoading(true);
    setError('');

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const selectedAddress = String(accounts?.[0] || '').trim();

      if (!selectedAddress || !/^0x[a-fA-F0-9]{40}$/.test(selectedAddress)) {
        throw new Error('Adresse wallet invalide.');
      }

      setWalletAddress(selectedAddress);
      return selectedAddress;
    } catch (err) {
      const message = err.message || 'Connexion wallet impossible.';
      setError(message);
      throw new Error(message);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    const isWaitingState = appState === 'waiting';
    const sessionId = currentTicket?.latestTicketSessionId || currentTicket?.stripeSessionId;
    const hasToken = Boolean(currentTicket?.tokenId);

    if (!isWaitingState || !sessionId || hasToken || !userInfo?.userId) {
      return;
    }

    let cancelled = false;

    const recoverMintIfNeeded = async () => {
      try {
        const { response: res } = await fetchPaymentApiWithFallback('/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildVerifyPaymentPayload(sessionId, walletAddress || currentTicket?.userAddress || null)),
        }, { fallbackOnHttpError: true });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          return;
        }

        const mintedData = data?.minted || {};
        const recoveredTokenId = mintedData?.tokenId || data?.metadata?.mintedTokenId || null;

        if (!recoveredTokenId || cancelled) {
          return;
        }

        const recoveredTicket = {
          userId: userInfo.userId,
          userEmail: userInfo.email,
          userAddress: data.metadata?.userAddress || currentTicket?.userAddress || walletAddress || null,
          status: 'minted',
          stripeSessionId: sessionId,
          latestTicketSessionId: sessionId,
          stripePaymentStatus: 'paid',
          stripePaymentIntent: data.payment_intent || null,
          tokenId: recoveredTokenId,
          transactionHash: mintedData?.transactionHash || data?.metadata?.mintedTxHash || null,
          contractAddress: mintedData?.contractAddress || data?.metadata?.mintedContractAddress || null,
          chainId: mintedData?.chainId || data?.metadata?.mintedChainId || null,
          explorerTxUrl: mintedData?.explorerTxUrl || data?.metadata?.mintedExplorerTxUrl || null,
          explorerTokenUrl: mintedData?.explorerTokenUrl || data?.metadata?.mintedExplorerTokenUrl || null,
          ticketQrData: mintedData?.ticketQrData || data?.metadata?.ticketQrData || null,
          mintedAt: new Date(),
        };

        setCurrentTicket(recoveredTicket);
        setWalletAddress(recoveredTicket.userAddress || walletAddress || null);
        setAppState('ticket');

        const ticketRef = doc(db, 'ticket_requests', userInfo.userId);
        try {
          await setDoc(ticketRef, recoveredTicket, { merge: true });
        } catch (firestoreWriteError) {
          console.error('Firestore recovery write error:', firestoreWriteError);
        }
      } catch (recoveryError) {
        console.error('Recover mint error:', recoveryError);
      }
    };

    recoverMintIfNeeded();

    return () => {
      cancelled = true;
    };
  }, [appState, currentTicket, userInfo, walletAddress]);

  if (adminView) {
    return <AdminPanel onClose={handleCloseAdminPanel} />;
  }

  if (!firebaseReady) {
    return (
      <div className="min-h-screen gradient-gold-green flex items-center justify-center p-4">
        <div className="card-elegant max-w-xl w-full">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">⚠️</div>
            <h1 className="text-2xl font-bold text-red-700 mb-2">Configuration requise</h1>
            <p className="text-gray-700">{firebaseErrorMessage}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
            Ajoutez ces variables dans Netlify (Site settings {'>'} Environment variables), puis relancez un redeploy.
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'auth') {
    return (
      <div className="min-h-screen gradient-gold-green flex items-center justify-center p-4">
        <div className="corner-credit">merci Call X</div>
        <div className="card-elegant max-w-md w-full relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <div className="loading-animation text-3xl mb-3">⏳</div>
                <p className="text-green-900 font-semibold">Connexion en cours...</p>
              </div>
            </div>
          )}
          <div className="text-center mb-8">
            <div className="tropical-wave text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-green-900 mb-2">
              Baccha Festival 2026
            </h1>
            <p className="text-gray-600">Obtenez votre ticket SBT en 1 clic</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <input
              type="email"
              placeholder="Votre email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500"
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500"
              required
            />

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-3">
              Pas encore de compte?
            </p>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full px-4 py-2 border-2 border-yellow-500 text-yellow-600 font-semibold rounded-full hover:bg-yellow-50 transition"
            >
              {loading ? 'Création...' : 'Créer un compte'}
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-6">
            Vos données sont sécurisées avec Firebase.
          </p>
        </div>
      </div>
    );
  }

  if (appState === 'buy') {
    return (
      <>
        {error && (
          <div className="fixed top-4 right-4 bg-red-600 text-white text-sm px-4 py-2 rounded-full shadow-lg">
            {error}
          </div>
        )}
        <BuyTicketComponent
          user={userInfo}
          walletAddress={walletAddress}
          walletLoading={walletLoading}
          onConnectWallet={handleConnectWallet}
          onPurchaseStart={handlePurchaseStart}
          loading={loading}
        />
        <button
          onClick={handleLogout}
          className="fixed bottom-4 left-4 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
        >
          Déconnexion
        </button>
        {isAdminUser && (
          <button
            onClick={handleOpenAdminPanel}
            className="fixed bottom-4 right-4 px-4 py-2 bg-green-700 text-white rounded-full hover:bg-green-800 transition"
          >
            Panel admin
          </button>
        )}
      </>
    );
  }

  if (appState === 'waiting') {
    return (
      <>
        {error && (
          <div className="fixed top-4 right-4 bg-red-600 text-white text-sm px-4 py-2 rounded-full shadow-lg">
            {error}
          </div>
        )}
        <WaitingComponent userName={userInfo?.email} />
        <button
          onClick={handleLogout}
          className="fixed bottom-4 left-4 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
        >
          Déconnexion
        </button>
        {isAdminUser && (
          <button
            onClick={handleOpenAdminPanel}
            className="fixed bottom-4 right-4 px-4 py-2 bg-green-700 text-white rounded-full hover:bg-green-800 transition"
          >
            Panel admin
          </button>
        )}
      </>
    );
  }

  if (appState === 'ticket') {
    return (
      <>
        {error && (
          <div className="fixed top-4 right-4 bg-red-600 text-white text-sm px-4 py-2 rounded-full shadow-lg">
            {error}
          </div>
        )}
        <TicketComponent
          user={userInfo}
          ticket={currentTicket}
          walletAddress={walletAddress}
          onBuyAnotherTicket={handleBuyAnotherTicket}
        />
        <button
          onClick={handleLogout}
          className="fixed bottom-4 left-4 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
        >
          Déconnexion
        </button>
        {isAdminUser && (
          <button
            onClick={handleOpenAdminPanel}
            className="fixed bottom-4 right-4 px-4 py-2 bg-green-700 text-white rounded-full hover:bg-green-800 transition"
          >
            Panel admin
          </button>
        )}
      </>
    );
  }

  return null;
}

export default App;
