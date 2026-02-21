import React from 'react';
import { Loader2, ShieldCheck, QrCode, Timer } from 'lucide-react';

const WaitingComponent = ({ userName }) => {
  return (
    <div className="min-h-screen gradient-gold-green flex items-center justify-center p-4">
      <div className="card-elegant max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-50 text-green-800 flex items-center justify-center mb-4">
            <Loader2 size={30} className="animate-spin" />
          </div>

          <h2 className="text-2xl font-bold text-green-900 mt-8 mb-4">
            Traitement du ticket en cours
          </h2>

          <p className="text-gray-600 mb-6">
            Bonjour <strong>{userName}</strong>,
          </p>

          <p className="text-gray-600 mb-8">
            Nous validons votre paiement et générons votre Soulbound Token.
            Votre QR code sera affiché automatiquement dès que le mint est confirmé.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <span className="inline-block w-8 h-8 rounded-full bg-yellow-400 text-green-900 font-bold flex items-center justify-center">
                1
              </span>
              <span className="flex items-center gap-2"><ShieldCheck size={16} /> Paiement validé</span>
            </div>

            <div className="text-sm font-semibold text-yellow-700 pl-11 flex items-center gap-2">
              <Timer size={15} /> Mint en cours
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-700">
              <span className="inline-block w-8 h-8 rounded-full bg-yellow-300 text-green-900 font-bold flex items-center justify-center loading-animation">
                2
              </span>
              <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Génération du token</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="inline-block w-8 h-8 rounded-full border-2 border-yellow-300 text-green-900 font-bold flex items-center justify-center">
                3
              </span>
              <span className="flex items-center gap-2"><QrCode size={16} /> Affichage du QR code</span>
            </div>
          </div>

          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-green-900">
              <Loader2 size={18} className="animate-spin" />
              <p className="text-sm font-semibold">Mise à jour automatique</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingComponent;
