# PassCommit - Complete Documentation

A secure password manager Chrome extension with end-to-end encryption, Google OAuth authentication, and smart auto-fill capabilities.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation & Setup](#installation--setup)
5. [Usage Guide](#usage-guide)
6. [Security](#security)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## Overview

PassCommit is a Chrome extension password manager that prioritizes security through client-side encryption. Your passwords are encrypted on your device before being stored, meaning even the server cannot read your credentials.

### Key Principles

- **Zero-Knowledge Architecture**: Server stores only encrypted data
- **Client-Side Encryption**: All encryption/decryption happens in your browser
- **Master Password**: Never leaves your device or gets transmitted
- **Open Source**: Full transparency in security implementation

---

## Architecture

### Project Structure

```
pass-commit/
├── extension/          # Chrome Extension (React + TypeScript + Tailwind)
│   ├── src/
│   │   ├── popup/      # Main extension popup UI
│   │   ├── options/    # Full-page settings & vault management
│   │   ├── background/ # Service worker for coordination
│   │   ├── content/    # Form detection & auto-fill
│   │   ├── utils/      # Crypto & storage utilities
│   │   └── types/      # TypeScript interfaces
│   └── public/         # Manifest & static assets
├── backend/            # NestJS API (MongoDB, JWT, Google OAuth)
│   └── src/
│       ├── auth/       # Google OAuth & JWT authentication
│       ├── vault/      # Encrypted credential storage
│       └── users/      # User management
└── shared/             # Shared TypeScript types
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Extension UI | React 18, TypeScript, Tailwind CSS |
| Build Tool | Vite |
| Backend | NestJS (Node.js) |
| Database | MongoDB |
| Authentication | Google OAuth 2.0, JWT |
| Encryption | Web Crypto API (PBKDF2 + AES-GCM) |

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
│  ┌─────────────┐     ┌─────────────┐     ┌──────────────┐  │
│  │   Master    │ ──→ │   PBKDF2    │ ──→ │  Encryption  │  │
│  │  Password   │     │   600,000   │     │    Key       │  │
│  │  (never     │     │ iterations  │     │  (AES-GCM)   │  │
│  │   stored)   │     └─────────────┘     └──────────────┘  │
│  └─────────────┘                                │           │
│                                                 ↓           │
│                              ┌──────────────────────────┐   │
│                              │  Encrypted Credentials   │   │
│                              └────────────┬─────────────┘   │
└───────────────────────────────────────────┼─────────────────┘
                                            │
                                            ↓
┌───────────────────────────────────────────────────────────┐
│                     Backend (MongoDB)                      │
│   Stores ONLY encrypted data - cannot decrypt passwords   │
└───────────────────────────────────────────────────────────┘
```

---

## Features

### 1. Google OAuth Authentication

Sign in seamlessly using your Google account. No separate account creation required.

**How it works:**
1. Click "Sign in with Google" in the extension popup
2. Authorize PassCommit in the Google consent screen
3. Your account is created/linked automatically

**Benefits:**
- No passwords to remember for PassCommit itself
- Leverages Google's security infrastructure
- Easy cross-device account access

---

### 2. Master Password & Vault Encryption

Your vault is protected by a master password that you set after first login.

**Encryption Details:**
- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Derivation**: PBKDF2 with 600,000 iterations (OWASP recommended)
- **Salt**: 16 bytes, cryptographically random
- **IV**: 12 bytes, unique per encryption

**Important:**
- Master password is **never** stored or transmitted
- If forgotten, vault cannot be recovered (by design)
- Session persists for 30 days (auto-lock after 5 minutes of inactivity)

---

### 3. Password Vault Management

Store, organize, and manage all your credentials in one secure place.

**Features:**
- Add new credentials (domain, username, password, notes)
- Edit existing credentials
- Delete credentials
- Search by domain or username
- View password (with visibility toggle)
- Copy password to clipboard

**Credential Fields:**
| Field | Description | Required |
|-------|-------------|----------|
| Domain | Website URL (e.g., github.com) | Yes |
| Username | Login username or email | Yes |
| Password | Account password (encrypted) | Yes |
| Notes | Additional information | No |

---

### 4. Smart Auto-Fill

PassCommit automatically detects login forms and offers to fill your credentials.

**How it works:**
1. Visit a website with a login form
2. PassCommit icon appears in username/password fields
3. Click the icon to see matching credentials
4. Select a credential to auto-fill

**Supported Form Detection:**
- Standard login forms
- Email + password combinations
- Username + password combinations
- Dynamically loaded forms (SPA support)

**Credential Capture:**
- Detects form submissions
- Prompts to save new credentials
- Works with most login forms

---

### 5. Password Generator

Generate strong, unique passwords with multiple presets.

#### Strong Password
Cryptographically secure random characters.

**Options:**
- Length: 8-64 characters (default: 16)
- Uppercase letters (A-Z)
- Lowercase letters (a-z)
- Numbers (0-9)
- Symbols (!@#$%^&*...)
- Exclude ambiguous characters (l, 1, I, O, 0)

**Example:** `K9#mPx$2nQwR4vLs`

#### Memorable Password
Easy-to-remember word combinations.

**Format:** `Word-Word-Word-Word`

**Example:** `Sunset-Galaxy-Tiger-Ocean`

#### Numeric PIN
Numbers only for PIN codes.

**Length:** 4-12 digits

**Example:** `847293615204`

---

### 6. Import & Export

Transfer your passwords to/from other password managers.

#### Export
Download your vault in JSON or CSV format.

**JSON Format:**
```json
[
  {
    "domain": "github.com",
    "username": "user@email.com",
    "password": "decrypted-password",
    "notes": "Personal account"
  }
]
```

**CSV Format:**
```csv
domain,username,password,notes
github.com,user@email.com,decrypted-password,Personal account
```

#### Import
Import passwords from other managers.

**Supported Formats:**
- JSON (PassCommit format)
- CSV (with headers: domain, username, password, notes)

**Steps:**
1. Go to Options page → Import/Export section
2. Click "Import" and select your file
3. New credentials are added to your vault

---

### 7. Change Master Password

Update your master password while preserving all credentials.

**Process:**
1. Go to Options page → Security section
2. Enter current master password
3. Enter new master password (twice for confirmation)
4. All credentials are re-encrypted with the new key

**Requirements:**
- Minimum 8 characters
- Must know current password

---

### 8. Auto-Lock & Session Management

Security features to protect your vault.

**Auto-Lock:**
- Vault locks after 5 minutes of inactivity
- Requires master password to unlock

**Session Persistence:**
- Stay logged in option (30-day session)
- Session key stored securely
- Can manually lock anytime

---

## Installation & Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google Cloud Console project

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run start:dev
```

**Environment Variables:**
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/passcommit
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Extension Setup

```bash
cd extension
npm install
npm run dev
```

### Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

### Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Google+ API" and "Google Identity Toolkit API"
4. Create OAuth 2.0 credentials
5. Add your extension ID to authorized origins
6. Update `extension/public/manifest.json` with your client ID
7. Update `backend/.env` with credentials

---

## Usage Guide

### First-Time Setup

1. **Install Extension**: Load the extension in Chrome
2. **Sign In**: Click "Sign in with Google"
3. **Set Master Password**: Create a strong master password
4. **Start Saving**: Add your first credential

### Daily Usage

#### Adding a New Password

**Method 1: Manual Entry**
1. Click extension icon → "Add New"
2. Fill in domain, username, password
3. Click "Save"

**Method 2: Auto-Capture**
1. Log into a website normally
2. PassCommit prompts to save
3. Click "Save" in the prompt

#### Auto-Filling Passwords

1. Navigate to a login page
2. Click the PassCommit icon in a form field
3. Select the credential to fill
4. Form is auto-filled

#### Viewing/Copying Passwords

1. Click extension icon
2. Find the credential
3. Click eye icon to reveal password
4. Click copy icon to copy to clipboard

### Options Page

Access full vault management:
1. Click extension icon
2. Click gear (⚙️) icon
3. Or right-click extension → "Options"

**Available Sections:**
- Vault: Full credential management
- Generator: Password generation tools
- Import/Export: Backup & restore
- Security: Change master password

---

## Security

### Encryption Implementation

```typescript
// Key Derivation (PBKDF2)
const key = await crypto.subtle.deriveKey(
  {
    name: 'PBKDF2',
    salt: salt,
    iterations: 600000,  // OWASP recommended
    hash: 'SHA-256',
  },
  passwordKey,
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

// Encryption (AES-256-GCM)
const ciphertext = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: iv },
  key,
  data
);
```

### Security Best Practices

1. **Never reuse your master password** elsewhere
2. **Enable 2FA on your Google account**
3. **Lock vault** when leaving computer
4. **Export backups** periodically
5. **Use strong generated passwords** for all accounts

### What We Store

| Data | Location | Encrypted |
|------|----------|-----------|
| Google ID | Server | No (identifier) |
| Email | Server | No (identifier) |
| Credentials | Server | Yes (AES-256) |
| Master Password | Never | N/A |
| Encryption Key | Memory only | N/A |

---

## API Reference

### Authentication

#### POST `/api/auth/google`
Authenticate with Google token.

**Request:**
```json
{
  "token": "google-oauth-token"
}
```

**Response:**
```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@email.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

### Vault Operations

All vault endpoints require JWT authentication.

#### GET `/api/vault`
Get all credentials for authenticated user.

#### POST `/api/vault`
Create new credential.

**Request:**
```json
{
  "domain": "example.com",
  "username": "user@email.com",
  "encryptedPassword": {
    "ciphertext": "base64...",
    "iv": "base64...",
    "salt": "base64..."
  },
  "notes": "Optional notes"
}
```

#### PUT `/api/vault/:id`
Update credential.

#### DELETE `/api/vault/:id`
Delete credential.

#### GET `/api/vault/search?domain=example.com`
Search credentials by domain.

#### POST `/api/vault/bulk`
Bulk create credentials.

#### DELETE `/api/vault`
Delete all credentials for user.

---

## Troubleshooting

### Extension Won't Load

**Solution:**
1. Ensure you ran `npm run dev` in the extension folder
2. Verify `dist` folder exists
3. Check Chrome's extension errors page

### "Invalid Google Token" Error

**Solution:**
1. Verify Google Client ID matches in manifest and backend
2. Check extension ID is in authorized origins
3. Ensure Google APIs are enabled

### Vault Not Unlocking

**Solution:**
1. Ensure correct master password
2. Clear extension storage and re-setup
3. Check browser console for errors

### Auto-Fill Not Working

**Solution:**
1. Refresh the page
2. Ensure vault is unlocked
3. Check if domain matches saved credential
4. Some sites block content scripts

### Sync Issues

**Solution:**
1. Ensure backend is running
2. Check network connection
3. Verify JWT token is valid
4. Re-login if necessary

---

## License

MIT License - See LICENSE file for details.
