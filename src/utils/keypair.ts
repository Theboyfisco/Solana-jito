import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export function loadKeypairFromEnv(envVarName: string): Keypair | null {
  const secretKeyString = process.env[envVarName];
  if (!secretKeyString) {
    return null;
  }
  
  try {
    // Attempt to decode as base58
    const decoded = bs58.decode(secretKeyString);
    return Keypair.fromSecretKey(decoded);
  } catch (err) {
    try {
      // Attempt to decode as JSON array
      const parsed = JSON.parse(secretKeyString);
      return Keypair.fromSecretKey(new Uint8Array(parsed));
    } catch (e) {
      console.error(`Failed to parse keypair from ${envVarName}. Please ensure it is a base58 string or a JSON array of bytes.`);
      return null;
    }
  }
}

let jitoAuthKeypair: Keypair | null = null;
export function getJitoAuthKeypair(): Keypair {
  if (!jitoAuthKeypair) {
    jitoAuthKeypair = loadKeypairFromEnv('JITO_AUTH_KEYPAIR');
    if (!jitoAuthKeypair) {
      console.warn("WARNING: JITO_AUTH_KEYPAIR not found in .env. Falling back to a random keypair for simulation.");
      jitoAuthKeypair = Keypair.generate();
    }
  }
  return jitoAuthKeypair;
}

let walletKeypair: Keypair | null = null;
export function getWalletKeypair(): Keypair {
  if (!walletKeypair) {
    walletKeypair = loadKeypairFromEnv('WALLET_KEYPAIR');
    if (!walletKeypair) {
      console.warn("WARNING: WALLET_KEYPAIR not found in .env. Falling back to a random keypair for simulation.");
      walletKeypair = Keypair.generate();
    }
  }
  return walletKeypair;
}
