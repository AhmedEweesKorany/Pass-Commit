# PassCommit - Testing Documentation

This document describes how to run tests for the PassCommit password manager application and provides information about the test suites.

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Running Tests](#running-tests)
3. [Frontend Tests (Extension)](#frontend-tests-extension)
4. [Backend Tests (NestJS)](#backend-tests-nestjs)
5. [Test Coverage](#test-coverage)
6. [Expected Output](#expected-output)

---

## Test Environment Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install Dependencies

**Frontend (Extension):**
```bash
cd extension
npm install
```

**Backend:**
```bash
cd backend
npm install
```

---

## Running Tests

### Quick Commands

| Component | Command | Description |
|-----------|---------|-------------|
| Frontend | `npm run test` | Run all extension tests |
| Frontend | `npm run test -- --watch` | Run tests in watch mode |
| Frontend | `npm run test -- --coverage` | Run tests with coverage |
| Backend | `npm run test` | Run all backend tests |
| Backend | `npm run test -- --watch` | Run tests in watch mode |
| Backend | `npm run test -- --coverage` | Run tests with coverage |

---

## Frontend Tests (Extension)

**Test Framework:** Vitest  
**Environment:** jsdom (browser simulation)

### Test Files

| File | Description | Tests |
|------|-------------|-------|
| `src/utils/crypto.test.ts` | Cryptographic utilities tests | 36 |
| `src/test/content.test.ts` | Content script tests (password suggestion, form detection) | 25 |

### Test Categories

#### Crypto Utilities (`crypto.test.ts`)

1. **generateSalt**
   - Generates Uint8Array of correct length (16 bytes)
   - Produces unique salts each time

2. **arrayBufferToBase64 / base64ToArrayBuffer**
   - Converts Uint8Array to base64 and back
   - Handles empty arrays
   - Handles binary data with all byte values

3. **deriveKey**
   - Derives CryptoKey from password and salt
   - Produces same key from same inputs
   - Produces different keys from different passwords
   - Produces different keys from different salts

4. **encrypt / decrypt**
   - Encrypts and decrypts data correctly
   - Uses unique IVs for each encryption
   - Handles empty strings
   - Handles long strings (10,000+ characters)
   - Handles special characters (Unicode, emojis)
   - Handles JSON data
   - Fails to decrypt with wrong key

5. **hashPassword**
   - Hashes password to base64 string
   - Produces consistent hashes
   - Produces different hashes for different passwords

6. **generatePassword**
   - Generates password of specified length
   - Respects character set options (lowercase, uppercase, numbers, symbols)
   - Excludes ambiguous characters when specified
   - Generates unique passwords

7. **generateMemorablePassword**
   - Generates correct word count
   - Capitalizes first letter of each word
   - Uses hyphen separator

8. **generateNumericPin**
   - Generates PIN of specified length
   - Contains only digits 0-9
   - Generates unique PINs

#### Content Script Tests (`content.test.ts`) - NEW!

1. **Password Generation (generateSecurePassword)**
   - Generates password of specified length
   - Generates with default length of 16
   - Generates unique passwords each time
   - Generates with only uppercase when specified
   - Generates with only lowercase when specified
   - Generates with only numbers when specified
   - Excludes ambiguous characters (0, O, l, 1, I)
   - Falls back to alphanumeric when no options selected

2. **Memorable Password Generation (generateMemorablePasswordLocal)**
   - Generates correct number of words
   - Capitalizes first letter of each word
   - Uses hyphen as separator
   - Generates unique passwords
   - Generates with default 4 words

3. **Signup Form Detection**
   - Detects signup form with multiple password fields
   - Detects signup form with confirm password field
   - Detects signup form with new-password autocomplete
   - Detects signup form by form class
   - Detects signup form by register keyword in ID
   - Does not detect login form as signup
   - Detects signup by parent container class when no form

4. **Credential Detection**
   - Detects standard login form
   - Detects password field by autocomplete attribute
   - Detects multiple password fields in signup form

5. **Chrome Runtime Messages**
   - Sends SAVE_CREDENTIAL message with correct payload
   - Sends GET_CREDENTIALS_FOR_DOMAIN message

### Running Frontend Tests

```bash
cd extension
npm run test
```

**With verbose output:**
```bash
npx vitest run --reporter=verbose
```

---

## Backend Tests (NestJS)

**Test Framework:** Jest  
**Test Type:** Unit tests with mocked dependencies

### Test Files

| File | Description | Tests |
|------|-------------|-------|
| `src/auth/auth.service.spec.ts` | Authentication service tests | 7 |
| `src/vault/vault.service.spec.ts` | Vault service tests | 15 |
| `src/users/users.service.spec.ts` | Users service tests | 8 |

### Test Categories

#### Auth Service (`auth.service.spec.ts`)

1. **validateAccessToken**
   - Returns auth result for valid token with existing user
   - Creates new user if not found
   - Throws UnauthorizedException for invalid token
   - Throws UnauthorizedException when email not provided
   - Uses email prefix as name if name not provided

2. **validateJwtPayload**
   - Returns user for valid JWT payload
   - Returns null for non-existent user

#### Vault Service (`vault.service.spec.ts`)

1. **create**
   - Creates new vault entry with all fields

2. **findAllByUser**
   - Returns all vault entries for user
   - Returns empty array if no entries

3. **findById**
   - Returns vault entry by ID
   - Returns null if not found

4. **findByDomain**
   - Finds entries by domain
   - Normalizes domain (removes www prefix)

5. **update**
   - Updates vault entry fields
   - Returns null if entry not found

6. **delete**
   - Deletes entry and returns true
   - Returns false if not found

7. **deleteAllByUser**
   - Deletes all entries for user
   - Returns count of deleted entries

8. **bulkCreate**
   - Creates multiple vault entries at once

#### Users Service (`users.service.spec.ts`)

1. **create**
   - Creates new user with all fields
   - Creates user without optional picture

2. **findByGoogleId**
   - Finds user by Google ID
   - Returns null if not found

3. **findById**
   - Finds user by MongoDB ID
   - Returns null if not found

### Running Backend Tests

```bash
cd backend
npm run test
```

**With verbose output:**
```bash
npm run test -- --verbose
```

---

## Test Coverage

### Generate Coverage Report

**Frontend:**
```bash
cd extension
npx vitest run --coverage
```

**Backend:**
```bash
cd backend
npm run test -- --coverage
```

### Coverage Targets

| Component | Target | Focus Areas |
|-----------|--------|-------------|
| Frontend | 80%+ | Crypto utilities, Storage utilities |
| Backend | 80%+ | Services (Auth, Vault, Users) |

---

## Expected Output

### Backend Tests (All Passing)

```
 PASS  src/auth/auth.service.spec.ts
 PASS  src/vault/vault.service.spec.ts
 PASS  src/users/users.service.spec.ts

Test Suites: 3 passed, 3 total
Tests:       30 passed, 30 total
Snapshots:   0 total
Time:        3.55 s
Ran all test suites.
```

### Frontend Tests (All Passing)

```
 ✓ src/utils/crypto.test.ts (25 tests) 1234ms

 Test Files  1 passed (1)
      Tests  25 passed (25)
   Start at  12:00:00
   Duration  2.5s
```

### Test Summary

| Component | Test Suites | Tests | Status |
|-----------|-------------|-------|--------|
| Backend | 3 | 30 | ✅ Passing |
| Frontend | 1 | 25+ | ✅ Passing |
| **Total** | **4** | **55+** | **✅ All Passing** |

---

## Troubleshooting

### Common Issues

#### "Cannot find module" Errors

Ensure all dependencies are installed:
```bash
npm install
```

#### "crypto.subtle is undefined" or "randomUUID" Type Errors
1. **Web Crypto API**: The test environment needs the Web Crypto API. Vitest with jsdom should provide this automatically in Node.js 18+.
2. **UUID Mapping**: Newer TypeScript versions require `crypto.randomUUID()` to return a specific template literal type. The test setup file (`src/test/setup.ts`) includes a mock for this that uses a type cast to ensure compatibility with consistent builds. If you encounter build errors in tests, verify this mock is correctly applied.

#### "Jest encountered an unexpected token" (Backend)

Ensure TypeScript compilation is working:
```bash
npm run build
```

#### Tests Timing Out

Increase timeout in test files:
```typescript
// Frontend (Vitest)
describe('slow tests', () => {
  it('slow test', async () => {
    // ...
  }, 30000); // 30 second timeout
});

// Backend (Jest)
jest.setTimeout(30000);
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm test

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd extension && npm ci
      - run: cd extension && npm test -- --run
```

---

## Adding New Tests

### Frontend Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureName', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = someFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Backend Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from './service.service';

describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        // Add mock providers
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should do something', async () => {
    // Arrange
    const input = { /* ... */ };
    
    // Act
    const result = await service.someMethod(input);
    
    // Assert
    expect(result).toEqual({ /* expected */ });
  });
});
```
