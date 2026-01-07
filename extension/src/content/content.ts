/**
 * PassCommit Content Script
 * Handles form detection, auto-fill, and credential capture
 */

import { DetectedForm } from '../types';

// Selectors for login form detection
const USERNAME_SELECTORS = [
  'input[type="email"]',
  'input[type="text"][name*="user"]',
  'input[type="text"][name*="login"]',
  'input[type="text"][name*="email"]',
  'input[type="text"][id*="user"]',
  'input[type="text"][id*="login"]',
  'input[type="text"][id*="email"]',
  'input[autocomplete="username"]',
  'input[autocomplete="email"]',
];

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
];

let detectedForms: DetectedForm[] = [];
let injectedOverlays: HTMLElement[] = [];

// Initialize content script
async function initialize() {
  detectLoginForms();
  observeDOM();
  setupMessageListener();
  
  // Try to auto-fill if we have matching credentials
  await attemptAutoFillOnLoad();
}

// Attempt to auto-fill credentials when page loads
async function attemptAutoFillOnLoad() {
  if (detectedForms.length === 0) return;
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CREDENTIALS_FOR_DOMAIN',
      payload: { domain: window.location.hostname },
    });

    if (response?.success && response?.data?.length > 0) {
      // Show a non-intrusive notification that credentials are available
      showCredentialsAvailableNotification(response.data.length);
    }
  } catch (error) {
    // Vault might be locked - that's fine
    console.debug('Could not check for credentials:', error);
  }
}

