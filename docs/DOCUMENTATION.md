# PassCommit - Complete Documentation

> A secure password manager Chrome extension with end-to-end encryption, Google OAuth authentication, and smart auto-fill capabilities.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation & Setup](#installation--setup)
5. [Usage Guide](#usage-guide)
6. [API Reference](#api-reference)
7. [Security](#security)
8. [Troubleshooting](#troubleshooting)

---

## Overview

PassCommit is a Chrome extension password manager that prioritizes security through client-side encryption. Your passwords are encrypted locally before being stored, meaning even the server cannot read your credentials.

### Technology Stack

| Component | Technology |
|-----------|------------|
| Extension | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | NestJS, MongoDB, Passport.js |
| Authentication | Google OAuth 2.0, JWT |
| Encryption | Web Crypto API (PBKDF2 + AES-GCM) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Chrome Extension                             │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Popup   │    │ Options  │    │Background│    │ Content  │  │
│  │   UI     │    │   Page   │    │ Service  │    │  Script  │  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘  │
│       │               │               │               │         │
│       └───────────────┴───────┬───────┴───────────────┘         │
│                               │                                  │
│                     ┌─────────▼─────────┐                       │
│                     │   Crypto Utils    │                       │
│                     │  (PBKDF2/AES-GCM) │                       │
│                     └─────────┬─────────┘                       │
└───────────────────────────────┼─────────────────────────────────┘
                                │ Encrypted Data Only
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                     Backend API (NestJS)                       │
│                                                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │    Auth     │    │    Vault    │    │    Users    │       │
│  │   Module    │    │   Module    │    │   Module    │       │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘       │
│         └──────────────────┼──────────────────┘               │
│                            ▼                                   │
│                     ┌─────────────┐                           │
│                     │   MongoDB   │                           │
│                     └─────────────┘                           │
└───────────────────────────────────────────────────────────────┘
```

### Project Structure

```
pass-commit/
├── extension/           # Chrome Extension
│   ├── src/
│   │   ├── popup/       # Main popup UI
│   │   ├── options/     # Settings page
│   │   ├── background/  # Service worker
│   │   ├── content/     # Form detection & auto-fill
│   │   ├── utils/       # Crypto & storage utilities
│   │   └── types/       # TypeScript definitions
│   └── public/          # Static assets & manifest
├── backend/             # NestJS API
│   └── src/
│       ├── auth/        # Google OAuth & JWT
│       ├── vault/       # Encrypted password storage
│       └── users/       # User management
└── shared/              # Shared TypeScript types
```

---

## Features

### 1. Google OAuth Authentication

Secure sign-in using your Google account. No separate password required for the extension itself.

**How it works:**
1. Click "Sign in with Google" in the popup
2. Authorize PassCommit to access your basic profile
3. A JWT token is generated for API authentication
4. Your session persists across browser restarts

### 2. Master Password Protection

An additional layer of security that encrypts all your stored passwords.

**Key Details:**
- Uses PBKDF2 with 600,000 iterations (OWASP recommended)
- Derives a 256-bit AES-GCM encryption key
- Master password is **never stored** - only the salt is saved
- Session key persists for 30 days for convenience

**Setting Up:**
1. After Google sign-in, you'll be prompted to create a master password
2. Enter a strong, unique password (minimum 8 characters)
3. This password encrypts/decrypts all your credentials

### 3. Password Vault Management

Store, organize, and manage your credentials securely.

**Operations:**

| Action | Description |
|--------|-------------|
| **Add** | Save new credentials with domain, username, password, and notes |
| **Edit** | Update any credential field |
| **Delete** | Remove credentials (with confirmation) |
| **Search** | Find credentials by domain or username |
| **Copy** | Quick copy username or password to clipboard |

**Credential Fields:**
- **Domain**: Website URL (e.g., github.com)
- **Username**: Your login username or email
- **Password**: Encrypted and stored securely
- **Notes**: Optional additional information

### 4. Smart Auto-Fill

Automatically detects login forms and fills in your credentials.

**How It Works:**
1. PassCommit's content script scans pages for login forms
2. Detects username fields (email, username inputs)
3. Detects password fields
4. Shows a key icon indicator on detected fields
5. Click the indicator to see matching credentials
6. Select credentials to auto-fill the form

**Supported Form Types:**
- Standard login forms
- Two-page login flows (Google, Microsoft style)
- Single Sign-On portals
- Password change forms

### 5. Password Generator

Generate strong, unique passwords with customizable options.

**Generator Types:**

| Type | Description | Example |
|------|-------------|---------|
| **Strong** | Random characters | `K#9mP$2nL@xQ` |
| **Memorable** | Word-based | `Tiger-Ocean-Planet-Garden` |
| **Numeric** | Numbers only (for PINs) | `847291635024` |

**Strong Password Options:**
- Length: 8-128 characters
- Include uppercase (A-Z)
- Include lowercase (a-z)
- Include numbers (0-9)
- Include symbols (!@#$%^&*)
- Exclude ambiguous characters (l, 1, I, O, 0)

### 6. Import & Export

Transfer your passwords to and from PassCommit.

**Export Formats:**
- **JSON**: Full export with all metadata
- **CSV**: Compatible with other password managers

**Import Formats:**
- **JSON**: Re-import PassCommit exports
- **CSV**: Import from other password managers (Chrome, LastPass, 1Password, etc.)

**CSV Format Expected:**
```csv
domain,username,password,notes
example.com,user@email.com,mypassword123,Optional notes
```

### 7. Change Master Password

Update your master password while preserving all credentials.

**Process:**
1. Go to Options → Security
2. Enter your current master password
3. Enter and confirm your new master password
4. All credentials are re-encrypted with the new key

### 8. Auto-Lock & Session Management

Automatic security features to protect your vault.

**Features:**
- **Auto-lock**: Vault locks after 5 minutes of inactivity
- **Manual lock**: Lock button in popup header
- **Session persistence**: Stay signed in for 30 days
- **Full logout**: Clears all local data

---

## Installation & Setup

### Prerequisites

- **Node.js** 18 or higher
- **MongoDB** (local or Atlas cloud)
- **Google Cloud Console** project with OAuth credentials

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration:
# - MONGODB_URI=your_mongodb_connection_string
# - JWT_SECRET=your_secure_random_secret
# - GOOGLE_CLIENT_ID=your_google_client_id
# - GOOGLE_CLIENT_SECRET=your_google_client_secret

# Start development server
npm run start:dev
```

### Extension Setup

```bash
# Navigate to extension
cd extension

# Install dependencies
npm install

# Start development build with hot reload
npm run dev
```

### Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension/dist` folder
5. The PassCommit icon appears in your toolbar

### Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API** and **Google Identity Toolkit API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Chrome Extension**
6. Add your extension ID to authorized origins
7. Copy the Client ID to:
   - `extension/public/manifest.json` → `oauth2.client_id`
   - `backend/.env` → `GOOGLE_CLIENT_ID`
8. Copy the Client Secret to `backend/.env` → `GOOGLE_CLIENT_SECRET`

---

## Usage Guide

### First Time Setup

1. **Click the PassCommit icon** in Chrome toolbar
2. **Sign in with Google** - Click the button and authorize
3. **Create Master Password** - Enter a strong password you'll remember
4. **Ready to use!** - Start adding your credentials

### Daily Usage

#### Adding a New Credential

1. In the popup, click the **+** button
2. Or go to **Options** → **Vault** → **Add New**
3. Fill in:
   - Domain (e.g., `github.com`)
   - Username
   - Password (or click **Generate** for a new one)
   - Notes (optional)
4. Click **Save**

#### Auto-Filling Credentials

1. Navigate to a login page
2. Click the **key icon** that appears in the username/password field
3. Select your saved credentials from the dropdown
4. Credentials are automatically filled

#### Using Password Generator

**In Popup (Quick Generate):**
1. Click the **dice icon** or generator section
2. Choose preset: Strong, Memorable, or Numeric
3. Click to copy the generated password

**In Options (Custom Generate):**
1. Go to **Options** → **Generator**
2. Customize all options
3. Click **Generate**
4. Copy or use the password

#### Exporting Your Passwords

1. Go to **Options** → **Import/Export**
2. Choose format: **JSON** or **CSV**
3. Click **Export**
4. File downloads to your computer

#### Importing Passwords

1. Go to **Options** → **Import/Export**
2. Click **Import**
3. Select your file (JSON or CSV)
4. Credentials are added to your vault

### Locking & Unlocking

**To Lock:**
- Click the **lock icon** in popup header
- Or wait for auto-lock (5 minutes inactivity)

**To Unlock:**
- Enter your master password when prompted

### Logging Out

1. Click **Settings** (gear icon) in popup header
2. Click **Logout**
3. All local data is cleared
4. You'll need to sign in again

---

## API Reference

### Base URL
```
http://localhost:3001/api
```

### Authentication

All vault endpoints require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

### Endpoints

#### POST `/auth/google`
Authenticate with Google token.

**Request:**
```json
{
  "token": "google_access_token"
}
```

**Response:**
```json
{
  "accessToken": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

---

#### GET `/vault`
Get all vault entries for authenticated user.

**Response:**
```json
[
  {
    "_id": "entry_id",
    "userId": "user_id",
    "domain": "example.com",
    "username": "user@email.com",
    "encryptedPassword": {
      "ciphertext": "...",
      "iv": "...",
      "salt": "..."
    },
    "notes": "optional notes",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

---

#### POST `/vault`
Create a new vault entry.

**Request:**
```json
{
  "domain": "example.com",
  "username": "user@email.com",
  "encryptedPassword": {
    "ciphertext": "...",
    "iv": "...",
    "salt": "..."
  },
  "notes": "optional"
}
```

---

#### PUT `/vault/:id`
Update a vault entry.

---

#### DELETE `/vault/:id`
Delete a vault entry.

---

#### GET `/vault/search?domain=example.com`
Search entries by domain.

---

#### POST `/vault/bulk`
Create multiple vault entries.

---

#### DELETE `/vault`
Delete all entries for user.

---

## Security

### Encryption Details

| Parameter | Value |
|-----------|-------|
| Key Derivation | PBKDF2-SHA256 |
| Iterations | 600,000 |
| Salt Length | 16 bytes |
| Encryption | AES-256-GCM |
| IV Length | 12 bytes |

### Security Principles

1. **Zero-Knowledge**: Server never sees plaintext passwords
2. **Client-Side Encryption**: All encryption happens in your browser
3. **No Master Password Storage**: Only the salt is stored, not the password
4. **Secure Key Derivation**: OWASP-recommended PBKDF2 parameters
5. **Authenticated Encryption**: AES-GCM provides integrity verification
6. **Transport Security**: All API calls use HTTPS

### Best Practices

- Use a **strong, unique master password**
- **Never share** your master password
- **Enable 2FA** on your Google account
- **Export backups** regularly
- **Lock your vault** when not in use

---

## Troubleshooting

### Extension Won't Load

1. Ensure you're loading from `extension/dist` (not `extension/`)
2. Run `npm run dev` or `npm run build` first
3. Check for errors in Chrome's extension details page

### "Invalid Google Token" Error

1. Verify Google OAuth credentials in manifest.json
2. Check that extension ID matches authorized origins
3. Ensure APIs are enabled in Google Cloud Console

### Master Password Not Working

1. Enter password carefully (case-sensitive)
2. If forgotten, you must logout and lose stored passwords
3. There's no recovery mechanism by design

### Auto-Fill Not Detecting Forms

1. Refresh the page
2. Some custom login forms may not be detected
3. Use manual copy/paste as fallback

### Sync Issues

1. Check backend is running (`npm run start:dev`)
2. Verify MongoDB connection
3. Check browser console for network errors

---

## Version History

| Version | Changes |
|---------|---------|
| 1.0.0 | Initial release with core features |

---

*PassCommit - Your passwords, secured by design.*
