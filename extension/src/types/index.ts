// Credential stored in vault
export interface Credential {
  id: string;
  domain: string;
  username: string;
  encryptedPassword: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  favicon?: string;
}

// User data
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  hasMasterPassword: boolean;
}

// Encrypted data structure
export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
}

// Password generator options
export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

// Generator presets
export type GeneratorPreset = 'strong' | 'memorable' | 'numeric' | 'custom';

// Chrome message types
export type MessageType = 
  | 'GET_CREDENTIALS'
  | 'SAVE_CREDENTIAL'
  | 'UPDATE_CREDENTIAL'
  | 'DELETE_CREDENTIAL'
  | 'AUTOFILL'
  | 'GENERATE_PASSWORD'
  | 'GET_AUTH_STATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SET_MASTER_PASSWORD'
  | 'CHANGE_MASTER_PASSWORD'
  | 'UNLOCK_VAULT'
  | 'LOCK_VAULT'
  | 'EXPORT_VAULT'
  | 'EXPORT_VAULT_CSV'
  | 'IMPORT_VAULT'
  | 'GET_DECRYPTED_PASSWORD'
  | 'GET_CREDENTIALS_FOR_DOMAIN';

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form detection
export interface DetectedForm {
  usernameField: HTMLInputElement | null;
  passwordField: HTMLInputElement | null;
  domain: string;
}
