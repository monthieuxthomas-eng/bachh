import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';
import { CheckCircle, Download, Copy } from 'lucide-react';

const TicketComponent = ({ user, ticket, walletAddress, onBuyAnotherTicket }) => {
  const [copied, setCopied] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const userEmail = user?.email || ticket?.userEmail || 'Email indisponible';
  const displayAddress = ticket?.userAddress || walletAddress || '';
  const tokenId = ticket?.tokenId;
  const contractAddress = ticket?.contractAddress;
  const txHash = ticket?.transactionHash;
  const qrPayload =
    ticket?.ticketQrData ||
    ticket?.explorerTokenUrl ||
    ticket?.explorerTxUrl ||
    (contractAddress && tokenId
      ? `https://etherscan.io/token/${contractAddress}?a=${tokenId}`
      : txHash
        ? `https://etherscan.io/tx/${txHash}`
        : '');

  useEffect(() => {
    if (ticket && qrPayload) {
      // QR basé sur la ressource on-chain du SBT
      const qrData = qrPayload;
      setQrValue(qrData);
    }
  }, [ticket, qrPayload]);

  const downloadTicketImage = () => {
    const qrElement = document.querySelector('#qr-code');
    
    if (!qrElement) return;

    // Créer un canvas pour la composition
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Dimensions
    canvas.width = 1000;
    canvas.height = 1400;
    
    // Fond dégradé (jaune-vert)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#FCD34D');
    gradient.addColorStop(1, '#10B981');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Bordure dorée
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Fond du ticket (blanc)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
    
    // Titre
    ctx.fillStyle = '#004D40';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 BACCHA FESTIVAL 2026 🎉', canvas.width / 2, 100);
    
    // Sous-titre
    ctx.font = '28px Arial';
    ctx.fillStyle = '#059669';
    ctx.fillText('Soulbound Token Ticket', canvas.width / 2, 160);
    
    // Séparateur
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 200);
    ctx.lineTo(canvas.width - 80, 200);
    ctx.stroke();
    
    // Email
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Festivalier:', 100, 280);
    ctx.fillStyle = '#059669';
    ctx.font = '18px Arial';
    ctx.fillText(userEmail, 100, 320);
    
    // ID du ticket
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('ID du billet:', 100, 400);
    ctx.fillStyle = '#666666';
    ctx.font = '14px monospace';
    const ticketId = tokenId || ticket?.id || 'XXXXXX';
    ctx.fillText(ticketId.substring(0, 25), 100, 440);
    if (ticketId.length > 25) {
      ctx.fillText(ticketId.substring(25), 100, 470);
    }
    
    // Adresse portefeuille
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Portefeuille:', 100, 540);
    ctx.fillStyle = '#666666';
    ctx.font = '14px monospace';
    ctx.fillText(displayAddress || 'N/A', 100, 580);
    
    // QR Code depuis l'élément existant
    const qrCanvas = qrElement.querySelector('canvas');
    if (qrCanvas) {
      const qrImg = qrCanvas.toDataURL('image/png');
      const qrImage = new Image();
      qrImage.onload = () => {
        ctx.drawImage(qrImage, canvas.width / 2 - 150, 650, 300, 300);
        
        // Instructions
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Présentez ce code à l\'entrée', canvas.width / 2, 1050);
        
        // Warning
        ctx.fillStyle = '#78350F';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ Non transférable - Lié à votre identité', canvas.width / 2, 1120);
        
        // Footer
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px Arial';
        ctx.fillText('www.bacchafestival.com | 2026', canvas.width / 2, 1320);
        
        // Télécharger
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `Baccha-Festival-Billet-${new Date().getTime()}.png`;
        link.click();
      };
      qrImage.src = qrImg;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen gradient-gold-green flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header Animation */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/90 text-green-800 flex items-center justify-center">
            <CheckCircle size={30} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Ticket SBT confirmé
          </h1>
          <p className="text-yellow-100 text-lg">
            Votre accès festival est actif et vérifiable on-chain
          </p>
        </div>

        {/* Ticket Card */}
        <div className="card-elegant mb-8" id="ticket-card">
          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-6 text-green-600">
            <CheckCircle size={24} />
            <span className="text-lg font-semibold">Ticket activé</span>
          </div>

          {/* User Info */}
          <div className="text-center mb-6 p-4 bg-gradient-to-r from-yellow-50 to-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Festivalier</p>
            <p className="text-xl font-bold text-green-900">{userEmail}</p>
          </div>

          {/* QR Code Container */}
          <div className="qr-code-container mb-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg" id="qr-code">
              {qrValue && (
                <QRCode
                  value={qrValue}
                  size={280}
                  level="H"
                  includeMargin={true}
                  fgColor="#004D40"
                  bgColor="#FFFFFF"
                />
              )}
            </div>
          </div>

          {/* Ticket Details */}
          <div className="space-y-4 mb-8">
            <div className="border-b-2 border-gray-200 pb-4">
              <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">Token ID</p>
              <p className="text-sm font-mono text-green-900 break-all">{tokenId || 'N/A'}</p>
            </div>

            <div className="border-b-2 border-gray-200 pb-4">
              <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">
                Adresse du portefeuille
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-mono text-green-900">
                  {displayAddress
                    ? `${displayAddress.substring(0, 10)}...${displayAddress.slice(-8)}`
                    : 'N/A'}
                </p>
                <button
                  onClick={copyToClipboard}
                  disabled={!displayAddress}
                  className="text-sm text-yellow-600 hover:text-yellow-800 font-semibold flex items-center gap-1"
                >
                  <Copy size={16} />
                  {copied ? 'Copié!' : 'Copier'}
                </button>
              </div>
            </div>

            <div className="border-b-2 border-gray-200 pb-4">
              <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">Contrat SBT</p>
              <p className="text-sm font-mono text-green-900 break-all">{contractAddress || 'N/A'}</p>
            </div>

            <div className="border-b-2 border-gray-200 pb-4">
              <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">Transaction</p>
              <p className="text-sm font-mono text-green-900 break-all">{txHash || 'N/A'}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-600 mb-1">
                Type de ticket
              </p>
              <p className="text-sm font-semibold text-green-900">
                Soulbound Token (SBT) • Non transférable
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-8">
            <p className="text-sm text-yellow-900 leading-relaxed">
              <strong>Important:</strong> Ce billet est un Soulbound Token lié à votre
              identité et votre portefeuille. Il ne peut pas être transféré, vendu ou donné.
              Seul le propriétaire de ce portefeuille peut l'utiliser.
            </p>
          </div>

          {/* Festival Info */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-8">
            <h3 className="font-bold text-green-900 mb-2">Baccha Festival 2026</h3>
            <p className="text-sm text-gray-700">
              Présentez ce QR code à l'entrée pour accéder au festival. Il pointe vers la preuve on-chain de votre SBT.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={downloadTicketImage}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              title="Télécharger le billet en image PNG"
            >
              <Download size={20} />
              Télécharger billet
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 px-6 py-3 border-2 border-yellow-500 text-yellow-600 font-semibold rounded-full hover:bg-yellow-50 transition"
            >
              Imprimer
            </button>
          </div>

          <button
            onClick={onBuyAnotherTicket}
            className="w-full mt-4 px-6 py-3 border-2 border-green-600 text-green-700 font-semibold rounded-full hover:bg-green-50 transition"
          >
            Acheter un autre ticket (nouveau SBT)
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-white">
          <p className="text-sm opacity-90">
            Merci. Conservez ce ticket et présentez-le à l'entrée.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TicketComponent;
