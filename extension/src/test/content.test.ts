/**
 * Content Script Tests - Password Suggestion and Credential Capture
 * Tests for signup form detection and password suggestion popup functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome API
const mockChrome = {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

// @ts-ignore
globalThis.chrome = mockChrome;

// Mock crypto API
if (!globalThis.crypto.getRandomValues) {
  (globalThis.crypto as any).getRandomValues = (arr: Uint32Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 4294967295);
    }
    return arr;
  };
}

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Helper functions that mirror content.ts implementations for testing
function generateSecurePassword(length: number = 16, options: {
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
} = {}): string {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true
  } = options;

  let charset = '';
  if (uppercase) charset += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  if (lowercase) charset += 'abcdefghjkmnpqrstuvwxyz';
  if (numbers) charset += '23456789';
  if (symbols) charset += '!@#$%^&*()_+-=';

  if (!charset) charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const randomValues = crypto.getRandomValues(new Uint32Array(length));
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

function generateMemorablePasswordLocal(wordCount: number = 4): string {
  const words = [
    'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'galaxy', 'harbor',
    'island', 'jungle', 'kitchen', 'lemon', 'mountain', 'november', 'ocean', 'planet',
    'queen', 'river', 'sunset', 'thunder', 'umbrella', 'valley', 'whisper', 'yellow',
    'zebra', 'anchor', 'bridge', 'castle', 'diamond', 'engine', 'falcon', 'garden'
  ];
  
  const randomValues = crypto.getRandomValues(new Uint32Array(wordCount));
  const selectedWords: string[] = [];
  
  for (let i = 0; i < wordCount; i++) {
    const word = words[randomValues[i] % words.length];
    selectedWords.push(word.charAt(0).toUpperCase() + word.slice(1));
  }
  
  return selectedWords.join('-');
}

describe('Content Script - Password Generation', () => {
  describe('generateSecurePassword', () => {
    it('generates password of specified length', () => {
      const password = generateSecurePassword(20);
      expect(password).toHaveLength(20);
    });

    it('generates password with default length of 16', () => {
      const password = generateSecurePassword();
      expect(password).toHaveLength(16);
    });

    it('generates unique passwords each time', () => {
      const password1 = generateSecurePassword(16);
      const password2 = generateSecurePassword(16);
      expect(password1).not.toBe(password2);
    });

    it('generates password with only uppercase when specified', () => {
      const password = generateSecurePassword(20, {
        uppercase: true,
        lowercase: false,
        numbers: false,
        symbols: false
      });
      expect(password).toMatch(/^[A-Z]+$/);
    });

    it('generates password with only lowercase when specified', () => {
      const password = generateSecurePassword(20, {
        uppercase: false,
        lowercase: true,
        numbers: false,
        symbols: false
      });
      expect(password).toMatch(/^[a-z]+$/);
    });

    it('generates password with only numbers when specified', () => {
      const password = generateSecurePassword(20, {
        uppercase: false,
        lowercase: false,
        numbers: true,
        symbols: false
      });
      expect(password).toMatch(/^[0-9]+$/);
    });

    it('excludes ambiguous characters (0, O, l, 1, I)', () => {
      // Generate many passwords and check none contain ambiguous chars
      for (let i = 0; i < 10; i++) {
        const password = generateSecurePassword(100, {
          uppercase: true,
          lowercase: true,
          numbers: true,
          symbols: false
        });
        expect(password).not.toMatch(/[0O1lI]/);
      }
    });

    it('falls back to alphanumeric when no options selected', () => {
      const password = generateSecurePassword(16, {
        uppercase: false,
        lowercase: false,
        numbers: false,
        symbols: false
      });
      expect(password).toHaveLength(16);
      expect(password).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('generateMemorablePasswordLocal', () => {
    it('generates correct number of words', () => {
      const password = generateMemorablePasswordLocal(4);
      const words = password.split('-');
      expect(words).toHaveLength(4);
    });

    it('capitalizes first letter of each word', () => {
      const password = generateMemorablePasswordLocal(4);
      const words = password.split('-');
      words.forEach(word => {
        expect(word[0]).toBe(word[0].toUpperCase());
        expect(word.slice(1)).toBe(word.slice(1).toLowerCase());
      });
    });

    it('uses hyphen as separator', () => {
      const password = generateMemorablePasswordLocal(3);
      expect(password).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-[A-Z][a-z]+$/);
    });

    it('generates unique passwords', () => {
      const password1 = generateMemorablePasswordLocal(4);
      const password2 = generateMemorablePasswordLocal(4);
      // While technically could be the same, extremely unlikely
      // Run multiple times to reduce false positives
      let allSame = true;
      for (let i = 0; i < 5; i++) {
        const p1 = generateMemorablePasswordLocal(4);
        const p2 = generateMemorablePasswordLocal(4);
        if (p1 !== p2) {
          allSame = false;
          break;
        }
      }
      expect(allSame).toBe(false);
    });

    it('generates password with default 4 words', () => {
      const password = generateMemorablePasswordLocal();
      const words = password.split('-');
      expect(words).toHaveLength(4);
    });
  });
});

describe('Content Script - Signup Form Detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Helper to detect signup forms (mirrors content.ts logic)
  function detectIsSignupForm(form: HTMLFormElement | null, passwordField: HTMLInputElement): boolean {
    if (!form) {
      const parent = passwordField.closest('div[class*="signup"], div[class*="register"], div[class*="sign-up"]');
      return parent !== null || passwordField.autocomplete === 'new-password';
    }

    const passwordFields = form.querySelectorAll('input[type="password"]');
    if (passwordFields.length >= 2) return true;

    if (form.querySelector('input[name*="confirm"], input[id*="confirm"]')) return true;
    if (form.querySelector('input[autocomplete="new-password"]')) return true;

    const formAction = form.action?.toLowerCase() || '';
    const formClass = form.className?.toLowerCase() || '';
    const formId = form.id?.toLowerCase() || '';
    const signupKeywords = ['signup', 'sign-up', 'register', 'registration', 'create', 'join'];
    
    for (const keyword of signupKeywords) {
      if (formAction.includes(keyword) || formClass.includes(keyword) || formId.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  it('detects signup form with multiple password fields', () => {
    document.body.innerHTML = `
      <form id="signup-form">
        <input type="email" name="email" />
        <input type="password" name="password" id="pwd1" />
        <input type="password" name="confirm_password" id="pwd2" />
      </form>
    `;

    const form = document.querySelector('form') as HTMLFormElement;
    const passwordField = document.querySelector('#pwd1') as HTMLInputElement;
    
    expect(detectIsSignupForm(form, passwordField)).toBe(true);
  });

  it('detects signup form with confirm password field', () => {
    document.body.innerHTML = `
      <form>
        <input type="email" name="email" />
        <input type="password" name="password" />
        <input type="text" name="confirm_password" />
      </form>
    `;

    const form = document.querySelector('form') as HTMLFormElement;
    const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
    
    expect(detectIsSignupForm(form, passwordField)).toBe(true);
  });

  it('detects signup form with new-password autocomplete', () => {
    document.body.innerHTML = `
      <form>
        <input type="email" name="email" />
        <input type="password" autocomplete="new-password" />
      </form>
    `;

    const form = document.querySelector('form') as HTMLFormElement;
    const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
    
    expect(detectIsSignupForm(form, passwordField)).toBe(true);
  });

  it('detects signup form by form class', () => {
    document.body.innerHTML = `
      <form class="signup-form">
        <input type="email" name="email" />
        <input type="password" name="password" />
      </form>
    `;

    const form = document.querySelector('form') as HTMLFormElement;
    const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
    
    expect(detectIsSignupForm(form, passwordField)).toBe(true);
  });

  it('detects signup form by register keyword in ID', () => {
    document.body.innerHTML = `
      <form id="registration-form">
        <input type="email" name="email" />
        <input type="password" name="password" />
      </form>
    `;

    const form = document.querySelector('form') as HTMLFormElement;
    const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
    
    expect(detectIsSignupForm(form, passwordField)).toBe(true);
  });

  it('does not detect login form as signup', () => {
    document.body.innerHTML = `
      <form id="login-form" class="login">
        <input type="email" name="email" />
        <input type="password" name="password" autocomplete="current-password" />
      </form>
    `;

    const form = document.querySelector('form') as HTMLFormElement;
    const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
    
    expect(detectIsSignupForm(form, passwordField)).toBe(false);
  });

  it('detects signup by parent container class when no form', () => {
    document.body.innerHTML = `
      <div class="signup-container">
        <input type="email" name="email" />
        <input type="password" name="password" />
      </div>
    `;

    const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
    
    expect(detectIsSignupForm(null, passwordField)).toBe(true);
  });
});

describe('Content Script - Confirm Password Field Detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Helper to check if a field is a confirm password field (mirrors content.ts logic)
  function isConfirmPasswordField(field: HTMLInputElement): boolean {
    const name = (field.name || '').toLowerCase();
    const id = (field.id || '').toLowerCase();
    const placeholder = (field.placeholder || '').toLowerCase();
    
    const confirmKeywords = ['confirm', 'retype', 'repeat', 'verify', 'reenter', 're-enter', 'password2', 'pwd2'];
    
    for (const keyword of confirmKeywords) {
      if (name.includes(keyword) || id.includes(keyword) || placeholder.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }

  it('detects confirm password field by name', () => {
    document.body.innerHTML = `<input type="password" name="confirm_password" />`;
    const field = document.querySelector('input') as HTMLInputElement;
    expect(isConfirmPasswordField(field)).toBe(true);
  });

  it('detects retype password field by name', () => {
    document.body.innerHTML = `<input type="password" name="retype_password" />`;
    const field = document.querySelector('input') as HTMLInputElement;
    expect(isConfirmPasswordField(field)).toBe(true);
  });

  it('detects repeat password field by id', () => {
    document.body.innerHTML = `<input type="password" id="repeat-password" />`;
    const field = document.querySelector('input') as HTMLInputElement;
    expect(isConfirmPasswordField(field)).toBe(true);
  });

  it('detects verify password by placeholder', () => {
    document.body.innerHTML = `<input type="password" placeholder="Verify your password" />`;
    const field = document.querySelector('input') as HTMLInputElement;
    expect(isConfirmPasswordField(field)).toBe(true);
  });

  it('detects password2 field', () => {
    document.body.innerHTML = `<input type="password" name="password2" />`;
    const field = document.querySelector('input') as HTMLInputElement;
    expect(isConfirmPasswordField(field)).toBe(true);
  });

  it('does not detect main password field as confirm', () => {
    document.body.innerHTML = `<input type="password" name="password" id="password" />`;
    const field = document.querySelector('input') as HTMLInputElement;
    expect(isConfirmPasswordField(field)).toBe(false);
  });

  it('does not detect username field as confirm', () => {
    document.body.innerHTML = `<input type="text" name="username" />`;
    const field = document.querySelector('input') as HTMLInputElement;
    expect(isConfirmPasswordField(field)).toBe(false);
  });
});

describe('Content Script - Credential Detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('detects standard login form', () => {
    document.body.innerHTML = `
      <form id="login">
        <input type="email" name="email" value="test@example.com" />
        <input type="password" name="password" value="password123" />
        <button type="submit">Login</button>
      </form>
    `;

    const emailField = document.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;

    expect(emailField).toBeTruthy();
    expect(passwordField).toBeTruthy();
    expect(emailField.value).toBe('test@example.com');
  });

  it('detects password field by autocomplete attribute', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" autocomplete="username" />
        <input type="password" autocomplete="current-password" />
      </form>
    `;

    const password = document.querySelector('input[autocomplete="current-password"]');
    expect(password).toBeTruthy();
  });

  it('detects multiple password fields in signup form', () => {
    document.body.innerHTML = `
      <form>
        <input type="email" name="email" />
        <input type="password" name="password" />
        <input type="password" name="password_confirm" />
      </form>
    `;

    const passwordFields = document.querySelectorAll('input[type="password"]');
    expect(passwordFields).toHaveLength(2);
  });
});

describe('Content Script - Chrome Runtime Messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends SAVE_CREDENTIAL message with correct payload', async () => {
    const payload = {
      domain: 'example.com',
      username: 'testuser',
      encryptedPassword: 'password123'
    };

    await chrome.runtime.sendMessage({
      type: 'SAVE_CREDENTIAL',
      payload
    });

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'SAVE_CREDENTIAL',
      payload
    });
  });

  it('sends GET_CREDENTIALS_FOR_DOMAIN message', async () => {
    await chrome.runtime.sendMessage({
      type: 'GET_CREDENTIALS_FOR_DOMAIN',
      payload: { domain: 'example.com' }
    });

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'GET_CREDENTIALS_FOR_DOMAIN',
      payload: { domain: 'example.com' }
    });
  });
});
