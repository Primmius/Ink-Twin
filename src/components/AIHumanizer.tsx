import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  ChevronRight,
  Wand2,
  ClipboardPaste,
  CheckCircle2,
  ArrowLeftRight,
  Cpu,
  ChevronDown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  HumanizeStyle,
  HumanizeResult,
  humanizeText,
  STYLE_LABELS,
  STYLE_DESCS,
  AVAILABLE_GEMINI_MODELS,
  DEFAULT_HUMANIZE_MODEL,
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

const STYLE_EMOJI: Record<HumanizeStyle, string> = {
  'student-casual': '🧑🎓',
  'teen-natural': '😎',
  'formal-essay': '📄',
  'primary-simple': '🌱',
  'rushed-student': '⚡',
};

export const AIHumanizer: React.FC<AIHumanizerProps> = ({
  apiKey,
  onSendToWriter,
  onOpenSettings,
  prefillText,
}) => {
  const [inputText, setInputText] = useState(prefillText || '');
  const [style, setStyle] = useState<HumanizeStyle>('student-casual');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('inktwin_humanizer_model') || DEFAULT_HUMANIZE_MODEL;
  });
  const [customModel, setCustomModel] = useState<string>('');
  const [isCustomModelActive, setIsCustomModelActive] = useState<boolean>(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<HumanizeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'humanized' | 'compare'>('humanized');
  const [editableOutput, setEditableOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync selected model to localStorage
  useEffect(() => {
    localStorage.setItem('inktwin_humanizer_model', selectedModel);
  }, [selectedModel]);

  const activeModelOption = AVAILABLE_GEMINI_MODELS.find(m => m.id === selectedModel);

  const isApiKeyProblem = (err: any) => {
    if (!err) return false;
    const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || '';
    const lower = msg.toLowerCase();
    return (
      lower.includes("you don't have the api key set up yet") ||
      lower.includes("api key not valid") ||
      lower.includes("api_key_invalid") ||
      lower.includes("invalid api key") ||
      lower.includes("api key not found") ||
      lower.includes("api key missing") ||
      lower.includes("invalid_argument") ||
      lower.includes("unauthenticated") ||
      lower.includes("permission_denied") ||
      lower.includes("400") ||
      lower.includes("403")
    );
  };

  const handleHumanize = async () => {
    if (!apiKey || !apiKey.trim() || apiKey.trim().length < 8) {
      setError("You don't have the API key set up yet. Please set up the API key.");
      onOpenSettings();
      return;
    }
    if (!inputText.trim()) return;

    const modelToUse = isCustomModelActive && customModel.trim() ? customModel.trim() : selectedModel;

    setIsProcessing(true);
    setError(null);
    try {
      const res = await humanizeText(inputText.trim(), style, apiKey, modelToUse);
      setResult(res);
      setEditableOutput(res.humanized);
      setView('humanized');
    } catch (err: any) {
      console.error('Humanizer failed', err);
      if (isApiKeyProblem(err)) {
        setError("You don't have the API key set up yet. Please set up the API key.");
        onOpenSettings();
      } else {
        const msg = err?.message || "Humanizer failed. Please check your model or API key.";
        setError(`${msg} (Try switching to Gemini 2.5 Flash or Gemini 2.5 Flash-Lite)`);
      }
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

      {/* ─── Left column: Input + Style + Model Picker ─── */}
      <div className="w-full lg:w-[340px] xl:w-1/3 border-b-2 lg:border-b-0 lg:border-r-2 theme-border p-4 md:p-6 flex flex-col gap-4 theme-bg lg:overflow-y-auto">

        {/* Heading — hidden on mobile to save space, shown on lg+ */}
        <div className="hidden lg:block space-y-1">
          <h2 className="text-2xl font-display uppercase">Input Text</h2>
          <p className="text-[10px] font-mono opacity-50 uppercase">Paste AI-generated text to humanize</p>
        </div>

        {/* Mobile heading + paste button in one row */}
        <div className="flex items-center justify-between lg:hidden">
          <h2 className="text-xl font-display uppercase">Humanize Text</h2>
          <button
            onClick={handlePaste}
            className="flex items-center gap-1.5 px-3 py-1.5 brutal-border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-warning-yellow hover:text-neutral-950 dark:hover:bg-warning-yellow dark:hover:text-neutral-950 transition-colors font-mono text-[10px] uppercase font-bold"
          >
            <ClipboardPaste size={12} />
            Paste
          </button>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your AI-generated text here..."
            className="w-full h-32 md:h-36 lg:h-40 brutal-border p-3 md:p-4 font-mono text-xs outline-none focus:bg-warning-yellow/5 transition-colors resize-none"
          />
          {/* Desktop-only paste button inside textarea */}
          <button
            onClick={handlePaste}
            className="hidden lg:flex absolute bottom-3 right-3 p-1.5 brutal-border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-warning-yellow hover:text-neutral-950 dark:hover:bg-warning-yellow dark:hover:text-neutral-950 transition-colors"
            title="Paste from clipboard"
          >
            <ClipboardPaste size={13} />
          </button>
        </div>

        {/* ─── Gemini AI Model Selector ─── */}
        <div className="space-y-1.5 p-3 brutal-border bg-neutral-50 dark:bg-neutral-900/60">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold tracking-widest opacity-70 flex items-center gap-1.5 text-text-primary">
              <Cpu size={13} className="text-warning-yellow" />
              Gemini Model
            </label>
            <span className="text-[9px] font-mono opacity-50 uppercase">Same API Key</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelDropdown(prev => !prev)}
              className="w-full p-2.5 brutal-border bg-white dark:bg-neutral-800 text-left flex items-center justify-between text-xs font-mono font-bold transition-all hover:border-warning-yellow"
            >
              <div className="flex flex-col truncate pr-2">
                <span className="truncate text-neutral-900 dark:text-neutral-100">
                  {isCustomModelActive ? (customModel.trim() || 'Custom Model ID...') : (activeModelOption?.name || selectedModel)}
                </span>
                <span className="text-[9px] font-normal opacity-60 truncate">
                  {isCustomModelActive ? 'User custom model' : (activeModelOption?.description || selectedModel)}
                </span>
              </div>
              <ChevronDown size={14} className={cn("transition-transform shrink-0", showModelDropdown ? "rotate-180" : "")} />
            </button>

            {showModelDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-neutral-900 brutal-border brutal-shadow p-1.5 space-y-1 max-h-60 overflow-y-auto">
                {AVAILABLE_GEMINI_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      setIsCustomModelActive(false);
                      setShowModelDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left p-2 rounded text-xs transition-colors flex items-center justify-between gap-2",
                      !isCustomModelActive && selectedModel === m.id
                        ? "bg-warning-yellow text-neutral-950 font-bold"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-200"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-mono font-bold">{m.name}</span>
                      <span className="text-[9px] opacity-70 font-sans">{m.description}</span>
                    </div>
                    {m.tag && (
                      <span className={cn(
                        "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 font-bold",
                        !isCustomModelActive && selectedModel === m.id
                          ? "bg-neutral-950 text-warning-yellow"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      )}>
                        {m.tag}
                      </span>
                    )}
                  </button>
                ))}

                {/* Custom Model Option */}
                <div className="pt-1.5 border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    onClick={() => {
                      setIsCustomModelActive(true);
                      setShowModelDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left p-2 rounded text-xs transition-colors flex items-center justify-between",
                      isCustomModelActive
                        ? "bg-warning-yellow text-neutral-950 font-bold"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-200"
                    )}
                  >
                    <span className="font-mono">Enter Custom Model ID...</span>
                    <span className="text-[9px] font-mono opacity-60">Custom</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {isCustomModelActive && (
            <div className="pt-1">
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g. gemini-2.5-flash"
                className="w-full p-2 brutal-border bg-white dark:bg-neutral-800 font-mono text-xs outline-none"
              />
              <p className="text-[9px] font-mono opacity-50 mt-1">
                Any valid Gemini model ID supported by your API key.
              </p>
            </div>
          )}
        </div>

        {/* Style selector */}
        <div className="space-y-2">
          <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-text-primary">
            Writing Style
          </h3>

          {/* Mobile: horizontal chip row */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden" style={{ scrollbarWidth: 'none' }}>
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={cn(
                  'flex-shrink-0 px-3 py-2 brutal-border text-left transition-all flex items-center gap-1.5',
                  style === s ? 'bg-warning-yellow brutal-shadow text-neutral-950' : 'theme-card bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                )}
              >
                <span className="text-sm">{STYLE_EMOJI[s]}</span>
                <span className={cn("font-display uppercase text-[10px] font-bold whitespace-nowrap", style === s ? "text-neutral-950" : "text-neutral-900 dark:text-neutral-100")}>
                  {STYLE_LABELS[s]}
                </span>
              </button>
            ))}
          </div>

          {/* Desktop: vertical list with descriptions */}
          <div className="hidden lg:grid grid-cols-1 gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={cn(
                  'p-2.5 brutal-border text-left transition-all',
                  style === s ? 'bg-warning-yellow brutal-shadow' : 'theme-card hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                )}
              >
                <div className={cn("font-display uppercase text-xs font-bold flex items-center gap-2", style === s ? "text-neutral-950" : "text-neutral-900 dark:text-neutral-100")}>
                  <span>{STYLE_EMOJI[s]}</span>
                  {STYLE_LABELS[s]}
                </div>
                <div className={cn("text-[9px] font-mono uppercase mt-0.5", style === s ? "text-neutral-950/70" : "text-neutral-500 dark:text-neutral-400")}>
                  {STYLE_DESCS[s]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border-2 border-error-red text-error-red text-xs font-mono flex items-start justify-between gap-2">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="font-bold underline text-[10px] uppercase shrink-0">Dismiss</button>
          </div>
        )}

        {/* Humanize button */}
        <button
          onClick={handleHumanize}
          disabled={isProcessing || !inputText.trim()}
          className={cn(
            'w-full brutal-btn bg-neutral-900 dark:bg-neutral-800 text-white border-2 border-neutral-900 dark:border-neutral-700 hover:bg-warning-yellow hover:text-neutral-950 dark:hover:bg-warning-yellow dark:hover:text-neutral-950 transition-all flex items-center justify-center gap-2 group lg:mt-auto py-3 md:py-3.5',
            'disabled:opacity-50 disabled:grayscale'
          )}
        >
          {isProcessing ? (
            <RefreshCw size={18} className="animate-spin text-warning-yellow" />
          ) : (
            <Wand2 size={18} className="group-hover:scale-110 transition-transform" />
          )}
          <span className="font-display uppercase text-sm font-bold">
            {isProcessing ? 'Humanizing...' : 'Humanize Text'}
          </span>
        </button>
      </div>

      {/* ─── Center column: Output ─── */}
      <div className="flex-grow flex flex-col p-3 md:p-4 lg:p-6 lg:overflow-hidden bg-bg-secondary min-h-[50vh] lg:min-h-0">
        <div className="flex-grow theme-card brutal-border brutal-shadow flex flex-col lg:overflow-hidden">

          {/* Output header */}
          <div className="p-3 md:p-4 border-b-2 theme-border flex items-center justify-between bg-bg-secondary">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-text-primary text-bg-primary flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-display uppercase text-xs md:text-sm leading-tight text-text-primary">
                  Humanized Output
                </h3>
                {result && (
                  <span className="text-[9px] font-mono uppercase opacity-50 text-text-primary flex items-center gap-1.5">
                    <span>{STYLE_EMOJI[result.style]} {STYLE_LABELS[result.style]}</span>
                    {result.modelUsed && <span>• {result.modelUsed}</span>}
                  </span>
                )}
              </div>
            </div>
            {result && (
              <div className="flex gap-1.5 md:gap-2">
                <button
                  onClick={() => setView(view === 'humanized' ? 'compare' : 'humanized')}
                  className={cn(
                    "p-1.5 md:p-2 brutal-border transition-colors",
                    view === 'compare' ? "bg-warning-yellow text-neutral-950 font-bold" : "hover:bg-warning-yellow hover:text-neutral-950"
                  )}
                  title="Toggle compare view"
                >
                  <ArrowLeftRight size={13} />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 md:p-2 brutal-border hover:bg-warning-yellow hover:text-neutral-950 transition-colors"
                  title="Copy"
                >
                  {copied ? <CheckCircle2 size={13} className="text-warning-yellow" /> : <Copy size={13} />}
                </button>
              </div>
            )}
          </div>

          {/* Output body */}
          <div className="flex-grow lg:overflow-y-auto p-3 md:p-6 lg:p-8 relative min-h-[300px] md:min-h-[400px]">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center space-y-4 z-50 p-6 text-center bg-neutral-900/95 dark:bg-[#0a0a0c]/98 border-2 border-warning-yellow text-white"
                >
                  <Wand2 size={36} className="animate-pulse text-warning-yellow" />
                  <div className="font-display uppercase text-xl md:text-2xl tracking-tighter animate-pulse text-warning-yellow">
                    Making it human...
                  </div>
                  <p className="font-mono text-[10px] opacity-40 max-w-xs text-white">
                    Rewriting via {isCustomModelActive ? customModel : selectedModel} to match a real student voice while keeping all facts intact.
                  </p>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {view === 'compare' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono uppercase opacity-50 font-bold text-text-primary">
                          Original AI Text
                        </div>
                        <div className="p-3 md:p-4 brutal-border bg-neutral-100/50 dark:bg-neutral-900/50 font-mono text-xs leading-relaxed text-text-primary whitespace-pre-wrap">
                          {result.original}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono uppercase font-bold text-warning-yellow">
                          Humanized Student Text ({result.modelUsed || selectedModel})
                        </div>
                        <div className="p-3 md:p-4 brutal-border bg-warning-yellow/5 border-warning-yellow font-mono text-xs leading-relaxed text-text-primary whitespace-pre-wrap">
                          {editableOutput}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={editableOutput}
                        onChange={(e) => setEditableOutput(e.target.value)}
                        className="w-full min-h-[260px] md:min-h-[320px] p-3 md:p-4 brutal-border font-mono text-xs md:text-sm leading-relaxed outline-none focus:border-warning-yellow transition-colors resize-y text-text-primary bg-bg-primary"
                        placeholder="Humanized text will appear here..."
                      />
                      <p className="text-[9px] font-mono opacity-50 uppercase text-text-primary">
                        ✏️ Editable — feel free to tweak words before sending to Studio Writer
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center space-y-3 opacity-40 p-4">
                  <Wand2 size={40} className="text-text-primary" />
                  <p className="font-display uppercase text-sm md:text-base text-text-primary">
                    Your humanized text will appear here
                  </p>
                  <p className="font-mono text-[10px] max-w-xs text-text-primary">
                    Select a student voice style and Gemini model on the left, then click Humanize.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Action bar */}
          {result && (
            <div className="p-3 md:p-4 border-t-2 theme-border bg-bg-secondary flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 brutal-border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-warning-yellow hover:text-neutral-950 font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <CheckCircle2 size={12} className="text-warning-yellow" /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
              </div>

              <button
                onClick={() => onSendToWriter(editableOutput)}
                className="brutal-btn bg-warning-yellow text-neutral-950 hover:bg-warning-yellow/90 px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-display font-bold uppercase flex items-center gap-2"
              >
                <span>Write in My Handwriting</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="lg:mt-auto p-3 md:p-4 theme-card brutal-border border-dashed space-y-1.5 mt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-warning-yellow">
              <CheckCircle2 size={14} />
              <span className="font-display uppercase text-[10px] font-bold">
                Humanizer v1.2 · {isCustomModelActive ? customModel : (activeModelOption?.name || selectedModel)}
              </span>
            </div>
            <button
              onClick={() => setShowModelDropdown(true)}
              className="text-[9px] font-mono underline uppercase text-neutral-600 dark:text-neutral-400 hover:text-warning-yellow"
            >
              Change Model
            </button>
          </div>
          <p className="text-[9px] font-mono opacity-60 leading-tight uppercase text-text-primary">
            Rewrites AI text to match real student voices. Select any Gemini model supported by your free API key.
          </p>
        </div>
      </div>
    </div>
  );
};
