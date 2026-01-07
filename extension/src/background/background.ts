/**
 * PassCommit Background Service Worker
 * Handles authentication, vault management, and auto-fill coordination
 */

import { Message, AuthState, Credential, User } from '../types';
import {
  saveAuthState,
  getAuthState,
  clearAuthState,
  initializeVault,
  unlockVault,
  lockVault,
  isVaultUnlocked,
  getVault,
  addCredential,
  updateCredential,
  deleteCredential,
  findCredentialsByDomain,
  hasMasterPassword,
  getSessionKey,
  getSessionSalt,
  setSalt,
  saveVault,
  hydrateVaultSession,
} from '../utils/storage';


import { encrypt, decrypt, arrayBufferToBase64 } from '../utils/crypto';

// API Base URL (will be configured for production)
const API_BASE_URL = 'http://localhost:3001/api';

// Helper for authenticated API calls
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const authState = await getAuthState();
  const headers = {
    'Content-Type': 'application/json',
    ...(authState?.token ? { Authorization: `Bearer ${authState.token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      await clearAuthState();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {

  handleMessage(message)
    .then(sendResponse)
    .catch((error) => {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    });
  return true; // Keep the message channel open for async response
});

async function handleMessage(message: Message): Promise<unknown> {
  // Ensure session is hydrated for vault operations
  const vaultOps = [
    'GET_CREDENTIALS', 'SAVE_CREDENTIAL', 'UPDATE_CREDENTIAL', 'DELETE_CREDENTIAL',
    'EXPORT_VAULT', 'EXPORT_VAULT_CSV', 'IMPORT_VAULT', 'AUTOFILL', 'GET_DECRYPTED_PASSWORD'
  ];
  
  if (vaultOps.includes(message.type)) {
    await hydrateVaultSession();
  }

  switch (message.type) {
    case 'GET_AUTH_STATE':
      return handleGetAuthState();

    case 'LOGIN':
      return handleLogin();

    case 'LOGOUT':
      return handleLogout();

    case 'SET_MASTER_PASSWORD':
      return handleSetMasterPassword(message.payload as { masterPassword: string });

    case 'UNLOCK_VAULT':
      return handleUnlockVault(message.payload as { masterPassword: string });

    case 'LOCK_VAULT':
      return handleLockVault();


    case 'GET_CREDENTIALS':
      return handleGetCredentials();

    case 'SAVE_CREDENTIAL':
      return handleSaveCredential(message.payload as Partial<Credential>);

    case 'UPDATE_CREDENTIAL':
      return handleUpdateCredential(message.payload as { id: string } & Partial<Credential>);

    case 'DELETE_CREDENTIAL':
      return handleDeleteCredential(message.payload as { id: string });

    case 'EXPORT_VAULT':
      return handleExportVault();

    case 'EXPORT_VAULT_CSV':
      return handleExportVaultCSV();

    case 'IMPORT_VAULT':
      return handleImportVault(message.payload as { data: string; format: 'json' | 'csv' });

    case 'CHANGE_MASTER_PASSWORD':
      return handleChangeMasterPassword(message.payload as { currentPassword: string; newPassword: string });

    case 'AUTOFILL':
      return handleAutoFill(message.payload as { credentialId: string });

    case 'GET_DECRYPTED_PASSWORD':
      return handleGetDecryptedPassword(message.payload as { credentialId: string });

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

async function handleGetAuthState() {
  await hydrateVaultSession(); // Try to restore session if worker restarted
  const authState = await getAuthState();
  const isUnlocked = isVaultUnlocked();

  const hasMaster = await hasMasterPassword();
  
  let credentials: Credential[] = [];
  if (isUnlocked) {
    credentials = (await getVault()) || [];
  }

  return {
    success: true,
    data: {
      authState: authState ? { ...authState, hasMasterPassword: hasMaster } : null,
      isUnlocked,
      credentials,
    },
  };
}

async function handleLogin() {
  try {
    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2?.client_id;
    const scopes = manifest.oauth2?.scopes?.join(' ');
    const redirectUri = chrome.identity.getRedirectURL();
    console.log('OAuth Redirect URI:', redirectUri); // Copy this URI to Google Cloud Console

    const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
    authUrl.searchParams.set('client_id', clientId!);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes!);

    // Use launchWebAuthFlow for a more robust login experience
    const responseUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive: true,
        },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (responseUrl) {
            resolve(responseUrl);
          } else {
            reject(new Error('Login failed: No response URL received'));
          }
        }
      );
    });

    // Extract the token from the URL hash
    const url = new URL(responseUrl);
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const authToken = hashParams.get('access_token');

    if (!authToken) {
      throw new Error('Failed to extract access token from response');
    }

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userInfoResponse.json();

    const user: User = {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    };

    // Try to register/login with backend
    let backendToken = authToken;
    try {
      const authResult = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token: authToken }),
      });
      backendToken = authResult.accessToken;
      
      // Fetch user salt if exists
      const { salt } = await apiFetch('/users/salt', {
        headers: { Authorization: `Bearer ${backendToken}` }
      });
      
      if (salt) {
        await setSalt(salt);
      } else {
        // If backend says no salt, clear local salt to ensure 'Setup' screen shows
        await chrome.storage.local.remove('masterSalt');
      }
    } catch (e) {
      console.error('Backend authentication failed:', e);
      // If backend fails, we cannot proceed because vault ops will 401
      throw new Error('Failed to connect to security server. Please check your connection.');
    }

    // Recalculate master password status after potential salt update/clear
    const hasMaster = await hasMasterPassword();
    const authState: AuthState = {
      isAuthenticated: true,
      user,
      token: backendToken,
      hasMasterPassword: hasMaster,
    };

    await saveAuthState(authState);
    await hydrateVaultSession(); // Check if we can auto-unlock

    return { success: true, data: authState };

  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleLogout() {
  try {
    // Revoke the OAuth token
    const authState = await getAuthState();
    if (authState?.token) {
      await new Promise<void>((resolve) => {
        chrome.identity.removeCachedAuthToken({ token: authState.token! }, resolve);
      });
    }

    lockVault();
    await clearAuthState();

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleSetMasterPassword(payload: { masterPassword: string }) {
  try {
    await initializeVault(payload.masterPassword);
    
    // Sync salt to backend
    const salt = await getSessionSalt();
    if (salt) {
      try {
        await apiFetch('/users/salt', {
          method: 'POST',
          body: JSON.stringify({ salt: arrayBufferToBase64(salt) }),
        });
      } catch (e) {
        console.error('Failed to sync salt to backend', e);
      }
    }

    // Update auth state
    const authState = await getAuthState();
    if (authState) {
      await saveAuthState({ ...authState, hasMasterPassword: true });
    }

    return { success: true };
  } catch (error) {
    console.error('Set master password error:', error);
    return { success: false, error: (error as Error).message };
  }
}


async function handleUnlockVault(payload: { masterPassword: string }) {
  try {
    const success = await unlockVault(payload.masterPassword);
    
    if (!success) {
      return { success: false, error: 'Invalid master password' };
    }

    // Sync vault from backend after unlock
    try {
      const backendVault = await apiFetch('/vault');
      if (backendVault && Array.isArray(backendVault)) {
        // Transform backend format to extension format
        const credentials: Credential[] = backendVault.map((entry: any) => ({
          id: entry._id || entry.id,
          domain: entry.domain,
          username: entry.username,
          encryptedPassword: JSON.stringify(entry.encryptedPassword),
          notes: entry.notes,
          createdAt: new Date(entry.createdAt).getTime(),
          updatedAt: new Date(entry.updatedAt).getTime(),
        }));
        await saveVault(credentials);
      }
    } catch (e) {
      console.warn('Failed to sync vault from backend', e);
    }

    return { success: true };
  } catch (error) {
    console.error('Unlock vault error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleLockVault() {
  lockVault();
  return { success: true };
}


async function handleGetCredentials() {
  try {
    const credentials = await getVault();
    return { success: true, data: credentials };
  } catch (error) {
    console.error('Get credentials error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleSaveCredential(payload: Partial<Credential>) {
  try {
    const key = getSessionKey();
    const salt = getSessionSalt();
    
    if (!key || !salt) {
      return { success: false, error: 'Vault is locked' };
    }

    // Encrypt the password before storing
    const encryptedPassword = await encrypt(payload.encryptedPassword || '', key, salt);
    
    const credentialData = {
      domain: payload.domain || '',
      username: payload.username || '',
      encryptedPassword: JSON.stringify(encryptedPassword),
      notes: payload.notes,
    };

    console.log('=== SAVE CREDENTIAL DEBUG ===');
    console.log('Credential data to save:', credentialData);
    console.log('Encrypted password object:', encryptedPassword);

    // Sync to backend FIRST to get the real ID
    let backendId: string | null = null;
    try {
      const requestBody = {
        domain: credentialData.domain,
        username: credentialData.username,
        encryptedPassword, // Send actual object to backend (not stringified)
        notes: credentialData.notes,
      };
      console.log('Sending to backend:', JSON.stringify(requestBody, null, 2));
      
      const backendResult = await apiFetch('/vault', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      console.log('Backend result:', backendResult);
      backendId = backendResult._id || backendResult.id;
      console.log('Got backend ID:', backendId);
    } catch (e: any) {
      console.error('Failed to sync credential to backend:', e);
      console.error('Error details:', e.message);
    }

    // Save locally with the backend ID if available
    const credential = await addCredential({
      ...credentialData,
    }, backendId || undefined);

    console.log('Saved credential locally:', credential);
    return { success: true, data: credential };

  } catch (error) {
    console.error('Save credential error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleUpdateCredential(payload: { id: string } & Partial<Credential>) {
  try {
    const key = getSessionKey();
    const salt = getSessionSalt();
    
    if (!key || !salt) {
      return { success: false, error: 'Vault is locked' };
    }

    let encryptedPassword = payload.encryptedPassword;
    let encryptedData = null;

    // If password was updated, encrypt it
    if (payload.encryptedPassword && !payload.encryptedPassword.startsWith('{')) {
       encryptedData = await encrypt(payload.encryptedPassword, key, salt);
       encryptedPassword = JSON.stringify(encryptedData);
    }

    const updates = {
      ...payload,
      encryptedPassword,
    };

    // Update locally
    const credential = await updateCredential(payload.id, updates);

    // Sync to backend
    try {
      await apiFetch(`/vault/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...updates,
          encryptedPassword: encryptedData || (encryptedPassword ? JSON.parse(encryptedPassword) : undefined),
        }),
      });
    } catch (e) {
      console.error('Failed to sync update to backend', e);
    }

    return { success: true, data: credential };
  } catch (error) {
    console.error('Update credential error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleDeleteCredential(payload: { id: string }) {
  try {
    const success = await deleteCredential(payload.id);
    
    if (success) {
      // Sync to backend
      try {
        await apiFetch(`/vault/${payload.id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.error('Failed to sync delete to backend', e);
      }
    }

    return { success };
  } catch (error) {
    console.error('Delete credential error:', error);
    return { success: false, error: (error as Error).message };
  }
}


async function handleAutoFill(payload: { credentialId: string }) {
  try {
    const credentials = await getVault();
    const credential = credentials?.find((c) => c.id === payload.credentialId);

    if (!credential) {
      return { success: false, error: 'Credential not found' };
    }

    const key = getSessionKey();
    if (!key) {
      return { success: false, error: 'Vault is locked' };
    }

    // Decrypt password
    const encryptedData = JSON.parse(credential.encryptedPassword);
    const password = await decrypt(encryptedData, key);

    // Send to content script for auto-fill
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'DO_AUTOFILL',
        payload: {
          username: credential.username,
          password,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Auto-fill error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleGetDecryptedPassword(payload: { credentialId: string }) {
  try {
    const credentials = await getVault();
    const credential = credentials?.find((c) => c.id === payload.credentialId);

    if (!credential) {
      return { success: false, error: 'Credential not found' };
    }

    const key = getSessionKey();
    if (!key) {
      return { success: false, error: 'Vault is locked' };
    }

    const encryptedData = JSON.parse(credential.encryptedPassword);
    const password = await decrypt(encryptedData, key);

    return { success: true, data: password };
  } catch (error) {
    console.error('Get decrypted password error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleExportVault() {
  try {
    const credentials = await getVault();
    if (!credentials) return { success: false, error: 'Vault is locked' };
    
    const key = getSessionKey();
    if (!key) return { success: false, error: 'Vault is locked' };

    // Decrypt all passwords for export
    const exportedData = await Promise.all(credentials.map(async (cred) => {
      const encryptedData = JSON.parse(cred.encryptedPassword);
      const password = await decrypt(encryptedData, key);
      return {
        ...cred,
        password,
      };
    }));

    return { success: true, data: exportedData };
  } catch (error) {
    console.error('Export vault error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleExportVaultCSV() {
  try {
    const credentials = await getVault();
    if (!credentials) return { success: false, error: 'Vault is locked' };
    
    const key = getSessionKey();
    if (!key) return { success: false, error: 'Vault is locked' };

    // Decrypt all passwords for export
    const rows: string[] = ['domain,username,password,notes'];
    
    for (const cred of credentials) {
      const encryptedData = JSON.parse(cred.encryptedPassword);
      const password = await decrypt(encryptedData, key);
      // Escape CSV fields
      const escapeCsv = (str: string) => {
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      rows.push(`${escapeCsv(cred.domain)},${escapeCsv(cred.username)},${escapeCsv(password)},${escapeCsv(cred.notes || '')}`);
    }

    return { success: true, data: rows.join('\n') };
  } catch (error) {
    console.error('Export vault CSV error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleImportVault(payload: { data: string; format: 'json' | 'csv' }) {
  try {
    const key = getSessionKey();
    const salt = getSessionSalt();
    
    if (!key || !salt) {
      return { success: false, error: 'Vault is locked' };
    }

    let entries: { domain: string; username: string; password: string; notes?: string }[] = [];

    if (payload.format === 'json') {
      const parsed = JSON.parse(payload.data);
      // Handle both array and object with passwords array
      entries = Array.isArray(parsed) ? parsed : (parsed.passwords || parsed.data || []);
    } else if (payload.format === 'csv') {
      const lines = payload.data.split('\n').filter(line => line.trim());
      const header = lines[0].toLowerCase();
      
      // Find column indices
      const headers = header.split(',').map(h => h.trim().replace(/"/g, ''));
      const domainIdx = headers.findIndex(h => ['domain', 'url', 'website', 'site'].includes(h));
      const usernameIdx = headers.findIndex(h => ['username', 'user', 'login', 'email'].includes(h));
      const passwordIdx = headers.findIndex(h => ['password', 'pass', 'pwd'].includes(h));
      const notesIdx = headers.findIndex(h => ['notes', 'note', 'comment', 'comments'].includes(h));

      if (domainIdx === -1 || usernameIdx === -1 || passwordIdx === -1) {
        return { success: false, error: 'CSV must have domain, username, and password columns' };
      }

      // Parse CSV rows (simple parsing, doesn't handle all edge cases)
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > Math.max(domainIdx, usernameIdx, passwordIdx)) {
          entries.push({
            domain: values[domainIdx] || '',
            username: values[usernameIdx] || '',
            password: values[passwordIdx] || '',
            notes: notesIdx >= 0 ? values[notesIdx] : undefined,
          });
        }
      }
    }

    if (entries.length === 0) {
      return { success: false, error: 'No valid entries found in import file' };
    }

    // Import each entry
    let imported = 0;
    for (const entry of entries) {
      if (!entry.domain || !entry.username || !entry.password) continue;

      // Encrypt the password
      const encryptedPassword = await encrypt(entry.password, key, salt);
      
      const credentialData = {
        domain: entry.domain,
        username: entry.username,
        encryptedPassword: JSON.stringify(encryptedPassword),
        notes: entry.notes,
      };

      // Sync to backend first
      let backendId: string | null = null;
      try {
        const backendResult = await apiFetch('/vault', {
          method: 'POST',
          body: JSON.stringify({
            ...credentialData,
            encryptedPassword,
          }),
        });
        backendId = backendResult._id || backendResult.id;
      } catch (e) {
        console.error('Failed to sync imported credential to backend', e);
      }

      // Save locally
      await addCredential(credentialData, backendId || undefined);
      imported++;
    }

    return { success: true, data: { imported } };
  } catch (error) {
    console.error('Import vault error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

async function handleChangeMasterPassword(payload: { currentPassword: string; newPassword: string }) {
  try {
    // First verify the current password
    const currentKey = getSessionKey();
    if (!currentKey) {
      return { success: false, error: 'Vault is locked' };
    }

    // Get all credentials and decrypt them with current key
    const credentials = await getVault();
    if (!credentials) {
      return { success: false, error: 'Failed to read vault' };
    }

    // Decrypt all passwords
    const decryptedCredentials: { cred: Credential; password: string }[] = [];
    for (const cred of credentials) {
      const encryptedData = JSON.parse(cred.encryptedPassword);
      const password = await decrypt(encryptedData, currentKey);
      decryptedCredentials.push({ cred, password });
    }

    // Initialize with new password (this generates new salt and key)
    await initializeVault(payload.newPassword);
    
    const newKey = getSessionKey();
    const newSalt = getSessionSalt();

    if (!newKey || !newSalt) {
      return { success: false, error: 'Failed to create new encryption key' };
    }

    // Sync new salt to backend
    try {
      await apiFetch('/users/salt', {
        method: 'POST',
        body: JSON.stringify({ salt: arrayBufferToBase64(newSalt) }),
      });
    } catch (e) {
      console.error('Failed to sync new salt to backend', e);
    }

    // Re-encrypt all credentials with new key
    const reEncryptedCredentials: Credential[] = [];
    for (const { cred, password } of decryptedCredentials) {
      const newEncrypted = await encrypt(password, newKey, newSalt);
      reEncryptedCredentials.push({
        ...cred,
        encryptedPassword: JSON.stringify(newEncrypted),
        updatedAt: Date.now(),
      });

      // Update on backend
      try {
        await apiFetch(`/vault/${cred.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            domain: cred.domain,
            username: cred.username,
            encryptedPassword: newEncrypted,
            notes: cred.notes,
          }),
        });
      } catch (e) {
        console.error('Failed to sync re-encrypted credential to backend', e);
      }
    }

    // Save re-encrypted vault locally
    await saveVault(reEncryptedCredentials);

    // Update auth state
    const authState = await getAuthState();
    if (authState) {
      await saveAuthState({ ...authState, hasMasterPassword: true });
    }

    return { success: true };
  } catch (error) {
    console.error('Change master password error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Auto-lock vault after inactivity
let lockTimeout: ReturnType<typeof setTimeout> | null = null;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function resetLockTimeout() {
  if (lockTimeout) {
    clearTimeout(lockTimeout);
  }
  lockTimeout = setTimeout(() => {
    lockVault();
  }, LOCK_TIMEOUT_MS);
}

// Reset timeout on any user activity
chrome.runtime.onMessage.addListener(() => {
  resetLockTimeout();
});

// Initialize
console.log('PassCommit background service worker initialized');
