import { useState, useEffect } from 'react';
import { Search, Key, Shield, Settings, LogOut, Lock, Plus } from 'lucide-react';
import { Credential, AuthState } from '../types';
import LoginScreen from './components/LoginScreen';
import MasterPasswordScreen from './components/MasterPasswordScreen';
import SearchBar from './components/SearchBar';
import QuickGenerator from './components/QuickGenerator';
import CredentialList from './components/CredentialList';


export default function Popup() {
    const [authState, setAuthState] = useState<AuthState | null>(null);
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [filteredCredentials, setFilteredCredentials] = useState<Credential[]>([]);
    const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentDomain, setCurrentDomain] = useState<string>('');

    useEffect(() => {
        initializePopup();
    }, []);

    const initializePopup = async () => {
        try {
            // Get current tab domain
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.url) {
                const url = new URL(tab.url);
                setCurrentDomain(url.hostname);
            }

            // Check auth state via background script
            const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });
            if (response?.data) {
                setAuthState(response.data.authState);
                setIsVaultUnlocked(response.data.isUnlocked);
                if (response.data.credentials) {
                    setCredentials(response.data.credentials);
                    setFilteredCredentials(response.data.credentials);
                }
            }
        } catch (error) {
            console.error('Failed to initialize popup:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query: string) => {
        if (!query.trim()) {
            setFilteredCredentials(credentials);
            return;
        }
        const filtered = credentials.filter(
            cred =>
                cred.domain.toLowerCase().includes(query.toLowerCase()) ||
                cred.username.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredCredentials(filtered);
    };

    const handleAutoFill = async (credential: Credential) => {
        await chrome.runtime.sendMessage({
            type: 'AUTOFILL',
            payload: { credentialId: credential.id },
        });
        window.close();
    };

    const handleLogout = async () => {
        await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        setAuthState(null);
        setIsVaultUnlocked(false);
        setCredentials([]);
    };

    const handleLock = async () => {
        await chrome.runtime.sendMessage({ type: 'LOCK_VAULT' });
        setIsVaultUnlocked(false);
    };

    const openOptionsPage = () => {
        chrome.runtime.openOptionsPage();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <Shield className="w-12 h-12 text-primary-500" />
                    <p className="text-dark-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Not logged in
    if (!authState?.isAuthenticated) {
        return <LoginScreen onSuccess={initializePopup} />;
    }

    // Logged in but no master password set
    if (!authState.hasMasterPassword) {
        return <MasterPasswordScreen isSetup={true} onSuccess={initializePopup} />;
    }

    // Vault is locked
    if (!isVaultUnlocked) {
        return <MasterPasswordScreen isSetup={false} onSuccess={initializePopup} />;
    }

    // Current domain credentials
    const domainCredentials = credentials.filter(cred => {
        const normalizedDomain = currentDomain.replace(/^www\./, '');
        const credDomain = cred.domain.replace(/^www\./, '');
        return credDomain === normalizedDomain ||
            credDomain.endsWith('.' + normalizedDomain) ||
            normalizedDomain.endsWith('.' + credDomain);
    });

    return (
        <div className="flex flex-col h-full animate-fade-in">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-dark-700">
                <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary-500" />
                    <h1 className="text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                        PassCommit
                    </h1>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowGenerator(!showGenerator)}
                        className="btn-ghost p-2 rounded-lg"
                        title="Password Generator"
                    >
                        <Key className="w-5 h-5" />
                    </button>
                    <button
                        onClick={openOptionsPage}
                        className="btn-ghost p-2 rounded-lg"
                        title="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleLock}
                        className="btn-ghost p-2 rounded-lg"
                        title="Lock Vault"
                    >
                        <Lock className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="btn-ghost p-2 rounded-lg text-red-400 hover:text-red-300"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Search */}
            <div className="p-4">
                <SearchBar onSearch={handleSearch} />
            </div>

            {/* Quick Generator */}
            {showGenerator && (
                <div className="px-4 pb-4 animate-slide-up">
                    <QuickGenerator />
                </div>
            )}

            {/* Current Domain Credentials */}
            {domainCredentials.length > 0 && (
                <div className="px-4 pb-2">
                    <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">
                        For {currentDomain}
                    </h2>
                    <CredentialList
                        credentials={domainCredentials}
                        onAutoFill={handleAutoFill}
                        compact={true}
                    />
                </div>
            )}

            {/* All Credentials */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                        All Passwords
                    </h2>
                    <button
                        onClick={openOptionsPage}
                        className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                    >
                        <Plus className="w-3 h-3" />
                        Add
                    </button>
                </div>
                {filteredCredentials.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-dark-400">
                        <Key className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No passwords saved yet</p>
                    </div>
                ) : (
                    <CredentialList
                        credentials={filteredCredentials}
                        onAutoFill={handleAutoFill}
                    />
                )}
            </div>

            {/* Footer */}
            <footer className="p-3 border-t border-dark-700 text-center">
                <p className="text-xs text-dark-500">
                    {credentials.length} passwords saved • End-to-end encrypted
                </p>
            </footer>
        </div>
    );
}
