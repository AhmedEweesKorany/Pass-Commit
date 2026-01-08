import { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

interface MasterPasswordScreenProps {
    isSetup: boolean;
    onSuccess: () => void;
}

export default function MasterPasswordScreen({ isSetup, onSuccess }: MasterPasswordScreenProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) {
            return 'Password must be at least 8 characters';
        }
        if (!/[A-Z]/.test(pwd)) {
            return 'Password must contain an uppercase letter';
        }
        if (!/[a-z]/.test(pwd)) {
            return 'Password must contain a lowercase letter';
        }
        if (!/[0-9]/.test(pwd)) {
            return 'Password must contain a number';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isSetup) {
            // Validate password strength
            const validationError = validatePassword(password);
            if (validationError) {
                setError(validationError);
                return;
            }

            // Check passwords match
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
        }

        setLoading(true);

        try {
            const messageType = isSetup ? 'SET_MASTER_PASSWORD' : 'UNLOCK_VAULT';
            const response = await chrome.runtime.sendMessage({
                type: messageType,
                payload: { masterPassword: password },
            });

            if (response?.success) {
                onSuccess();
            } else {
                setError(response?.error || 'Invalid password');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
            console.error('Master password error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 animate-fade-in">
            {/* Icon */}
            <div className="mb-6">
                <div className="w-16 h-16 rounded-xl bg-dark-800/50 border border-dark-700 flex items-center justify-center">
                    {isSetup ? (
                        <img src="/icons/logo.png" className="w-10 h-10 object-contain" alt="PassCommit" />
                    ) : (
                        <Lock className="w-8 h-8 text-primary-400" />
                    )}
                </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold mb-2">
                {isSetup ? 'Create Master Password' : 'Unlock Vault'}
            </h2>
            <p className="text-dark-400 text-sm text-center mb-6 max-w-[280px]">
                {isSetup
                    ? 'This password encrypts your vault. Store it safely - it cannot be recovered.'
                    : 'Enter your master password to access your passwords'}
            </p>

            {/* Error Message */}
            {error && (
                <div className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm animate-slide-up">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
                {/* Password Input */}
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Master password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input pr-10"
                        autoFocus
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-300"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>

                {/* Confirm Password (Setup only) */}
                {isSetup && (
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input pr-10"
                            required
                        />
                    </div>
                )}

                {/* Password Requirements (Setup only) */}
                {isSetup && (
                    <div className="text-xs text-dark-400 space-y-1">
                        <p className={password.length >= 8 ? 'text-green-400' : ''}>
                            • At least 8 characters
                        </p>
                        <p className={/[A-Z]/.test(password) ? 'text-green-400' : ''}>
                            • One uppercase letter
                        </p>
                        <p className={/[a-z]/.test(password) ? 'text-green-400' : ''}>
                            • One lowercase letter
                        </p>
                        <p className={/[0-9]/.test(password) ? 'text-green-400' : ''}>
                            • One number
                        </p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !password || (isSetup && !confirmPassword)}
                    className="btn btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : isSetup ? (
                        'Create Master Password'
                    ) : (
                        'Unlock'
                    )}
                </button>
            </form>

            {/* Warning */}
            {isSetup && (
                <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs text-center">
                    ⚠️ If you forget this password, your vault cannot be recovered.
                </div>
            )}
        </div>
    );
}