// Show notification that credentials are available
function showCredentialsAvailableNotification(count: number) {
  // Don't show if already shown
  if (document.querySelector('.passcommit-available-notification')) return;

  const notification = document.createElement('div');
  notification.className = 'passcommit-available-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideInRight 0.3s ease-out;
  `;

  notification.innerHTML = `
    <style>
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #0ea5e9, #6366f1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z"/>
        <path d="M8 12L10.5 14.5L16 9"/>
      </svg>
    </div>
    <div>
      <div style="font-size: 13px; font-weight: 600; color: #f1f5f9;">${count} password${count > 1 ? 's' : ''} available</div>
      <div style="font-size: 11px; color: #94a3b8;">Click the icon in the login form to fill</div>
    </div>
    <button id="passcommit-dismiss-notification" style="
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
      font-size: 18px;
      line-height: 1;
    ">×</button>
  `;

  document.body.appendChild(notification);

  notification.querySelector('#passcommit-dismiss-notification')?.addEventListener('click', () => {
    notification.remove();
  });

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Detect login forms on the page
function detectLoginForms(): DetectedForm[] {
  const forms: DetectedForm[] = [];
  const domain = window.location.hostname;

  // Find all password fields
  const passwordFields = document.querySelectorAll<HTMLInputElement>(
    PASSWORD_SELECTORS.join(', ')
  );

  passwordFields.forEach((passwordField) => {
    // Find associated username field
    const form = passwordField.closest('form');
    let usernameField: HTMLInputElement | null = null;

    if (form) {
      // Look within the same form
      for (const selector of USERNAME_SELECTORS) {
        usernameField = form.querySelector<HTMLInputElement>(selector);
        if (usernameField) break;
      }
    }

    if (!usernameField) {
      // Look in nearby elements
      const parent = passwordField.parentElement?.parentElement?.parentElement;
      if (parent) {
        for (const selector of USERNAME_SELECTORS) {
          usernameField = parent.querySelector<HTMLInputElement>(selector);
          if (usernameField) break;
        }
      }
    }

    forms.push({
      usernameField,
      passwordField,
      domain,
    });

    // Add visual indicator
    addFieldIndicator(passwordField);
    if (usernameField) {
      addFieldIndicator(usernameField);
    }
  });

  detectedForms = forms;
  return forms;
}

// Add visual indicator to input field
function addFieldIndicator(field: HTMLInputElement) {
  // Check if indicator already exists
  if (field.dataset.passcommitIndicator) return;
  field.dataset.passcommitIndicator = 'true';

  // Create indicator button
  const indicator = document.createElement('div');
  indicator.className = 'passcommit-indicator';
  indicator.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
      <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // Position the indicator
  const updatePosition = () => {
    const rect = field.getBoundingClientRect();
    indicator.style.position = 'fixed';
    indicator.style.top = `${rect.top + rect.height / 2 - 10}px`;
    indicator.style.left = `${rect.right - 28}px`;
    indicator.style.zIndex = '2147483647';
  };

  updatePosition();
  window.addEventListener('scroll', updatePosition);
  window.addEventListener('resize', updatePosition);

  // Click handler - open popup or show context menu
  indicator.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Request credentials for this domain
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CREDENTIALS_FOR_DOMAIN',
      payload: { domain: window.location.hostname },
    });

    if (response?.success && response?.data?.length > 0) {
      showCredentialPicker(field, response.data);
    } else if (response?.error === 'Vault is locked') {
      showVaultLockedMessage();
    } else {
      // Open extension popup
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    }
  });

  document.body.appendChild(indicator);
  injectedOverlays.push(indicator);
}

// Show message that vault is locked
function showVaultLockedMessage() {
  const existing = document.querySelector('.passcommit-locked-message');
  if (existing) existing.remove();

  const message = document.createElement('div');
  message.className = 'passcommit-locked-message';
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    background: #1e293b;
    border: 1px solid #f59e0b;
    border-radius: 12px;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  `;
  message.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <div>
        <div style="font-size: 14px; font-weight: 600; color: #f1f5f9;">Vault is locked</div>
        <div style="font-size: 12px; color: #94a3b8;">Click the PassCommit extension to unlock</div>
      </div>
    </div>
  `;

  document.body.appendChild(message);
  setTimeout(() => message.remove(), 4000);
}

// Show credential picker near a field
function showCredentialPicker(field: HTMLInputElement, credentials: Array<{ id: string; username: string; domain: string }>) {
  // Remove existing picker
  const existingPicker = document.querySelector('.passcommit-picker');
  if (existingPicker) existingPicker.remove();

  const picker = document.createElement('div');
  picker.className = 'passcommit-picker';
  
  const rect = field.getBoundingClientRect();
  picker.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 4}px;
    left: ${rect.left}px;
    min-width: ${rect.width}px;
    max-width: 300px;
    z-index: 2147483647;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  picker.innerHTML = `
    <div style="padding: 8px 12px; border-bottom: 1px solid #334155; font-size: 11px; color: #94a3b8; font-weight: 600;">
      PASSCOMMIT
    </div>
    ${credentials
      .map(
        (cred) => `
      <button class="passcommit-cred-item" data-id="${cred.id}" style="
        width: 100%;
        padding: 10px 12px;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        color: #f1f5f9;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <div style="width: 24px; height: 24px; background: #334155; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
            <circle cx="12" cy="7" r="4"/>
            <path d="M5 21v-2a7 7 0 0 1 14 0v2"/>
          </svg>
        </div>
        <div>
          <div style="font-weight: 500;">${cred.username}</div>
          <div style="font-size: 11px; color: #64748b;">${cred.domain}</div>
        </div>
      </button>
    `
      )
      .join('')}
  `;

  // Add click handlers for credentials
  picker.querySelectorAll('.passcommit-cred-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const id = (item as HTMLElement).dataset.id;
      await chrome.runtime.sendMessage({
        type: 'AUTOFILL',
        payload: { credentialId: id },
      });
      picker.remove();
    });

    item.addEventListener('mouseenter', () => {
      (item as HTMLElement).style.background = '#334155';
    });
    item.addEventListener('mouseleave', () => {
      (item as HTMLElement).style.background = 'transparent';
    });
  });

  // Close on click outside
  const closeHandler = (e: MouseEvent) => {
    if (!picker.contains(e.target as Node)) {
      picker.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 100);

  document.body.appendChild(picker);
}

// Listen for auto-fill commands from background
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'DO_AUTOFILL') {
      const { username, password } = message.payload;
      autoFillCredentials(username, password);
      sendResponse({ success: true });
    }
    return true;
  });
}

// Auto-fill credentials into detected forms
function autoFillCredentials(username: string, password: string) {
  if (detectedForms.length === 0) {
    detectLoginForms();
  }

  for (const form of detectedForms) {
    if (form.usernameField) {
      form.usernameField.value = username;
      form.usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      form.usernameField.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (form.passwordField) {
      form.passwordField.value = password;
      form.passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      form.passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

// Observe DOM for dynamically added forms
function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    let shouldRedetect = false;
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (
              node.matches?.('input[type="password"]') ||
              node.querySelector?.('input[type="password"]')
            ) {
              shouldRedetect = true;
              break;
            }
          }
        }
      }
      if (shouldRedetect) break;
    }

    if (shouldRedetect) {
      setTimeout(detectLoginForms, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Detect form submissions for credential capture
function setupCredentialCapture() {
  document.addEventListener('submit', async (e) => {
    const form = e.target as HTMLFormElement;
    const passwordFields = form.querySelectorAll<HTMLInputElement>('input[type="password"]');
    
    if (passwordFields.length === 0) return;
    
    // Get the first password field (main password)
    const passwordField = passwordFields[0];
    if (!passwordField.value) return;

    let usernameField: HTMLInputElement | null = null;
    for (const selector of USERNAME_SELECTORS) {
      usernameField = form.querySelector<HTMLInputElement>(selector);
      if (usernameField?.value) break;
    }

    if (!usernameField?.value) return;

    const domain = window.location.hostname;
    const username = usernameField.value;
    const password = passwordField.value;

    // Check if this credential already exists
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CREDENTIALS_FOR_DOMAIN',
        payload: { domain },
      });

      if (response?.success && response?.data) {
        // Check if this exact username already exists
        const existingCred = response.data.find((cred: { username: string }) => 
          cred.username.toLowerCase() === username.toLowerCase()
        );

        if (existingCred) {
          // Credential already exists - don't prompt
          console.debug('PassCommit: Credential already exists for', username);
          return;
        }
      } else if (response?.error === 'Vault is locked') {
        // Don't prompt if vault is locked
        return;
      }
    } catch (error) {
      // If we can't check, still show the prompt
      console.debug('PassCommit: Could not check existing credentials:', error);
    }

    // Detect if this is a signup form (has confirm password field)
    const isSignupForm = passwordFields.length >= 2 || 
      form.querySelector('input[name*="confirm"]') !== null ||
      form.querySelector('input[autocomplete="new-password"]') !== null;

    // Ask user if they want to save
    const shouldSave = await showSavePrompt(username, isSignupForm);
    
    if (shouldSave) {
      chrome.runtime.sendMessage({
        type: 'SAVE_CREDENTIAL',
        payload: {
          domain,
          username,
          encryptedPassword: password,
        },
      });
    }
  });
}

// Show save prompt
async function showSavePrompt(username: string, isSignupForm: boolean = false): Promise<boolean> {
  return new Promise((resolve) => {
    const prompt = document.createElement('div');
    prompt.className = 'passcommit-save-prompt';
    prompt.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      animation: slideIn 0.3s ease-out;
    `;

    const title = isSignupForm ? 'Save new password?' : 'Save password?';
    const icon = isSignupForm ? `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    ` : `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z"/>
        <path d="M8 12L10.5 14.5L16 9"/>
      </svg>
    `;

    prompt.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      <div style="padding: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, ${isSignupForm ? '#10b981, #059669' : '#0ea5e9, #6366f1'}); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            ${icon}
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 600; color: #f1f5f9;">${title}</div>
            <div style="font-size: 12px; color: #94a3b8;">${username}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="passcommit-save-btn" style="
            flex: 1;
            padding: 10px;
            background: linear-gradient(135deg, #0ea5e9, #0284c7);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            cursor: pointer;
            font-size: 13px;
          ">Save</button>
          <button id="passcommit-never-btn" style="
            flex: 1;
            padding: 10px;
            background: #334155;
            border: none;
            border-radius: 8px;
            color: #94a3b8;
            font-weight: 500;
            cursor: pointer;
            font-size: 13px;
          ">Never</button>
        </div>
      </div>
    `;

    document.body.appendChild(prompt);

    prompt.querySelector('#passcommit-save-btn')?.addEventListener('click', () => {
      prompt.remove();
      resolve(true);
    });

    prompt.querySelector('#passcommit-never-btn')?.addEventListener('click', () => {
      prompt.remove();
      resolve(false);
    });

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (document.body.contains(prompt)) {
        prompt.remove();
        resolve(false);
      }
    }, 10000);
  });
}

// Cleanup on page unload
window.addEventListener('unload', () => {
  injectedOverlays.forEach((el) => el.remove());
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
    setupCredentialCapture();
  });
} else {
  initialize();
  setupCredentialCapture();
}
