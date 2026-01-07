import { Globe, User, Copy, ExternalLink, Eye, EyeOff, Key } from 'lucide-react';
import { Credential } from '../../types';
import { useState } from 'react';

interface CredentialListProps {
    credentials: Credential[];
    onAutoFill: (credential: Credential) => void;
    compact?: boolean;
}

export default function CredentialList({ credentials, onAutoFill, compact = false }: CredentialListProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({});
    const [loadingPassword, setLoadingPassword] = useState<string | null>(null);

    const handleCopyUsername = async (credential: Credential, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(credential.username);
            setCopiedId(credential.id);
            setCopiedField('username');
            setTimeout(() => {
                setCopiedId(null);
                setCopiedField(null);
            }, 2000);
        } catch (error) {
            console.error('Failed to copy username:', error);
        }
    };

    const handleCopyPassword = async (credential: Credential, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // Request password decryption from background
            const response = await chrome.runtime.sendMessage({
                type: 'GET_DECRYPTED_PASSWORD',
                payload: { credentialId: credential.id },
            });
            if (response?.data) {
                await navigator.clipboard.writeText(response.data);
                setCopiedId(credential.id);
                setCopiedField('password');
                setTimeout(() => {
                    setCopiedId(null);
                    setCopiedField(null);
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to copy password:', error);
        }
    };

    const handleTogglePassword = async (credential: Credential, e: React.MouseEvent) => {
        e.stopPropagation();

        if (visiblePasswords[credential.id]) {
            // Hide password
            setVisiblePasswords(prev => {
                const next = { ...prev };
                delete next[credential.id];
                return next;
            });
        } else {
            // Show password - need to decrypt first
            setLoadingPassword(credential.id);
            try {
                const response = await chrome.runtime.sendMessage({
                    type: 'GET_DECRYPTED_PASSWORD',
                    payload: { credentialId: credential.id },
                });
                if (response?.data) {
                    setVisiblePasswords(prev => ({ ...prev, [credential.id]: response.data }));
                }
            } catch (error) {
                console.error('Failed to get password:', error);
            } finally {
                setLoadingPassword(null);
            }
        }
    };

    const getFaviconUrl = (domain: string) => {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    };

    return (
        <div className="space-y-2">
            {credentials.map((credential) => (
                <div
                    key={credential.id}
                    className={`card cursor-pointer hover:bg-dark-600/50 transition-all group ${compact ? 'p-3' : 'p-4'
                        }`}
                    onClick={() => onAutoFill(credential)}
                >
                    <div className="flex items-center gap-3">
                        {/* Favicon */}
                        <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center overflow-hidden">
                            <img
                                src={getFaviconUrl(credential.domain)}
                                alt=""
                                className="w-5 h-5"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                            <Globe className="w-4 h-4 text-dark-400 hidden" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-dark-100 truncate">{credential.domain}</p>
                            <div className="flex items-center gap-1 text-sm text-dark-400">
                                <User className="w-3 h-3" />
                                <span className="truncate">{credential.username}</span>
                            </div>
                            {/* Password Display */}
                            {visiblePasswords[credential.id] && (
                                <div className="flex items-center gap-1 text-sm text-primary-400 mt-1">
                                    <Key className="w-3 h-3" />
                                    <span className="font-mono truncate">{visiblePasswords[credential.id]}</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Copy Username */}
                            <button
                                onClick={(e) => handleCopyUsername(credential, e)}
                                className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
                                title="Copy username"
                            >
                                {copiedId === credential.id && copiedField === 'username' ? (
                                    <span className="text-xs text-green-400">Copied!</span>
                                ) : (
                                    <User className="w-4 h-4 text-dark-300" />
                                )}
                            </button>
                            {/* Copy Password */}
                            <button
                                onClick={(e) => handleCopyPassword(credential, e)}
                                className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
                                title="Copy password"
                            >
                                {copiedId === credential.id && copiedField === 'password' ? (
                                    <span className="text-xs text-green-400">Copied!</span>
                                ) : (
                                    <Copy className="w-4 h-4 text-dark-300" />
                                )}
                            </button>
                            {/* Toggle Password Visibility */}
                            <button
                                onClick={(e) => handleTogglePassword(credential, e)}
                                className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
                                title={visiblePasswords[credential.id] ? "Hide password" : "Show password"}
                                disabled={loadingPassword === credential.id}
                            >
                                {loadingPassword === credential.id ? (
                                    <div className="w-4 h-4 border-2 border-dark-300 border-t-transparent rounded-full animate-spin" />
                                ) : visiblePasswords[credential.id] ? (
                                    <EyeOff className="w-4 h-4 text-dark-300" />
                                ) : (
                                    <Eye className="w-4 h-4 text-dark-300" />
                                )}
                            </button>
                            {/* Auto-fill */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAutoFill(credential);
                                }}
                                className="p-2 rounded-lg hover:bg-primary-500/20 transition-colors"
                                title="Auto-fill"
                            >
                                <ExternalLink className="w-4 h-4 text-primary-400" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
