import React, { useEffect, useState } from 'react';
import { ShoppingCart, Loader, ShieldCheck, Lock, Wallet } from 'lucide-react';

const getInjectedEvmProvider = () => {
  if (typeof window === 'undefined') return null;

  const ethereum = window.ethereum;
  const web3Provider = window.web3?.currentProvider;

  if (ethereum?.providers && Array.isArray(ethereum.providers)) {
    const metaMaskProvider = ethereum.providers.find((provider) => provider?.isMetaMask);
    if (metaMaskProvider) return metaMaskProvider;

    const firstValidProvider = ethereum.providers.find((provider) => provider?.request);
    if (firstValidProvider) return firstValidProvider;
  }

  if (ethereum?.request) return ethereum;
  if (web3Provider?.request) return web3Provider;

  return null;
};

const getMetaMaskDeeplink = () => {
  if (typeof window === 'undefined') return 'https://metamask.io/download/';

  const currentUrl = encodeURIComponent(window.location.href);
  return `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`;
};

const BuyTicketComponent = ({
  user,
  walletAddress,
  walletLoading,
  onConnectWallet,
  onPurchaseStart,
  loading,
}) => {
  const [error, setError] = useState(null);
  const [manualAddress, setManualAddress] = useState('');
  const [hasInjectedWallet, setHasInjectedWallet] = useState(Boolean(getInjectedEvmProvider()));
  const walletReady = /^0x[a-fA-F0-9]{40}$/.test(walletAddress || '');
  const manualAddressReady = /^0x[a-fA-F0-9]{40}$/.test((manualAddress || '').trim());

  useEffect(() => {
    const refreshProviderState = () => setHasInjectedWallet(Boolean(getInjectedEvmProvider()));

    refreshProviderState();
    const timeoutId = setTimeout(refreshProviderState, 1200);
    const intervalId = setInterval(refreshProviderState, 3000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (walletReady) {
      setManualAddress(walletAddress);
    }
  }, [walletAddress, walletReady]);

  const handleBuyTicket = async () => {
    setError(null);
    try {
      let effectiveAddress = walletAddress;

      if (!walletReady) {
        if (hasInjectedWallet) {
          effectiveAddress = await onConnectWallet();
        } else if (manualAddressReady) {
          effectiveAddress = manualAddress.trim();
        } else {
          throw new Error('MetaMask non détecté. Connectez MetaMask ou entrez une adresse EVM valide (0x...).');
        }
      }

      await onPurchaseStart(effectiveAddress);
    } catch (err) {
      console.error('Erreur lors de l\'achat:', err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen gradient-gold-green flex items-center justify-center p-4">
      <div className="card-elegant max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-50 text-green-800 flex items-center justify-center">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-3xl font-bold text-green-900 mb-2">
            Obtenir mon Pass Baccha
          </h2>
          <p className="text-gray-600">Chaque achat crée un nouveau SBT unique sur votre wallet</p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={22} className="text-green-700 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Soulbound Token</h3>
              <p className="text-sm text-gray-600">
                Votre ticket est attaché à votre identité et ne peut pas être revendu
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Lock size={22} className="text-green-700 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Sécurisé</h3>
              <p className="text-sm text-gray-600">
                Stocké sur la blockchain, affichable avec votre QR code
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Wallet size={22} className="text-green-700 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Prix</h3>
              <p className="text-sm text-gray-600">
                <span className="text-3xl font-bold text-yellow-600">1€</span>
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {hasInjectedWallet ? (
          <button
            onClick={onConnectWallet}
            disabled={walletLoading}
            className="w-full mb-4 px-4 py-3 border-2 border-green-600 text-green-700 font-semibold rounded-full hover:bg-green-50 transition flex items-center justify-center gap-2"
          >
            <Wallet size={18} />
            {walletLoading
              ? 'Connexion wallet...'
              : walletReady
                ? 'Wallet connecté ✅'
                : 'Connecter MetaMask / Wallet'}
          </button>
        ) : (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => window.open(getMetaMaskDeeplink(), '_blank', 'noopener,noreferrer')}
              className="w-full mb-3 px-4 py-3 border-2 border-green-600 text-green-700 font-semibold rounded-full hover:bg-green-50 transition flex items-center justify-center gap-2"
            >
              <Wallet size={18} />
              Ouvrir MetaMask
            </button>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Adresse wallet de réception du SBT
            </label>
            <input
              type="text"
              value={manualAddress}
              onChange={(event) => setManualAddress(event.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 border-2 border-green-600 text-green-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300"
            />
            <p className="mt-2 text-xs text-gray-600">
              MetaMask non détecté sur ce navigateur. Ouvrez MetaMask puis rechargez la page, ou entrez une adresse EVM valide.
            </p>
          </div>
        )}

        <button
          onClick={handleBuyTicket}
          disabled={loading || walletLoading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <ShoppingCart size={20} />
              Acheter mon Pass - 1€
            </>
          )}
        </button>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Adresse de réception du SBT:</strong>{' '}
            {walletReady
              ? `${walletAddress.substring(0, 10)}...${walletAddress.slice(-8)}`
              : manualAddressReady
                ? `${manualAddress.trim().substring(0, 10)}...${manualAddress.trim().slice(-8)}`
                : 'Non connectée'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuyTicketComponent;
