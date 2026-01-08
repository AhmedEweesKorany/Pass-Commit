import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';

interface LoginScreenProps {
    onSuccess: () => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    console.log("success from root ")

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');

        console.log("success from  fn root ")


        try {
            console.log("success 111 ")
            const response = await chrome.runtime.sendMessage({ type: 'LOGIN' });

            if (response?.success) {
                console.log("success");
                onSuccess();
            } else {
                console.log("erorrrrrr 11111")
                setError(response?.error || 'Failed to sign in');
            }
        } catch (err) {
            setError('Failed to connect. Please try again.');
            console.error('erwwwwwwwess', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 animate-fade-in">
            {/* Logo */}
            <div className="mb-8">
                <div className="w-28 h-28 rounded-3xl bg-dark-800/50 flex items-center justify-center shadow-2xl border border-dark-700 animate-pulse-glow">
                    <img src="/icons/logo.png" className="w-24 h-24 object-contain scale-110" alt="PassCommit Logo" />
                </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                PassCommit
            </h1>
            <p className="text-dark-400 text-center mb-8 max-w-[250px]">
                Secure password manager with end-to-end encryption
            </p>

            {/* Error Message */}
            {error && (
                <div className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center animate-slide-up">
                    {error}
                </div>
            )}

            {/* Google Sign In Button */}
            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                )}
                {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>

            {/* Footer */}
            <p className="mt-8 text-xs text-dark-500 text-center">
                Your passwords are encrypted locally.<br />
                We never see your master password.
            </p>
        </div>
    );
}
