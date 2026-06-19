import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  ChevronRight,
  Wand2,
  ClipboardPaste,
  CheckCircle2,
  ArrowLeftRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  HumanizeStyle,
  HumanizeResult,
  humanizeText,
  STYLE_LABELS,
  STYLE_DESCS,
} from '../lib/humanizeService';

interface AIHumanizerProps {
  apiKey: string;
  onSendToWriter: (text: string) => void;
  onOpenSettings: () => void;
  prefillText?: string | null;
}

const STYLES: HumanizeStyle[] = [
  'student-casual',
  'teen-natural',
  'formal-essay',
  'primary-simple',
  'rushed-student',
];

export const AIHumanizer: React.FC<AIHumanizerProps> = ({
  apiKey,
  onSendToWriter,
  onOpenSettings,
  prefillText,
}) => {
  const [inputText, setInputText] = useState(prefillText || '');
  const [style, setStyle] = useState<HumanizeStyle>('student-casual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<HumanizeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'humanized' | 'compare'>('humanized');
  const [editableOutput, setEditableOutput] = useState('');

  const handleHumanize = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }
    if (!inputText.trim()) return;

    setIsProcessing(true);
    try {
      const res = await humanizeText(inputText.trim(), style, apiKey);
      setResult(res);
      setEditableOutput(res.humanized);
    } catch (err) {
      console.error('Humanizer failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch {
      // clipboard read failed — user can type manually
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:h-full overflow-y-auto lg:overflow-hidden theme-bg">
      {/* Left Column: Input & Style */}
      <div className="w-full lg:w-1/3 border-b-2 lg:border-b-0 lg:border-r-2 theme-border p-6 flex flex-col gap-6 theme-bg lg:overflow-y-auto">
        <div className="space-y-2">
          <h2 className="text-3xl font-display uppercase">Step 1: Input Text</h2>
          <p className="text-[10px] font-mono opacity-50 uppercase">Paste AI-generated text to humanize</p>
        </div>

        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your AI-generated answer or text here..."
            className="w-full h-48 brutal-border p-4 font-mono text-xs outline-none focus:bg-neon-green/5 transition-colors resize-none"
          />
          <button
            onClick={handlePaste}
            className="absolute bottom-3 right-3 p-1.5 brutal-border bg-white hover:bg-neon-green transition-colors"
            title="Paste from clipboard"
          >
            <ClipboardPaste size={13} />
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-text-primary">
            Writing Style
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={cn(
                  'p-3 brutal-border text-left transition-all',
                  style === s ? 'bg-neon-green brutal-shadow' : 'theme-card hover:bg-neutral-50'
                )}
              >
                <div className="font-display uppercase text-xs font-bold text-text-primary">
                  {STYLE_LABELS[s]}
                </div>
                <div className="text-[9px] font-mono opacity-50 uppercase text-text-primary">
                  {STYLE_DESCS[s]}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleHumanize}
          disabled={isProcessing || !inputText.trim()}
          className={cn(
            'w-full brutal-btn bg-brutal-black text-white hover:bg-neon-green hover:text-brutal-black transition-all flex items-center justify-center gap-2 group lg:mt-auto py-4',
            'disabled:opacity-50 disabled:grayscale'
          )}
        >
          {isProcessing ? (
            <RefreshCw size={20} className="animate-spin" />
          ) : (
            <Wand2 size={20} className="group-hover:scale-110 transition-transform" />
          )}
          <span className="font-display uppercase">
            {isProcessing ? 'Humanizing...' : 'Humanize Text'}
          </span>
        </button>
      </div>

      {/* Center Column: Output */}
      <div className="flex-grow flex flex-col p-4 lg:p-6 lg:overflow-hidden bg-bg-secondary min-h-[60vh] lg:min-h-0">
        <div className="flex-grow theme-card brutal-border brutal-shadow flex flex-col lg:overflow-hidden">
          {/* Output header */}
          <div className="p-4 border-b-2 theme-border flex items-center justify-between bg-bg-secondary">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-text-primary text-bg-primary flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-display uppercase text-sm leading-tight text-text-primary">
                  Humanized Output
                </h3>
                {result && (
                  <span className="text-[9px] font-mono uppercase opacity-50 text-text-primary">
                    Style: {STYLE_LABELS[result.style]}
                  </span>
                )}
              </div>
            </div>
            {result && (
              <div className="flex gap-2">
                <button
                  onClick={() => setView(view === 'humanized' ? 'compare' : 'humanized')}
                  className="p-2 brutal-border hover:bg-neon-green transition-colors"
                  title="Toggle compare view"
                >
                  <ArrowLeftRight size={14} />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-2 brutal-border hover:bg-neon-green transition-colors"
                  title="Copy"
                >
                  {copied ? <CheckCircle2 size={14} className="text-neon-green" /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Output body */}
          <div className="flex-grow lg:overflow-y-auto p-4 lg:p-8 relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center space-y-4 z-50 p-6 text-center bg-neutral-900/95 dark:bg-[#0a0a0c]/98 border-2 border-neon-green text-white"
                >
                  <Wand2 size={40} className="animate-pulse text-neon-green" />
                  <div className="font-display uppercase text-2xl tracking-tighter animate-pulse text-neon-green">
                    Making it human...
                  </div>
                  <p className="font-mono text-[10px] opacity-40 max-w-xs text-white">
                    Rewriting to match a real student's voice while keeping all the facts intact.
                  </p>
                </motion.div>
              ) : result && view === 'compare' ? (
                <motion.div
                  key="compare"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full"
                >
                  <div className="flex flex-col gap-2">
                    <div className="font-mono text-[9px] uppercase font-bold opacity-40 tracking-widest">
                      Original (AI)
                    </div>
                    <div className="brutal-border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap bg-red-50/30 min-h-[300px] text-text-primary">
                      {result.original}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="font-mono text-[9px] uppercase font-bold text-neon-green tracking-widest">
                      Humanized
                    </div>
                    <div className="brutal-border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap bg-neon-green/5 min-h-[300px] text-text-primary">
                      {result.humanized}
                    </div>
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-sm max-w-none text-text-primary"
                >
                  <div className="relative">
                    <textarea
                      value={editableOutput}
                      onChange={(e) => setEditableOutput(e.target.value)}
                      className="w-full min-h-[500px] h-auto font-mono text-sm leading-relaxed student-notebook-ruled outline-none focus:border-neon-green transition-all resize-none overflow-hidden border-2 border-brutal-black rounded-[4px] brutal-shadow"
                      style={{ height: 'auto', minHeight: '500px' }}
                      onInput={(e: any) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-neon-green px-2 py-1 font-mono text-[9px] font-bold uppercase pointer-events-none">
                      Editable
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center space-y-4 opacity-20 text-center"
                >
                  <Wand2 size={100} strokeWidth={1} />
                  <div className="max-w-xs">
                    <h3 className="font-display uppercase text-xl">AI Humanizer</h3>
                    <p className="font-mono text-xs">
                      Paste any AI-generated text on the left, choose a style, and hit Humanize.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Right Column: Actions */}
      <div className="w-full lg:w-[300px] border-t-2 lg:border-t-0 lg:border-l-2 theme-border p-6 flex flex-col gap-8 theme-bg overflow-y-auto mb-16 lg:mb-0">
        <div className="space-y-6">
          <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-text-primary">
            Actions
          </h3>
          <div className="space-y-4">
            <button
              onClick={() => onSendToWriter(editableOutput)}
              disabled={!editableOutput}
              className="w-full brutal-btn bg-neon-green flex flex-col items-start gap-1 group disabled:opacity-50 disabled:grayscale text-brutal-black"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-display uppercase text-sm">Send to Writer</span>
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
              <span className="text-[9px] font-mono opacity-50 uppercase text-left">
                Render in your handwriting font
              </span>
            </button>

            <button
              onClick={handleCopy}
              disabled={!editableOutput}
              className="w-full brutal-btn flex items-center justify-center gap-2 text-xs font-mono uppercase bg-theme-bg text-text-primary disabled:opacity-50 border-theme-border"
            >
              {copied ? <CheckCircle2 size={16} className="text-neon-green" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Output'}
            </button>

            {result && (
              <button
                onClick={handleHumanize}
                disabled={isProcessing}
                className="w-full brutal-btn flex items-center justify-center gap-2 text-xs font-mono uppercase bg-theme-bg text-text-primary disabled:opacity-50 border-theme-border"
              >
                <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
                Regenerate
              </button>
            )}
          </div>
        </div>

        {result && (
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-text-primary">
              Try Another Style
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {STYLES.filter((s) => s !== style).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStyle(s); handleHumanize(); }}
                  className="w-full p-2 text-left brutal-border text-[10px] uppercase font-bold hover:bg-neon-green/10 transition-colors text-text-primary"
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto p-4 theme-card brutal-border border-dashed space-y-2">
          <div className="flex items-center gap-2 text-neon-green">
            <CheckCircle2 size={16} />
            <span className="font-display uppercase text-[10px]">Humanizer v1.0</span>
          </div>
          <p className="text-[9px] font-mono opacity-60 leading-tight uppercase text-text-primary">
            Rewrites AI text to match real student voices. Facts stay accurate — only the tone changes.
          </p>
        </div>
      </div>
    </div>
  );
};
