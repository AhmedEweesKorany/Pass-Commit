import { useState } from 'react';
import { Zap, Lock, Hash, Copy, Check, RefreshCw } from 'lucide-react';
import { generatePassword, generateMemorablePassword, generateNumericPin } from '../../utils/crypto';
import { GeneratorPreset } from '../../types';

export default function QuickGenerator() {
    const [password, setPassword] = useState('');
    const [copied, setCopied] = useState(false);
    const [activePreset, setActivePreset] = useState<GeneratorPreset>('strong');

    const presets = [
        { id: 'strong' as const, icon: Zap, label: 'Strong', color: 'text-yellow-400' },
        { id: 'memorable' as const, icon: Lock, label: 'Memorable', color: 'text-green-400' },
        { id: 'numeric' as const, icon: Hash, label: 'Numeric', color: 'text-blue-400' },
    ];

    const generateByPreset = (preset: GeneratorPreset) => {
        setActivePreset(preset);
        let newPassword = '';

        switch (preset) {
            case 'strong':
                newPassword = generatePassword({
                    length: 16,
                    uppercase: true,
                    lowercase: true,
                    numbers: true,
                    symbols: true,
                    excludeAmbiguous: true,
                });
                break;
            case 'memorable':
                newPassword = generateMemorablePassword(4);
                break;
            case 'numeric':
                newPassword = generateNumericPin(12);
                break;
            default:
                newPassword = generatePassword({
                    length: 16,
                    uppercase: true,
                    lowercase: true,
                    numbers: true,
                    symbols: true,
                    excludeAmbiguous: false,
                });
        }

        setPassword(newPassword);
        setCopied(false);
    };

    const copyToClipboard = async () => {
        if (!password) return;
        await navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-dark-200">Quick Generator</h3>
                {password && (
                    <button
                        onClick={() => generateByPreset(activePreset)}
                        className="p-1.5 rounded hover:bg-dark-600 transition-colors"
                        title="Regenerate"
                    >
                        <RefreshCw className="w-4 h-4 text-dark-400" />
                    </button>
                )}
            </div>

            {/* Preset Buttons */}
            <div className="flex gap-2 mb-3">
                {presets.map((preset) => {
                    const Icon = preset.icon;
                    return (
                        <button
                            key={preset.id}
                            onClick={() => generateByPreset(preset.id)}
                            className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${activePreset === preset.id && password
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-dark-600 hover:border-dark-500 hover:bg-dark-700/50'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${preset.color}`} />
                            <span className="text-xs text-dark-300">{preset.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Generated Password */}
            {password && (
                <div className="flex items-center gap-2 p-3 bg-dark-800 rounded-lg animate-fade-in">
                    <code className="flex-1 font-mono text-sm text-primary-300 break-all">
                        {password}
                    </code>
                    <button
                        onClick={copyToClipboard}
                        className={`p-2 rounded-lg transition-colors ${copied
                                ? 'bg-green-500/20 text-green-400'
                                : 'hover:bg-dark-600 text-dark-300'
                            }`}
                        title={copied ? 'Copied!' : 'Copy'}
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            )}

            {!password && (
                <p className="text-center text-sm text-dark-400 py-3">
                    Click a preset to generate a password
                </p>
            )}
        </div>
    );
}
