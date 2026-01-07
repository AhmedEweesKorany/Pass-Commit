import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSalt,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  deriveKey,
  encrypt,
  decrypt,
  hashPassword,
  generatePassword,
  generateMemorablePassword,
  generateNumericPin,
} from './crypto';

describe('Crypto Utilities', () => {
  describe('generateSalt', () => {
    it('should generate a Uint8Array of length 16', () => {
      const salt = generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });

    it('should generate unique salts each time', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(arrayBufferToBase64(salt1)).not.toBe(arrayBufferToBase64(salt2));
    });
  });

  describe('arrayBufferToBase64 / base64ToArrayBuffer', () => {
    it('should convert Uint8Array to base64 and back', () => {
      const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const base64 = arrayBufferToBase64(original);
      expect(base64).toBe('SGVsbG8=');

      const converted = base64ToArrayBuffer(base64);
      expect(converted).toEqual(original);
    });

    it('should handle empty array', () => {
      const empty = new Uint8Array([]);
      const base64 = arrayBufferToBase64(empty);
      const converted = base64ToArrayBuffer(base64);
      expect(converted.length).toBe(0);
    });

    it('should handle binary data', () => {
      const binary = new Uint8Array([0, 127, 255, 128, 1]);
      const base64 = arrayBufferToBase64(binary);
      const converted = base64ToArrayBuffer(base64);
      expect(converted).toEqual(binary);
    });
  });

  describe('deriveKey', () => {
    it('should derive a CryptoKey from password and salt', async () => {
      const password = 'testPassword123';
      const salt = generateSalt();

      const key = await deriveKey(password, salt);

      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should derive same key from same password and salt', async () => {
      const password = 'testPassword123';
      const salt = new Uint8Array(16).fill(1); // Fixed salt for testing

      const key1 = await deriveKey(password, salt);
      const key2 = await deriveKey(password, salt);

      // Export keys to compare
      const exported1 = await crypto.subtle.exportKey('raw', key1);
      const exported2 = await crypto.subtle.exportKey('raw', key2);

      expect(arrayBufferToBase64(exported1)).toBe(arrayBufferToBase64(exported2));
    });

    it('should derive different keys from different passwords', async () => {
      const salt = new Uint8Array(16).fill(1);

      const key1 = await deriveKey('password1', salt);
      const key2 = await deriveKey('password2', salt);

      const exported1 = await crypto.subtle.exportKey('raw', key1);
      const exported2 = await crypto.subtle.exportKey('raw', key2);

      expect(arrayBufferToBase64(exported1)).not.toBe(arrayBufferToBase64(exported2));
    });

    it('should derive different keys from different salts', async () => {
      const password = 'samePassword';
      const salt1 = new Uint8Array(16).fill(1);
      const salt2 = new Uint8Array(16).fill(2);

      const key1 = await deriveKey(password, salt1);
      const key2 = await deriveKey(password, salt2);

      const exported1 = await crypto.subtle.exportKey('raw', key1);
      const exported2 = await crypto.subtle.exportKey('raw', key2);

      expect(arrayBufferToBase64(exported1)).not.toBe(arrayBufferToBase64(exported2));
    });
  });

  describe('encrypt / decrypt', () => {
    let key: CryptoKey;
    let salt: Uint8Array;

    beforeEach(async () => {
      salt = generateSalt();
      key = await deriveKey('testPassword', salt);
    });

    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = 'Hello, World!';

      const encrypted = await encrypt(plaintext, key, salt);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(plaintext);

      const decrypted = await decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt different plaintexts to different ciphertexts', async () => {
      const encrypted1 = await encrypt('message1', key, salt);
      const encrypted2 = await encrypt('message2', key, salt);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });

    it('should use different IVs for each encryption', async () => {
      const encrypted1 = await encrypt('same message', key, salt);
      const encrypted2 = await encrypt('same message', key, salt);

      // Different IVs should produce different ciphertexts
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });

    it('should handle empty string', async () => {
      const encrypted = await encrypt('', key, salt);
      const decrypted = await decrypt(encrypted, key);
      expect(decrypted).toBe('');
    });

    it('should handle long strings', async () => {
      const longText = 'x'.repeat(10000);
      const encrypted = await encrypt(longText, key, salt);
      const decrypted = await decrypt(encrypted, key);
      expect(decrypted).toBe(longText);
    });

    it('should handle special characters', async () => {
      const special = '🔐 Пароль 密码 !@#$%^&*()';
      const encrypted = await encrypt(special, key, salt);
      const decrypted = await decrypt(encrypted, key);
      expect(decrypted).toBe(special);
    });

    it('should handle JSON data', async () => {
      const jsonData = JSON.stringify({ username: 'test', password: 'secret123' });
      const encrypted = await encrypt(jsonData, key, salt);
      const decrypted = await decrypt(encrypted, key);
      expect(decrypted).toBe(jsonData);
      expect(JSON.parse(decrypted)).toEqual({ username: 'test', password: 'secret123' });
    });

    it('should fail to decrypt with wrong key', async () => {
      const encrypted = await encrypt('secret', key, salt);

      const wrongSalt = generateSalt();
      const wrongKey = await deriveKey('wrongPassword', wrongSalt);

      await expect(decrypt(encrypted, wrongKey)).rejects.toThrow();
    });
  });

  describe('hashPassword', () => {
    it('should hash a password to base64 string', async () => {
      const hash = await hashPassword('testPassword');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce same hash for same password', async () => {
      const hash1 = await hashPassword('samePassword');
      const hash2 = await hashPassword('samePassword');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different passwords', async () => {
      const hash1 = await hashPassword('password1');
      const hash2 = await hashPassword('password2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generatePassword', () => {
    it('should generate password of specified length', () => {
      const password = generatePassword({
        length: 20,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: false,
        excludeAmbiguous: false,
      });
      expect(password.length).toBe(20);
    });

    it('should include only lowercase when specified', () => {
      const password = generatePassword({
        length: 50,
        uppercase: false,
        lowercase: true,
        numbers: false,
        symbols: false,
        excludeAmbiguous: false,
      });
      expect(password).toMatch(/^[a-z]+$/);
    });

    it('should include only uppercase when specified', () => {
      const password = generatePassword({
        length: 50,
        uppercase: true,
        lowercase: false,
        numbers: false,
        symbols: false,
        excludeAmbiguous: false,
      });
      expect(password).toMatch(/^[A-Z]+$/);
    });

    it('should include only numbers when specified', () => {
      const password = generatePassword({
        length: 50,
        uppercase: false,
        lowercase: false,
        numbers: true,
        symbols: false,
        excludeAmbiguous: false,
      });
      expect(password).toMatch(/^[0-9]+$/);
    });

    it('should include symbols when specified', () => {
      const password = generatePassword({
        length: 100,
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: true,
        excludeAmbiguous: false,
      });
      const symbolPattern = /^[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/;
      expect(password).toMatch(symbolPattern);
    });

    it('should exclude ambiguous characters when specified', () => {
      const password = generatePassword({
        length: 1000,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: false,
        excludeAmbiguous: true,
      });
      expect(password).not.toContain('l');
      expect(password).not.toContain('1');
      expect(password).not.toContain('I');
      expect(password).not.toContain('O');
      expect(password).not.toContain('0');
    });

    it('should generate unique passwords', () => {
      const passwords = new Set();
      for (let i = 0; i < 100; i++) {
        passwords.add(
          generatePassword({
            length: 16,
            uppercase: true,
            lowercase: true,
            numbers: true,
            symbols: true,
            excludeAmbiguous: false,
          })
        );
      }
      expect(passwords.size).toBe(100);
    });

    it('should use default charset when no options enabled', () => {
      const password = generatePassword({
        length: 16,
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false,
        excludeAmbiguous: false,
      });
      expect(password.length).toBe(16);
      expect(password).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('generateMemorablePassword', () => {
    it('should generate password with specified word count', () => {
      const password = generateMemorablePassword(4);
      const parts = password.split('-');
      expect(parts.length).toBe(4);
    });

    it('should capitalize first letter of each word', () => {
      const password = generateMemorablePassword(4);
      const parts = password.split('-');
      parts.forEach((word) => {
        expect(word[0]).toMatch(/[A-Z]/);
        expect(word.slice(1)).toMatch(/^[a-z]+$/);
      });
    });

    it('should use default of 4 words', () => {
      const password = generateMemorablePassword();
      const parts = password.split('-');
      expect(parts.length).toBe(4);
    });

    it('should generate unique passwords', () => {
      const passwords = new Set();
      for (let i = 0; i < 50; i++) {
        passwords.add(generateMemorablePassword(4));
      }
      // Should have mostly unique passwords (allowing for some random collisions)
      expect(passwords.size).toBeGreaterThan(40);
    });
  });

  describe('generateNumericPin', () => {
    it('should generate PIN of specified length', () => {
      const pin = generateNumericPin(6);
      expect(pin.length).toBe(6);
    });

    it('should contain only digits', () => {
      const pin = generateNumericPin(12);
      expect(pin).toMatch(/^[0-9]+$/);
    });

    it('should use default length of 12', () => {
      const pin = generateNumericPin();
      expect(pin.length).toBe(12);
    });

    it('should generate unique PINs', () => {
      const pins = new Set();
      for (let i = 0; i < 100; i++) {
        pins.add(generateNumericPin(8));
      }
      expect(pins.size).toBe(100);
    });
  });
});
