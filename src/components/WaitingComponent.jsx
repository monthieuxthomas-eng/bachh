import React from 'react';
import { Zap } from 'lucide-react';

const TropicalAnimation = () => {
  return (
    <div className="relative h-40 flex items-center justify-center overflow-hidden">
      {/* Sun */}
      <div className="absolute top-10 right-20 text-6xl tropical-wave">☀️</div>

      {/* Palm tree */}
      <div className="absolute left-10 text-6xl tropical-wave" style={{ animationDelay: '0.5s' }}>
        🌴
      </div>

      {/* Waves */}
      <div className="absolute bottom-5 left-0 right-0 text-center">
        <div className="text-3xl tropical-wave" style={{ animationDelay: '1s' }}>
          ～～～
        </div>
      </div>

      {/* Pineapple */}
      <div className="absolute right-5 bottom-5 text-5xl tropical-wave" style={{ animationDelay: '0.3s' }}>
        🍍
      </div>
    </div>
  );
};

const WaitingComponent = ({ userName }) => {
  return (
    <div className="min-h-screen gradient-gold-green flex items-center justify-center p-4">
      <div className="card-elegant max-w-md w-full">
        <div className="text-center">
          <TropicalAnimation />

          <h2 className="text-2xl font-bold text-green-900 mt-8 mb-4">
            ✨ Traitement en cours...
          </h2>

          <p className="text-gray-600 mb-6">
            Bonjour <strong>{userName}</strong>,
          </p>

          <p className="text-gray-600 mb-8">
            L'organisation valide votre transaction. Nous allons générer votre Soulbound Token
            et vous afficher votre QR code très bientôt.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <span className="inline-block w-8 h-8 rounded-full bg-yellow-400 text-green-900 font-bold flex items-center justify-center">
                1
              </span>
              <span>✅ Paiement validé</span>
            </div>

            <div className="text-sm font-semibold text-yellow-700 pl-11">
              tiket en création
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-700">
              <span className="inline-block w-8 h-8 rounded-full bg-yellow-300 text-green-900 font-bold flex items-center justify-center loading-animation">
                2
              </span>
              <span>⏳ Génération du token...</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="inline-block w-8 h-8 rounded-full border-2 border-yellow-300 text-green-900 font-bold flex items-center justify-center">
                3
              </span>
              <span>Affichage de votre QR code</span>
            </div>
          </div>

          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-green-900">
              <Zap size={20} />
              <p className="text-sm font-semibold">Page auto-actualisant...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingComponent;
