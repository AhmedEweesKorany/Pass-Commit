# PassCommit - Secure Password Manager

A Chrome extension password manager with end-to-end encryption, Google OAuth authentication, and smart auto-fill capabilities.

## 🔐 Features

- **End-to-End Encryption**: Your passwords are encrypted client-side before being stored
- **Google Sign-In**: Seamless authentication using your Google account
- **Master Password**: Additional layer of security with PBKDF2 key derivation
- **Smart Auto-Fill**: Detects login forms and auto-fills credentials
- **Password Generator**: Strong, memorable, and numeric password presets
- **Cross-Device Sync**: Sync encrypted vault across devices via backend

## 🏗️ Project Structure

```
pass-commit/
├── extension/    # Chrome Extension (React + TypeScript + Tailwind)
├── backend/      # NestJS API (MongoDB, JWT, Google OAuth)
└── shared/       # Shared TypeScript types
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google Cloud Console project (for OAuth)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and Google OAuth credentials
npm run start:dev
```

### 2. Extension Setup

```bash
cd extension
npm install
npm run dev
```

### 3. Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

## 🔧 Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API" and "Google Identity Toolkit API"
4. Create OAuth 2.0 credentials
5. Add your extension ID to authorized origins
6. Update `extension/public/manifest.json` with your client ID
7. Update `backend/.env` with your client ID and secret

### MongoDB Setup

**Local:**
```
MONGODB_URI=mongodb://localhost:27017/passcommit
```

**MongoDB Atlas (Free tier):**
```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.xxxxx.mongodb.net/passcommit
```

## 🔒 Security Architecture

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
│                     Backend (Render)                       │
│   Stores ONLY encrypted data - cannot decrypt passwords   │
└───────────────────────────────────────────────────────────┘
```

## 📂 Key Files

### Extension
- `src/popup/Popup.tsx` - Main popup UI
- `src/options/Options.tsx` - Settings page
- `src/background/background.ts` - Service worker
- `src/content/content.ts` - Form detection & auto-fill
- `src/utils/crypto.ts` - Encryption utilities
- `src/utils/storage.ts` - Chrome storage wrapper

### Backend
- `src/auth/` - Google OAuth & JWT authentication
- `src/vault/` - Encrypted credential storage
- `src/users/` - User management

## 📝 Environment Variables

### Backend (.env)
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/passcommit
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

## 🧪 Development

```bash
# Extension (with hot reload)
cd extension && npm run dev

# Backend (with watch mode)
cd backend && npm run start:dev

# Build for production
cd extension && npm run build
cd backend && npm run build
```

## 📜 License

MIT
