import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorBoundary = ({ children, fallback }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const handleError = (event) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen gradient-gold-green flex items-center justify-center p-4">
        <div className="card-elegant max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <AlertCircle size={48} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-center text-red-700 mb-4">
            Oups! Une erreur s'est produite
          </h1>
          <p className="text-gray-600 mb-6 text-center">
            {error?.message || 'Une erreur inattendue s\'est produite.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            Recharger la page
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Si le problème persiste, contactez le support.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ErrorBoundary;
