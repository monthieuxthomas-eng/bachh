import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { Check, X, Clock, Zap } from 'lucide-react';

const truncateAddress = (address = '') => {
  if (!address || address.length < 14) {
    return address || '—';
  }

  return `${address.substring(0, 10)}...${address.slice(-8)}`;
};

const AdminPanel = ({ onClose }) => {
  const [tickets, setTickets] = useState({
    pending: [],
    minted: [],
    failed: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [transactionHash, setTransactionHash] = useState('');

  useEffect(() => {
    const pendingQuery = query(
      collection(db, 'ticket_requests'),
      where('status', '==', 'pending')
    );

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      setTickets((prev) => ({
        ...prev,
        pending: snapshot.docs.map((ticketDoc) => ({ id: ticketDoc.id, ...ticketDoc.data() })),
      }));
    });

    const mintedQuery = query(
      collection(db, 'ticket_requests'),
      where('status', '==', 'minted')
    );

    const unsubscribeMinted = onSnapshot(mintedQuery, (snapshot) => {
      setTickets((prev) => ({
        ...prev,
        minted: snapshot.docs.map((ticketDoc) => ({ id: ticketDoc.id, ...ticketDoc.data() })),
      }));
    });

    const failedQuery = query(
      collection(db, 'ticket_requests'),
      where('status', '==', 'failed')
    );

    const unsubscribeFailed = onSnapshot(failedQuery, (snapshot) => {
      setTickets((prev) => ({
        ...prev,
        failed: snapshot.docs.map((ticketDoc) => ({ id: ticketDoc.id, ...ticketDoc.data() })),
      }));
      setLoading(false);
    });

    return () => {
      unsubscribePending();
      unsubscribeMinted();
      unsubscribeFailed();
    };
  }, []);

  const handleMintTicket = async (ticket) => {
    if (!transactionHash.trim()) {
      alert('Veuillez entrer un hash de transaction');
      return;
    }

    try {
      const ticketRef = doc(db, 'ticket_requests', ticket.id);
      await updateDoc(ticketRef, {
        status: 'minted',
        transactionHash,
        mintedAt: new Date(),
      });

      setTransactionHash('');
      setSelectedTicket(null);
      alert('Ticket validé avec succès.');
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleFailTicket = async (ticket) => {
    const reason = window.prompt('Raison du rejet:');
    if (!reason) {
      return;
    }

    try {
      const ticketRef = doc(db, 'ticket_requests', ticket.id);
      await updateDoc(ticketRef, {
        status: 'failed',
        failureReason: reason,
        failedAt: new Date(),
      });

      alert('Ticket rejeté.');
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <p>Chargement du panel admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-green-900">Panel Admin - Tickets</h1>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
          >
            Retour à l'app
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-yellow-100 p-6 rounded-lg">
            <Clock size={32} className="text-yellow-600 mb-2" />
            <p className="text-3xl font-bold text-yellow-900">{tickets.pending.length}</p>
            <p className="text-gray-600">En attente</p>
          </div>
          <div className="bg-green-100 p-6 rounded-lg">
            <Check size={32} className="text-green-600 mb-2" />
            <p className="text-3xl font-bold text-green-900">{tickets.minted.length}</p>
            <p className="text-gray-600">Validés</p>
          </div>
          <div className="bg-red-100 p-6 rounded-lg">
            <X size={32} className="text-red-600 mb-2" />
            <p className="text-3xl font-bold text-red-900">{tickets.failed.length}</p>
            <p className="text-gray-600">Rejetés</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-yellow-900 mb-4 flex items-center gap-2">
            <Clock size={28} />
            Tickets en attente ({tickets.pending.length})
          </h2>

          {tickets.pending.length === 0 ? (
            <p className="text-gray-500">Aucun ticket en attente</p>
          ) : (
            <div className="space-y-4">
              {tickets.pending.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border-2 border-yellow-300 rounded-lg p-4 hover:bg-yellow-50 transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Utilisateur</p>
                      <p className="font-semibold">{ticket.userName || ticket.userEmail || ticket.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold">{ticket.userEmail || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Adresse wallet</p>
                      <p className="font-mono text-sm">{truncateAddress(ticket.userAddress)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Montant</p>
                      <p className="font-semibold">{ticket.amount || 1}€</p>
                    </div>
                  </div>

                  {selectedTicket?.id === ticket.id ? (
                    <div className="bg-blue-50 p-4 rounded-lg mb-3">
                      <input
                        type="text"
                        placeholder="Hash de transaction (ex: 0x123abc...)"
                        value={transactionHash}
                        onChange={(event) => setTransactionHash(event.target.value)}
                        className="w-full px-3 py-2 border rounded-lg mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMintTicket(ticket)}
                          className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center justify-center gap-2"
                        >
                          <Zap size={18} />
                          Valider
                        </button>
                        <button
                          onClick={() => setSelectedTicket(null)}
                          className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center justify-center gap-2"
                      >
                        <Check size={18} />
                        Valider
                      </button>
                      <button
                        onClick={() => handleFailTicket(ticket)}
                        className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center justify-center gap-2"
                      >
                        <X size={18} />
                        Rejeter
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <Check size={28} />
            Tickets validés ({tickets.minted.length})
          </h2>

          {tickets.minted.length === 0 ? (
            <p className="text-gray-500">Aucun ticket validé</p>
          ) : (
            <div className="space-y-3">
              {tickets.minted.map((ticket) => (
                <div key={ticket.id} className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold">{ticket.userEmail || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Adresse wallet</p>
                      <p className="font-mono text-sm">{truncateAddress(ticket.userAddress)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-red-900 mb-4 flex items-center gap-2">
            <X size={28} />
            Tickets rejetés ({tickets.failed.length})
          </h2>

          {tickets.failed.length === 0 ? (
            <p className="text-gray-500">Aucun ticket rejeté</p>
          ) : (
            <div className="space-y-3">
              {tickets.failed.map((ticket) => (
                <div key={ticket.id} className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold">{ticket.userEmail || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Raison</p>
                      <p className="font-semibold">{ticket.failureReason || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
