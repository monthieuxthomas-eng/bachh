import React, { useState } from 'react';
import { ShoppingCart, Loader } from 'lucide-react';

const BuyTicketComponent = ({
  user,
  walletAddress,
  walletLoading,
  onConnectWallet,
  onPurchaseStart,
  loading,
}) => {
  const [error, setError] = useState(null);
  const walletReady = /^0x[a-fA-F0-9]{40}$/.test(walletAddress || '');

  const handleBuyTicket = async () => {
    setError(null);
    try {
      let effectiveAddress = walletAddress;

      if (!walletReady) {
        effectiveAddress = await onConnectWallet();
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
          <div className="tropical-wave text-6xl mb-4">🎫</div>
          <h2 className="text-3xl font-bold text-green-900 mb-2">
            Obtenir mon Pass Baccha
          </h2>
          <p className="text-gray-600">Chaque achat crée un nouveau SBT unique sur votre wallet</p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">✨</div>
            <div>
              <h3 className="font-semibold text-green-900">Soulbound Token</h3>
              <p className="text-sm text-gray-600">
                Votre ticket est attaché à votre identité et ne peut pas être revendu
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-2xl">🔐</div>
            <div>
              <h3 className="font-semibold text-green-900">Sécurisé</h3>
              <p className="text-sm text-gray-600">
                Stocké sur la blockchain, affichable avec votre QR code
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-2xl">💰</div>
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

        <button
          onClick={onConnectWallet}
          disabled={walletLoading}
          className="w-full mb-4 px-4 py-3 border-2 border-green-600 text-green-700 font-semibold rounded-full hover:bg-green-50 transition"
        >
          {walletLoading
            ? 'Connexion wallet...'
            : walletReady
              ? 'Wallet connecté ✅'
              : 'Connecter MetaMask / Wallet'}
        </button>

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
              : 'Non connectée'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuyTicketComponent;
