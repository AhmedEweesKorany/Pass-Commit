import { EncryptedData } from '../types';

/**
 * Cryptographic utilities for PassCommit
 * Uses Web Crypto API with PBKDF2 for key derivation and AES-GCM for encryption
 */

const PBKDF2_ITERATIONS = 600000; // OWASP recommended
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV for encryption
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Convert Uint8Array to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive an encryption key from master password using PBKDF2
 */
export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import the master password as a key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(
  data: string,
  key: CryptoKey,
  salt: Uint8Array
): Promise<EncryptedData> {
  const iv = generateIV();
  const encodedData = new TextEncoder().encode(data);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    encodedData
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);
  const iv = base64ToArrayBuffer(encrypted.iv);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    ciphertext as any
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Hash a password for verification (not for storage)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Generate a secure random password
 */
export function generatePassword(options: {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}): string {
  let charset = '';
  const ambiguous = 'l1IO0';
  
  if (options.uppercase) {
    charset += options.excludeAmbiguous 
      ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' 
      : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  if (options.lowercase) {
    charset += options.excludeAmbiguous 
      ? 'abcdefghjkmnpqrstuvwxyz' 
      : 'abcdefghijklmnopqrstuvwxyz';
  }
  if (options.numbers) {
    charset += options.excludeAmbiguous ? '23456789' : '0123456789';
  }
  if (options.symbols) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }

  if (!charset) {
    charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  }

  const randomValues = crypto.getRandomValues(new Uint32Array(options.length));
  let password = '';
  
  for (let i = 0; i < options.length; i++) {
    password += charset[randomValues[i] % charset.length];
  }

  return password;
}

/**
 * Generate a memorable password using word list
 */
export function generateMemorablePassword(wordCount: number = 4): string {
  // Common words for memorable passwords
  const words = [
    'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'galaxy', 'harbor',
    'island', 'jungle', 'kitchen', 'lemon', 'mountain', 'november', 'ocean', 'planet',
    'queen', 'river', 'sunset', 'thunder', 'umbrella', 'valley', 'whisper', 'yellow',
    'zebra', 'anchor', 'bridge', 'castle', 'diamond', 'engine', 'falcon', 'garden',
    'helmet', 'igloo', 'jacket', 'koala', 'lantern', 'marble', 'ninja', 'orange',
    'penguin', 'quartz', 'rocket', 'silver', 'tiger', 'unicorn', 'violet', 'winter'
  ];

  const randomValues = crypto.getRandomValues(new Uint32Array(wordCount));
  const selectedWords: string[] = [];
  
  for (let i = 0; i < wordCount; i++) {
    const word = words[randomValues[i] % words.length];
    // Capitalize first letter
    selectedWords.push(word.charAt(0).toUpperCase() + word.slice(1));
  }

  return selectedWords.join('-');
}

/**
 * Generate a numeric PIN
 */
export function generateNumericPin(length: number = 12): string {
  const randomValues = crypto.getRandomValues(new Uint32Array(length));
  let pin = '';
  
  for (let i = 0; i < length; i++) {
    pin += (randomValues[i] % 10).toString();
  }

  return pin;
}
