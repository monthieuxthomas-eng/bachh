require('dotenv').config({ override: true });
require('@nomicfoundation/hardhat-ethers');

const SEPOLIA_RPC_URL = process.env.SBT_RPC_URL || '';
const normalizePrivateKey = (value) => {
  if (!value) return '';
  return value.startsWith('0x') ? value : `0x${value}`;
};
const PRIVATE_KEY = normalizePrivateKey(process.env.SBT_MINTER_PRIVATE_KEY || '');

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
    cache: './cache',
  },
  networks: {
    target: {
      url: SEPOLIA_RPC_URL,
      chainId: Number(process.env.SBT_CHAIN_ID || 11155111),
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
