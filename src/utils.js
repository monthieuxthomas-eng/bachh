// Utilitaires pour l'application Baccha Festival

/**
 * Formater l'adresse wallet pour l'affichage
 * @param {string} address - Adresse complète (ex: 0x123abc...)
 * @param {number} chars - Nombre de caractères à afficher de chaque côté
 * @returns {string} Adresse formatée (ex: 0x123...abc)
 */
export const formatAddress = (address, chars = 4) => {
  const start = address.substring(0, chars + 2); // +2 pour 0x
  const end = address.substring(address.length - chars);
  return `${start}...${end}`;
};

/**
 * Valider une adresse Ethereum
 * @param {string} address - Adresse à valider
 * @returns {boolean} True si valide
 */
export const isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Générer les données pour le QR code
 * @param {string} address - Adresse wallet
 * @param {string} transactionHash - Hash de la transaction
 * @returns {string} Données pour QR code
 */
export const generateQRData = (address, transactionHash) => {
  return `${address}|${transactionHash}|BACCHA2026`;
};

/**
 * Parser les données du QR code
 * @param {string} qrData - Données du QR code
 * @returns {object} Objet avec address, hash, festival
 */
export const parseQRData = (qrData) => {
  const [address, hash, festival] = qrData.split('|');
  return {
    address,
    transactionHash: hash,
    festival,
  };
};

/**
 * Formater une date pour l'affichage
 * @param {Date|Timestamp} date - Date à formater
 * @returns {string} Date formatée (ex: 17 Feb 2026, 14:30)
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const dateObj = date.toDate ? date.toDate() : new Date(date);
  
  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return dateObj.toLocaleDateString('fr-FR', options);
};

/**
 * Copier du texte dans le presse-papiers
 * @param {string} text - Texte à copier
 * @returns {Promise} Promise qui se résout quand c'est copié
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Erreur lors de la copie:', error);
    return false;
  }
};

/**
 * Télécharger un fichier
 * @param {HTMLElement} element - Élément DOM à télécharger (ex: canvas)
 * @param {string} filename - Nom du fichier
 * @param {string} format - Format (ex: 'png', 'jpg')
 */
export const downloadElement = (element, filename, format = 'png') => {
  const link = document.createElement('a');
  
  if (element.tagName === 'CANVAS') {
    link.href = element.toDataURL(`image/${format}`);
  } else {
    // Pour SVG ou autre
    link.href = element.outerHTML;
  }
  
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Vérifier si l'utilisateur est sur mobile
 * @returns {boolean} True si sur mobile
 */
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Delay promise (utile pour les animations)
 * @param {number} ms - Millisecondes
 * @returns {Promise} Promise qui se résout après le délai
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Logger les événements (utile pour le débogage)
 * @param {string} event - Nom de l'événement
 * @param {object} data - Données associées
 */
export const logEvent = (event, data = {}) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${event}]`, data);
  }
};
