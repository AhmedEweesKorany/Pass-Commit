import { AuthState, Credential, EncryptedData } from '../types';
import { deriveKey, encrypt, decrypt, generateSalt, base64ToArrayBuffer, arrayBufferToBase64 } from './crypto';

/**
 * Chrome storage utilities for PassCommit
 * Handles secure storage of credentials and auth state
 */

// Storage keys
const STORAGE_KEYS = {
  AUTH_STATE: 'authState',
  VAULT: 'vault',
  SALT: 'masterSalt',
  SESSION_KEY: 'sessionKey',
  PERSISTED_KEY: 'persistedVaultKey',
  SETTINGS: 'settings',
} as const;


// In-memory session key (never persisted)
let sessionKey: CryptoKey | null = null;
let sessionSalt: Uint8Array | null = null;

/**
 * Initialize storage with master password
 */
export async function initializeVault(masterPassword: string, salt?: Uint8Array): Promise<void> {
  const finalSalt = salt || generateSalt();
  sessionSalt = finalSalt;
  sessionKey = await deriveKey(masterPassword, finalSalt);
  
  // Store the salt (not the password or key!)
  await chrome.storage.local.set({
    [STORAGE_KEYS.SALT]: arrayBufferToBase64(finalSalt),
  });

  // Export and persist the key for UX (Stay logged in)
  await persistSessionKey(sessionKey);
}

/**
 * Export and save the session key to local storage
 */
async function persistSessionKey(key: CryptoKey) {
  const exported = await crypto.subtle.exportKey('jwk', key);
  await chrome.storage.local.set({
    [STORAGE_KEYS.PERSISTED_KEY]: {
      key: exported,
      timestamp: Date.now()
    }
  });
}

/**
 * Try to reload the session key from storage (re-hydrate)
 */
export async function hydrateVaultSession(): Promise<boolean> {
  if (sessionKey) return true;

  const result = await chrome.storage.local.get([STORAGE_KEYS.PERSISTED_KEY, STORAGE_KEYS.SALT]);
  const persisted = result[STORAGE_KEYS.PERSISTED_KEY];
  const saltBase64 = result[STORAGE_KEYS.SALT];

  if (!persisted || !saltBase64) return false;

  // Check if session has expired (e.g., 30 days)
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - persisted.timestamp > THIRTY_DAYS) {
    await chrome.storage.local.remove(STORAGE_KEYS.PERSISTED_KEY);
    return false;
  }

  try {
    sessionKey = await crypto.subtle.importKey(
      'jwk',
      persisted.key,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    sessionSalt = base64ToArrayBuffer(saltBase64);
    return true;
  } catch (e) {
    console.error('Failed to hydrate vault session:', e);
    return false;
  }
}


/**
 * Manually set the salt (used for syncing from backend)
 */
export async function setSalt(saltBase64: string): Promise<void> {
  await chrome.storage.local.set({
     [STORAGE_KEYS.SALT]: saltBase64,
  });
}


/**
 * Unlock vault with master password
 */
export async function unlockVault(masterPassword: string): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SALT);
    const saltBase64 = result[STORAGE_KEYS.SALT];
    
    if (!saltBase64) {
      return false;
    }

    sessionSalt = base64ToArrayBuffer(saltBase64);
    sessionKey = await deriveKey(masterPassword, sessionSalt);
    
    // Persist for "Stay Signed In"
    await persistSessionKey(sessionKey);

    // Verify by trying to decrypt existing vault
    const vault = await getVault();
    return vault !== null;
  } catch {
    sessionKey = null;
    sessionSalt = null;
    return false;
  }
}


/**
 * Lock vault (clear session key)
 */
export function lockVault(): void {
  sessionKey = null;
  chrome.storage.local.remove('persistedVaultKey');
}


/**
 * Check if vault is unlocked
 */
export function isVaultUnlocked(): boolean {
  return sessionKey !== null;
}

/**
 * Get current encryption key
 */
export function getSessionKey(): CryptoKey | null {
  return sessionKey;
}

/**
 * Get current salt
 */
export function getSessionSalt(): Uint8Array | null {
  return sessionSalt;
}

/**
 * Save auth state
 */
export async function saveAuthState(state: AuthState): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.AUTH_STATE]: state,
  });
}

/**
 * Get auth state
 */
export async function getAuthState(): Promise<AuthState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_STATE);
  return result[STORAGE_KEYS.AUTH_STATE] || null;
}

/**
 * Clear auth state
 */
export async function clearAuthState(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.AUTH_STATE);
}

/**
 * Save encrypted vault
 */
export async function saveVault(credentials: Credential[]): Promise<void> {
  if (!sessionKey || !sessionSalt) {
    throw new Error('Vault is locked');
  }

  const encrypted = await encrypt(
    JSON.stringify(credentials),
    sessionKey,
    sessionSalt
  );

  await chrome.storage.local.set({
    [STORAGE_KEYS.VAULT]: encrypted,
  });
}

/**
 * Get decrypted vault
 */
export async function getVault(): Promise<Credential[] | null> {
  if (!sessionKey) {
    return null;
  }

  const result = await chrome.storage.local.get(STORAGE_KEYS.VAULT);
  const encrypted: EncryptedData | undefined = result[STORAGE_KEYS.VAULT];

  if (!encrypted) {
    return [];
  }

  try {
    const decrypted = await decrypt(encrypted, sessionKey);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

/**
 * Add credential to vault
 */
export async function addCredential(credential: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<Credential> {
  const vault = await getVault() || [];
  
  const newCredential: Credential = {
    ...credential,
    id: id || crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  vault.push(newCredential);
  await saveVault(vault);
  
  return newCredential;
}

/**
 * Update credential in vault
 */
export async function updateCredential(id: string, updates: Partial<Credential>): Promise<Credential | null> {
  const vault = await getVault();
  if (!vault) return null;

  const index = vault.findIndex(c => c.id === id);
  if (index === -1) return null;

  vault[index] = {
    ...vault[index],
    ...updates,
    updatedAt: Date.now(),
  };

  await saveVault(vault);
  return vault[index];
}

/**
 * Delete credential from vault
 */
export async function deleteCredential(id: string): Promise<boolean> {
  const vault = await getVault();
  if (!vault) return false;

  const index = vault.findIndex(c => c.id === id);
  if (index === -1) return false;

  vault.splice(index, 1);
  await saveVault(vault);
  return true;
}

/**
 * Find credentials by domain
 */
export async function findCredentialsByDomain(domain: string): Promise<Credential[]> {
  const vault = await getVault();
  if (!vault) return [];

  // Normalize domain for comparison
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
  
  return vault.filter(cred => {
    const credDomain = cred.domain.toLowerCase().replace(/^www\./, '');
    return credDomain === normalizedDomain || 
           credDomain.endsWith('.' + normalizedDomain) ||
           normalizedDomain.endsWith('.' + credDomain);
  });
}

/**
 * Check if master password is set
 */
export async function hasMasterPassword(): Promise<boolean> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SALT);
  return !!result[STORAGE_KEYS.SALT];
}

/**
 * Clear all storage (for logout)
 */
export async function clearAllStorage(): Promise<void> {
  sessionKey = null;
  sessionSalt = null;
  await chrome.storage.local.clear();
}
