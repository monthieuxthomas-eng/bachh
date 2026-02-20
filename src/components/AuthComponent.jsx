import React, { useEffect, useState } from 'react';
import { DynamicContextProvider, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { EthersExtension } from '@dynamic-labs/ethers-v6';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Mail, Key } from 'lucide-react';

const AuthComponent = ({ onAuthSuccess }) => {
  const { user, isLoading } = useDynamicContext();
  const [showWidget, setShowWidget] = useState(true);

  useEffect(() => {
    if (user && !isLoading) {
      setShowWidget(false);
      onAuthSuccess({
        userId: user.userId,
        email: user.email || user.username || 'User',
        connected: true,
      });
    }
  }, [user, isLoading, onAuthSuccess]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen gradient-gold-green">
        <div className="text-white text-xl loading-animation">Chargement...</div>
      </div>
    );
  }

  if (!showWidget) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-gold-green flex items-center justify-center p-4">
      <div className="card-elegant max-w-md w-full">
        <div className="text-center mb-8">
          <div className="tropical-wave text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-green-900 mb-2">
            Baccha Festival 2026
          </h1>
          <p className="text-gray-600">Obtenez votre ticket SBT en 1 clic</p>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <p className="text-sm text-center text-yellow-900">
            🔐 Connexion sécurisée avec votre portefeuille
          </p>
        </div>

        <div className="flex justify-center">
          <DynamicWidget
            innerButtonComponent={
              <button className="btn-primary">
                <span className="flex items-center gap-2 justify-center">
                  <Key size={20} />
                  Se connecter
                </span>
              </button>
            }
          />
        </div>

        <p className="text-xs text-center text-gray-500 mt-6 leading-relaxed">
          En vous connectant, vous acceptez nos conditions d'utilisation et reconnaissez
          que votre ticket sera un Soulbound Token non transférable.
        </p>
      </div>
    </div>
  );
};

export default AuthComponent;
