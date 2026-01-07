import { useState, useEffect, useRef } from 'react';
import { Shield, Key, Settings, Download, Upload, Plus, Search, Trash2, Edit2, Save, X, Eye, EyeOff, ExternalLink, Globe, User, RefreshCw, Lock, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Credential, AuthState, GeneratorOptions } from '../types';
import { generatePassword, generateMemorablePassword, generateNumericPin } from '../utils/crypto';

export default function Options() {
    const [authState, setAuthState] = useState<AuthState | null>(null);
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'vault' | 'generator' | 'settings'>('vault');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
    const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
    const [loadingPasswords, setLoadingPasswords] = useState<Record<string, boolean>>({});
    const [newCredential, setNewCredential] = useState<Partial<Credential> | null>(null);

    // Change password modal state
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Import state
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Status message
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Generator state
    const [generatorOptions, setGeneratorOptions] = useState<GeneratorOptions>({
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        excludeAmbiguous: true,
    });
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [generatorPreset, setGeneratorPreset] = useState<'strong' | 'memorable' | 'numeric' | 'custom'>('strong');

    useEffect(() => {
        initializeOptions();
    }, []);

    const initializeOptions = async () => {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });
            if (response?.data) {
                setAuthState(response.data.authState);
                setIsVaultUnlocked(response.data.isUnlocked);
                if (response.data.credentials) {
                    setCredentials(response.data.credentials);
                }
            }
        } catch (error) {
            console.error('Failed to initialize options:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCredentials = credentials.filter(
        (cred) =>
            cred.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cred.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSaveCredential = async (credential: Partial<Credential>) => {
        try {
            if (editingId) {
                await chrome.runtime.sendMessage({
                    type: 'UPDATE_CREDENTIAL',
                    payload: { id: editingId, ...credential },
                });
            } else {
                await chrome.runtime.sendMessage({
                    type: 'SAVE_CREDENTIAL',
                    payload: credential,
                });
            }
            await initializeOptions();
            setEditingId(null);
            setNewCredential(null);
        } catch (error) {
            console.error('Failed to save credential:', error);
        }
    };

    const handleDeleteCredential = async (id: string) => {
        if (!confirm('Are you sure you want to delete this credential?')) return;

        try {
            await chrome.runtime.sendMessage({
                type: 'DELETE_CREDENTIAL',
                payload: { id },
            });
            await initializeOptions();
        } catch (error) {
            console.error('Failed to delete credential:', error);
        }
    };

    const handleExport = async (format: 'json' | 'csv' = 'json') => {
        try {
            if (format === 'json') {
                const response = await chrome.runtime.sendMessage({ type: 'EXPORT_VAULT' });
                if (response?.success && response?.data) {
                    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `passcommit-export-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setStatusMessage({ type: 'success', message: 'Passwords exported successfully!' });
                } else {
                    setStatusMessage({ type: 'error', message: response?.error || 'Failed to export passwords (Vault might be locked)' });
                }
            } else {
                const response = await chrome.runtime.sendMessage({ type: 'EXPORT_VAULT_CSV' });
                if (response?.success && response?.data) {
                    const blob = new Blob([response.data], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `passcommit-export-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setStatusMessage({ type: 'success', message: 'Passwords exported to CSV successfully!' });
                } else {
                    setStatusMessage({ type: 'error', message: response?.error || 'Failed to export CSV (Vault might be locked)' });
                }
            }
        } catch (error) {
            console.error('Failed to export vault:', error);
            setStatusMessage({ type: 'error', message: 'Failed to export passwords' });
        }
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportLoading(true);
        try {
            const content = await file.text();
            const format = file.name.endsWith('.csv') ? 'csv' : 'json';

            const response = await chrome.runtime.sendMessage({
                type: 'IMPORT_VAULT',
                payload: { data: content, format }
            });

            if (response?.success) {
                setStatusMessage({ type: 'success', message: `Successfully imported ${response.data.imported} passwords!` });
                await initializeOptions();
            } else {
                console.error('Import failed:', response?.error);
                setStatusMessage({ type: 'error', message: response?.error || 'Failed to import passwords. Check file format.' });
            }
        } catch (error) {
            console.error('Failed to import vault:', error);
            setStatusMessage({ type: 'error', message: 'Failed to import passwords. Check file format.' });
        } finally {
            setImportLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
        setTimeout(() => setStatusMessage(null), 5000);
    };

    const handleChangeMasterPassword = async () => {
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            return;
        }

        setPasswordLoading(true);
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'CHANGE_MASTER_PASSWORD',
                payload: { currentPassword, newPassword }
            });

            if (response?.success) {
                setStatusMessage({ type: 'success', message: 'Master password changed successfully!' });
                setShowChangePassword(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setPasswordError(response?.error || 'Failed to change password');
            }
        } catch (error) {
            console.error('Failed to change master password:', error);
            setPasswordError('Failed to change master password');
        } finally {
            setPasswordLoading(false);
        }
        setTimeout(() => setStatusMessage(null), 3000);
    };


    const handleGeneratePassword = () => {
        let password = '';

        switch (generatorPreset) {
            case 'strong':
                password = generatePassword(generatorOptions);
                break;
            case 'memorable':
                password = generateMemorablePassword(4);
                break;
            case 'numeric':
                password = generateNumericPin(12);
                break;
            case 'custom':
                password = generatePassword(generatorOptions);
                break;
        }

        setGeneratedPassword(password);
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
    };

    const getFaviconUrl = (domain: string) => {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <Shield className="w-12 h-12 text-primary-500" />
                    <p className="text-dark-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!authState?.isAuthenticated || !isVaultUnlocked) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8">
                <Shield className="w-16 h-16 text-primary-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Vault Locked</h1>
                <p className="text-dark-400 mb-6">Please unlock your vault from the extension popup.</p>
                <button
                    onClick={() => chrome.action.openPopup()}
                    className="btn btn-primary"
                >
                    Open Popup
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ width: '100vw' }}>
            {/* Header */}
            <header className="glass border-b border-dark-700 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8 text-primary-500" />
                        <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                            PassCommit Settings
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-dark-400">
                            {authState.user?.email}
                        </span>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="border-b border-dark-700">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex gap-6">
                        {[
                            { id: 'vault', label: 'Password Vault', icon: Key },
                            { id: 'generator', label: 'Generator', icon: RefreshCw },
                            { id: 'settings', label: 'Settings', icon: Settings },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${activeTab === tab.id
                                        ? 'border-primary-500 text-primary-400'
                                        : 'border-transparent text-dark-400 hover:text-dark-200'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Status Message */}
                {statusMessage && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${statusMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {statusMessage.message}
                    </div>
                )}

                {/* Vault Tab */}
                {activeTab === 'vault' && (
                    <div className="animate-fade-in">
                        {/* Toolbar */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                                <input
                                    type="text"
                                    placeholder="Search passwords..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="input pl-10"
                                />
                            </div>
                            <button
                                onClick={() => setNewCredential({ domain: '', username: '', encryptedPassword: '' })}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Password
                            </button>
                            <button onClick={() => handleExport('json')} className="btn btn-secondary flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>

                        {/* New Credential Form */}
                        {newCredential && (
                            <div className="card mb-6 animate-slide-up">
                                <h3 className="font-semibold mb-4">Add New Password</h3>
                                <CredentialForm
                                    credential={newCredential}
                                    onSave={handleSaveCredential}
                                    onCancel={() => setNewCredential(null)}
                                    onGeneratePassword={() => {
                                        const password = generatePassword(generatorOptions);
                                        setNewCredential({ ...newCredential, encryptedPassword: password });
                                        return password;
                                    }}
                                />
                            </div>
                        )}

                        {/* Credentials List */}
                        <div className="space-y-3">
                            {filteredCredentials.length === 0 ? (
                                <div className="card text-center py-12">
                                    <Key className="w-12 h-12 text-dark-500 mx-auto mb-4" />
                                    <p className="text-dark-400">
                                        {credentials.length === 0
                                            ? 'No passwords saved yet. Add your first password!'
                                            : 'No passwords match your search.'}
                                    </p>
                                </div>
                            ) : (
                                filteredCredentials.map((credential) => (
                                    <div key={credential.id} className="card hover:bg-dark-600/30 transition-colors">
                                        {editingId === credential.id ? (
                                            <CredentialForm
                                                credential={credential}
                                                onSave={handleSaveCredential}
                                                onCancel={() => setEditingId(null)}
                                                onGeneratePassword={() => generatePassword(generatorOptions)}
                                            />
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                {/* Favicon */}
                                                <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                                                    <img
                                                        src={getFaviconUrl(credential.domain)}
                                                        alt=""
                                                        className="w-6 h-6"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-4 h-4 text-dark-400" />
                                                        <span className="font-medium">{credential.domain}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-dark-400">
                                                        <User className="w-3 h-3" />
                                                        <span>{credential.username}</span>
                                                    </div>
                                                </div>

                                                {/* Password */}
                                                <div className="flex items-center gap-2">
                                                    <code className="font-mono text-sm bg-dark-800 px-3 py-1 rounded min-w-[100px]">
                                                        {loadingPasswords[credential.id] ? (
                                                            <span className="text-dark-400">Loading...</span>
                                                        ) : showPassword[credential.id] && decryptedPasswords[credential.id] ? (
                                                            decryptedPasswords[credential.id]
                                                        ) : (
                                                            '••••••••'
                                                        )}
                                                    </code>
                                                    <button
                                                        onClick={async () => {
                                                            const isVisible = showPassword[credential.id];
                                                            if (!isVisible && !decryptedPasswords[credential.id]) {
                                                                // Need to fetch the decrypted password
                                                                setLoadingPasswords(prev => ({ ...prev, [credential.id]: true }));
                                                                try {
                                                                    const response = await chrome.runtime.sendMessage({
                                                                        type: 'GET_DECRYPTED_PASSWORD',
                                                                        payload: { credentialId: credential.id },
                                                                    });
                                                                    if (response?.data) {
                                                                        setDecryptedPasswords(prev => ({ ...prev, [credential.id]: response.data }));
                                                                        setShowPassword(prev => ({ ...prev, [credential.id]: true }));
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Failed to decrypt password:', error);
                                                                } finally {
                                                                    setLoadingPasswords(prev => ({ ...prev, [credential.id]: false }));
                                                                }
                                                            } else {
                                                                // Just toggle visibility
                                                                setShowPassword(prev => ({ ...prev, [credential.id]: !prev[credential.id] }));
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                                                        disabled={loadingPasswords[credential.id]}
                                                    >
                                                        {loadingPasswords[credential.id] ? (
                                                            <div className="w-4 h-4 border-2 border-dark-400 border-t-transparent rounded-full animate-spin" />
                                                        ) : showPassword[credential.id] ? (
                                                            <EyeOff className="w-4 h-4 text-dark-400" />
                                                        ) : (
                                                            <Eye className="w-4 h-4 text-dark-400" />
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setEditingId(credential.id)}
                                                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4 text-dark-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCredential(credential.id)}
                                                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Generator Tab */}
                {activeTab === 'generator' && (
                    <div className="max-w-2xl animate-fade-in">
                        <div className="card">
                            <h2 className="text-lg font-semibold mb-6">Password Generator</h2>

                            {/* Presets */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                {[
                                    { id: 'strong', label: 'Strong', desc: '16 chars, all types' },
                                    { id: 'memorable', label: 'Memorable', desc: '4 random words' },
                                    { id: 'numeric', label: 'Numeric', desc: '12 digit PIN' },
                                    { id: 'custom', label: 'Custom', desc: 'Your settings' },
                                ].map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setGeneratorPreset(preset.id as typeof generatorPreset)}
                                        className={`p-4 rounded-xl border text-left transition-all ${generatorPreset === preset.id
                                            ? 'border-primary-500 bg-primary-500/10'
                                            : 'border-dark-600 hover:border-dark-500'
                                            }`}
                                    >
                                        <div className="font-medium">{preset.label}</div>
                                        <div className="text-xs text-dark-400">{preset.desc}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Custom Options */}
                            {generatorPreset === 'custom' && (
                                <div className="space-y-4 mb-6 p-4 bg-dark-800 rounded-xl">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Length: {generatorOptions.length}
                                        </label>
                                        <input
                                            type="range"
                                            min="8"
                                            max="64"
                                            value={generatorOptions.length}
                                            onChange={(e) =>
                                                setGeneratorOptions({ ...generatorOptions, length: parseInt(e.target.value) })
                                            }
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { key: 'uppercase', label: 'Uppercase (A-Z)' },
                                            { key: 'lowercase', label: 'Lowercase (a-z)' },
                                            { key: 'numbers', label: 'Numbers (0-9)' },
                                            { key: 'symbols', label: 'Symbols (!@#$)' },
                                        ].map((option) => (
                                            <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={generatorOptions[option.key as keyof GeneratorOptions] as boolean}
                                                    onChange={(e) =>
                                                        setGeneratorOptions({
                                                            ...generatorOptions,
                                                            [option.key]: e.target.checked,
                                                        })
                                                    }
                                                    className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500"
                                                />
                                                <span className="text-sm">{option.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Generate Button */}
                            <button onClick={handleGeneratePassword} className="btn btn-primary w-full py-3 mb-4">
                                Generate Password
                            </button>

                            {/* Result */}
                            {generatedPassword && (
                                <div className="p-4 bg-dark-800 rounded-xl animate-fade-in">
                                    <div className="flex items-center gap-2 mb-2">
                                        <code className="flex-1 font-mono text-lg text-primary-300 break-all">
                                            {generatedPassword}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(generatedPassword)}
                                            className="btn btn-secondary"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <div className="text-xs text-dark-400">
                                        Strength: Strong • {generatedPassword.length} characters
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl animate-fade-in">

                        <div className="card mb-6">
                            <h2 className="text-lg font-semibold mb-4">Account</h2>
                            <div className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl">
                                {authState.user?.picture && (
                                    <img
                                        src={authState.user.picture}
                                        alt=""
                                        className="w-12 h-12 rounded-full"
                                    />
                                )}
                                <div>
                                    <div className="font-medium">{authState.user?.name}</div>
                                    <div className="text-sm text-dark-400">{authState.user?.email}</div>
                                </div>
                            </div>
                        </div>

                        <div className="card mb-6">
                            <h2 className="text-lg font-semibold mb-4">Security</h2>
                            <div className="space-y-4">
                                <button
                                    onClick={() => setShowChangePassword(true)}
                                    className="w-full text-left p-4 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors flex items-center gap-3"
                                >
                                    <Lock className="w-5 h-5 text-primary-400" />
                                    <div>
                                        <div className="font-medium">Change Master Password</div>
                                        <div className="text-sm text-dark-400">Update your vault encryption password</div>
                                    </div>
                                </button>

                            </div>
                        </div>

                        <div className="card mb-6">
                            <h2 className="text-lg font-semibold mb-4">Export Data</h2>
                            <p className="text-sm text-dark-400 mb-4">Download your passwords in a portable format. Keep exported files secure!</p>
                            <div className="flex gap-3 flex-wrap">
                                <button onClick={() => handleExport('json')} className="btn btn-secondary flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Export JSON
                                </button>
                                <button onClick={() => handleExport('csv')} className="btn btn-secondary flex items-center gap-2">
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div className="card">
                            <h2 className="text-lg font-semibold mb-4">Import Data</h2>
                            <p className="text-sm text-dark-400 mb-4">Import passwords from another password manager or a backup file. Supports JSON and CSV formats.</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImport}
                                accept=".json,.csv"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importLoading}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                {importLoading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Import from File
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-dark-500 mt-3">
                                Supported formats: JSON (PassCommit export), CSV (domain, username, password, notes columns)
                            </p>
                        </div>
                    </div>
                )}

                {/* Change Password Modal */}
                {showChangePassword && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
                        <div className="bg-dark-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-primary-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Change Master Password</h3>
                                    <p className="text-sm text-dark-400">All your passwords will be re-encrypted</p>
                                </div>
                            </div>

                            {passwordError && (
                                <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {passwordError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="input"
                                        placeholder="Enter current master password"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="input"
                                        placeholder="Enter new master password"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input"
                                        placeholder="Confirm new master password"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowChangePassword(false);
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                        setPasswordError('');
                                    }}
                                    className="btn btn-ghost flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleChangeMasterPassword}
                                    disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {passwordLoading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Password'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// Credential Form Component
interface CredentialFormProps {
    credential: Partial<Credential>;
    onSave: (credential: Partial<Credential>) => void;
    onCancel: () => void;
    onGeneratePassword: () => string;
}

function CredentialForm({ credential, onSave, onCancel, onGeneratePassword }: CredentialFormProps) {
    const [form, setForm] = useState(credential);
    const [showPwd, setShowPwd] = useState(false);
    const [isLoadingPassword, setIsLoadingPassword] = useState(false);
    const [decryptedPassword, setDecryptedPassword] = useState('');

    // Decrypt password when editing existing credential
    useEffect(() => {
        const loadDecryptedPassword = async () => {
            // Only decrypt if this is an existing credential (has an id) and has encrypted data
            if (credential.id && credential.encryptedPassword && credential.encryptedPassword.startsWith('{')) {
                setIsLoadingPassword(true);
                try {
                    const response = await chrome.runtime.sendMessage({
                        type: 'GET_DECRYPTED_PASSWORD',
                        payload: { credentialId: credential.id },
                    });
                    if (response?.data) {
                        setDecryptedPassword(response.data);
                        setForm(prev => ({ ...prev, encryptedPassword: response.data }));
                    }
                } catch (error) {
                    console.error('Failed to decrypt password:', error);
                } finally {
                    setIsLoadingPassword(false);
                }
            } else if (credential.encryptedPassword && !credential.encryptedPassword.startsWith('{')) {
                // Password is already plaintext (e.g., from generator)
                setDecryptedPassword(credential.encryptedPassword);
            }
        };
        loadDecryptedPassword();
    }, [credential.id]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Website</label>
                    <input
                        type="text"
                        placeholder="example.com"
                        value={form.domain || ''}
                        onChange={(e) => setForm({ ...form, domain: e.target.value })}
                        className="input"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Username / Email</label>
                    <input
                        type="text"
                        placeholder="user@example.com"
                        value={form.username || ''}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        className="input"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        {isLoadingPassword ? (
                            <div className="input pr-10 flex items-center">
                                <div className="w-4 h-4 border-2 border-dark-400 border-t-transparent rounded-full animate-spin mr-2" />
                                <span className="text-dark-400">Decrypting...</span>
                            </div>
                        ) : (
                            <input
                                type={showPwd ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={form.encryptedPassword || ''}
                                onChange={(e) => setForm({ ...form, encryptedPassword: e.target.value })}
                                className="input pr-10"
                            />
                        )}
                        <button
                            type="button"
                            onClick={() => setShowPwd(!showPwd)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400"
                            disabled={isLoadingPassword}
                        >
                            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const pwd = onGeneratePassword();
                            setForm({ ...form, encryptedPassword: pwd });
                            setShowPwd(true);
                        }}
                        className="btn btn-secondary"
                    >
                        Generate
                    </button>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <button onClick={onCancel} className="btn btn-ghost">
                    Cancel
                </button>
                <button
                    onClick={() => onSave(form)}
                    disabled={!form.domain || !form.username || !form.encryptedPassword || isLoadingPassword}
                    className="btn btn-primary"
                >
                    Save
                </button>
            </div>
        </div>
    );
}
