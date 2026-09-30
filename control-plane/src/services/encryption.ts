import crypto from 'crypto';
import { config } from '../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits standard for GCM
const TAG_LENGTH = 16; // 128 bits

function getKey(): Buffer {
  const hex = config.ENCRYPTION_KEY;
  if (hex.length === 64) {
    return Buffer.from(hex, 'hex');
  }
  return crypto.createHash('sha256').update(hex).digest();
}

/**
 * Encrypts a plaintext secret using AES-256-GCM.
 * Packed buffer structure: [12 bytes IV][16 bytes AuthTag][Ciphertext]
 */
export function encryptSecret(plainText: string): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decrypts a packed AES-256-GCM buffer and verifies authenticity.
 */
export function decryptSecret(input: Uint8Array | Buffer): string {
  const cipherBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  if (!cipherBuffer || cipherBuffer.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid cipher buffer: buffer too short');
  }

  const iv = cipherBuffer.subarray(0, IV_LENGTH);
  const tag = cipherBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = cipherBuffer.subarray(IV_LENGTH + TAG_LENGTH);

  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}
