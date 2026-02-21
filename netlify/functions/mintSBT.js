const { ethers } = require('ethers');

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const normalizePrivateKey = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.startsWith('0x') ? raw : `0x${raw}`;
};

exports.handler = async (event = {}) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: true }),
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    const { SBT_RPC_URL, SBT_CONTRACT_ADDRESS } = process.env;
    const SBT_MINTER_PRIVATE_KEY = normalizePrivateKey(process.env.SBT_MINTER_PRIVATE_KEY);

    if (!SBT_RPC_URL || !SBT_MINTER_PRIVATE_KEY || !SBT_CONTRACT_ADDRESS) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: 'Missing required environment variables: SBT_RPC_URL, SBT_MINTER_PRIVATE_KEY, SBT_CONTRACT_ADDRESS',
        }),
      };
    }

    let abi;
    try {
      abi = require('./abi.json');
    } catch (_) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Cannot load abi.json in netlify/functions folder' }),
      };
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (_) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Invalid JSON body' }),
      };
    }

    const address = String(payload.address || '').trim();

    if (!address || !ethers.isAddress(address)) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Invalid address' }),
      };
    }

    const provider = new ethers.JsonRpcProvider(SBT_RPC_URL);
    const wallet = new ethers.Wallet(SBT_MINTER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(SBT_CONTRACT_ADDRESS, abi, wallet);

    const tx = await contract.mint(address);

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ hash: tx.hash }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: error.message || 'Mint failed' }),
    };
  }
};
