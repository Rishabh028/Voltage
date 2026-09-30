import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from '../services/encryption.js';

describe('Encryption Service (AES-256-GCM)', () => {
  it('encrypts and decrypts string successfully', () => {
    const plainText = 'my_super_secret_database_url_12345';
    const encrypted = encryptSecret(plainText);
    expect(Buffer.isBuffer(encrypted)).toBe(true);
    expect(encrypted.length).toBeGreaterThan(28); // 12 IV + 16 Tag + ciphertext

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('produces different ciphertexts for the same plaintext due to random IV', () => {
    const plainText = 'constant_secret_key';
    const enc1 = encryptSecret(plainText);
    const enc2 = encryptSecret(plainText);
    expect(enc1.equals(enc2)).toBe(false);

    expect(decryptSecret(enc1)).toBe(plainText);
    expect(decryptSecret(enc2)).toBe(plainText);
  });

  it('rejects tampered ciphertext', () => {
    const plainText = 'tamper_test_secret';
    const encrypted = encryptSecret(plainText);
    
    // Tamper with the last byte
    const tampered = Buffer.from(encrypted);
    tampered[tampered.length - 1] ^= 0xff;

    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('rejects truncated buffer', () => {
    const tooShort = Buffer.from('short');
    expect(() => decryptSecret(tooShort)).toThrow(/too short/);
  });
});
