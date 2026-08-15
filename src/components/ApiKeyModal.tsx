import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, ChevronRight, X, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey?: string;
  isInvalid?: boolean;
  customMessage?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentKey = '',
  isInvalid = false,
  customMessage,
}) => {
  const [inputKey, setInputKey] = useState(currentKey);
  const [inputError, setInputError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = inputKey.trim();
    if (!cleanKey) {
      setInputError("Please enter your Gemini API key.");
      return;
    }
    if (cleanKey.length < 10) {
      setInputError("API key looks too short. Please copy the full key from Google AI Studio.");
      return;
    }
    setInputError(null);
    onSave(cleanKey);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg p-6 sm:p-8 relative z-10 border-4 border-brutal-black bg-white dark:bg-[#141414] text-brutal-black dark:text-white brutal-shadow space-y-6"
          style={{
            borderColor: 'var(--border-primary)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            boxShadow: '6px 6px 0px var(--shadow-color)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 border-2 border-brutal-black dark:border-white/20 hover:bg-warning-yellow hover:text-brutal-black transition-colors cursor-pointer"
            title="Close"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="space-y-2 pr-8">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-warning-yellow text-brutal-black border-2 border-brutal-black inline-flex items-center justify-center font-bold">
                <Key size={20} />
              </span>
              <p className="font-mono text-[10px] uppercase opacity-70 tracking-widest font-bold">
                [AI_AUTHENTICATION_REQUIRED]
              </p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display uppercase tracking-tight leading-none pt-1">
              {isInvalid ? "API Key Invalid" : "API Key Required"}
            </h2>
          </div>

          {/* Message Prompt Banner */}
          <div
            className="p-4 border-2 font-mono text-xs leading-relaxed flex items-start gap-3"
            style={{
              backgroundColor: isInvalid ? 'rgba(255, 75, 92, 0.12)' : 'rgba(255, 215, 0, 0.15)',
              borderColor: isInvalid ? 'var(--error-red, #FF4B5C)' : 'var(--warning-yellow, #FFD700)',
              color: 'var(--text-primary)',
            }}
          >
            <AlertTriangle
              size={18}
              className="shrink-0 mt-0.5"
              style={{ color: isInvalid ? '#FF4B5C' : '#E6A100' }}
            />
            <div>
              <p className="font-bold text-sm">
                {customMessage || "You don't have the API key set up yet. Please set up the API key."}
              </p>
              <p className="opacity-80 text-[11px] mt-1">
                A free Gemini API key is needed to run AI vision, handwriting detection, homework solving, and text humanization.
              </p>
            </div>
          </div>

          {/* Quick Step Guide */}
          <div className="space-y-3 font-mono text-xs">
            <p className="font-bold uppercase tracking-wider text-[11px] opacity-75">
              How to get a key in 30 seconds (100% Free):
            </p>
            <ol className="space-y-2 pl-1">
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-brutal-black text-white dark:bg-white dark:text-brutal-black font-bold text-[10px]">
                  1
                </span>
                <span>
                  Go to{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline underline-offset-2 text-blue-600 dark:text-blue-400 hover:text-warning-yellow inline-flex items-center gap-1"
                  >
                    Google AI Studio <ExternalLink size={12} />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-brutal-black text-white dark:bg-white dark:text-brutal-black font-bold text-[10px]">
                  2
                </span>
                <span>Click <strong>"Create API Key"</strong> and copy it.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-brutal-black text-white dark:bg-white dark:text-brutal-black font-bold text-[10px]">
                  3
                </span>
                <span>Paste it below and click <strong>Save API Key</strong>.</span>
              </li>
            </ol>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] font-bold uppercase opacity-70 tracking-widest block">
                Paste Gemini API Key:
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setInputError(null);
                }}
                placeholder="AIzaSy..."
                autoComplete="off"
                className="w-full px-4 py-3 border-2 font-mono text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: inputError ? '#FF4B5C' : 'var(--border-primary)',
                }}
                autoFocus
              />
              {inputError && (
                <p className="font-mono text-[11px] text-error-red font-bold">{inputError}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 brutal-btn flex items-center justify-center gap-2 py-3 font-display uppercase text-sm"
                style={{
                  backgroundColor: 'var(--warning-yellow)',
                  color: '#141414',
                  boxShadow: '3px 3px 0px var(--shadow-color)',
                }}
              >
                Save API Key <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 border-2 font-mono text-xs font-bold uppercase hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                style={{
                  borderColor: 'var(--border-primary)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                }}
              >
                Cancel / Explore
              </button>
            </div>
          </form>

          {/* Footer Privacy Note */}
          <div className="flex items-center gap-2 pt-1 opacity-60 font-mono text-[10px]">
            <ShieldCheck size={14} className="text-warning-yellow shrink-0" />
            <span>Stored strictly in your local browser storage. Never sent to any server.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
