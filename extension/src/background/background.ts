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
} from '../utils/storage';
import { encrypt, decrypt, arrayBufferToBase64 } from '../utils/crypto';

// API Base URL (will be configured for production)
const API_BASE_URL = 'http://localhost:3001/api';

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

    case 'GET_CREDENTIALS':
      return handleGetCredentials();

    case 'SAVE_CREDENTIAL':
      return handleSaveCredential(message.payload as Partial<Credential>);

    case 'DELETE_CREDENTIAL':
      return handleDeleteCredential(message.payload as { id: string });

    case 'AUTOFILL':
      return handleAutoFill(message.payload as { credentialId: string });

    case 'GET_DECRYPTED_PASSWORD':
      return handleGetDecryptedPassword(message.payload as { credentialId: string });

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

async function handleGetAuthState() {
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
    // Use Chrome Identity API for Google OAuth
    const authToken = await new Promise<string>((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error('No token received'));
        }
      });
    });

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
    try {
      await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authToken }),
      });
    } catch {
      // Backend might not be available, continue with local-only mode
      console.warn('Backend not available, using local-only mode');
    }

    const hasMaster = await hasMasterPassword();
    const authState: AuthState = {
      isAuthenticated: true,
      user,
      token: authToken,
      hasMasterPassword: hasMaster,
    };

    await saveAuthState(authState);

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

    return { success: true };
  } catch (error) {
    console.error('Unlock vault error:', error);
    return { success: false, error: (error as Error).message };
  }
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
    
    const credential = await addCredential({
      domain: payload.domain || '',
      username: payload.username || '',
      encryptedPassword: JSON.stringify(encryptedPassword),
      notes: payload.notes,
    });

    return { success: true, data: credential };
  } catch (error) {
    console.error('Save credential error:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function handleDeleteCredential(payload: { id: string }) {
  try {
    const success = await deleteCredential(payload.id);
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
