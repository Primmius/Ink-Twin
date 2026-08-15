import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  Moon, 
  Sun, 
  Sparkles, 
  PenTool, 
  FileText, 
  GraduationCap, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Logo } from './Logo';
import { SupportCard } from './SupportCard';
import { cn } from '../lib/utils';
import { AppPhase } from '../types';

interface LandingPageProps {
  onSaveKey: (key: string) => void;
  onExplore?: (phase?: AppPhase) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const features: Array<{
  icon: any;
  title: string;
  desc: string;
  tag: string;
  phase: AppPhase;
  badge: string;
  question: string;
  answer: string;
  benefits: string[];
}> = [
  {
    icon: PenTool,
    title: 'Create My Font',
    desc: 'Snap a photo of your handwriting or draw letters with your finger. Get a real .ttf font file.',
    tag: 'MODULE_01',
    phase: 'font-creation',
    badge: 'Vector Engine',
    question: 'How does the InkTwin handwriting font creator work?',
    answer: 'InkTwin converts photographs of natural handwriting into fully functional downloadable TTF font files using client-side vector trace algorithms.',
    benefits: ['Automatic handwriting vectorization', 'Universal TTF font generation', 'Mobile touch drawing pad', 'Offline safety and privacy']
  },
  {
    icon: FileText,
    title: 'Studio Writer',
    desc: 'Type anything and render realistic handwritten documents on lined, grid, or vintage paper with PDF export.',
    tag: 'MODULE_02',
    phase: 'text-writer',
    badge: 'Realistic Ink',
    question: 'How does the InkTwin text-to-handwriting generator work?',
    answer: 'InkTwin renders typed inputs as natural handwritten documents on lined paper using custom handwriting fonts with advanced line-height variance and ink-bleed simulation.',
    benefits: ['Realistic ink color & bleed', 'Dynamic letter spacing', 'Custom paper background styles', 'High-res PDF & image downloads']
  },
  {
    icon: GraduationCap,
    title: 'AI Study Assistant',
    desc: 'Snap a photo of your homework question. AI solves it step-by-step and writes it out in your handwriting.',
    tag: 'MODULE_03',
    phase: 'homework-solver',
    badge: 'AI Powered',
    question: 'How does the InkTwin AI homework study assistant function?',
    answer: 'InkTwin integrates with Gemini AI to process and solve academic questions, rendering answers in your unique handwriting style.',
    benefits: ['Accurate Gemini AI solving', 'Direct homework synthesis in your font', 'Multi-page document generation', 'Private BYOK model']
  },
  {
    icon: Search,
    title: 'Find My Font',
    desc: 'Upload any handwriting sample to match with the closest free handwriting fonts in seconds.',
    tag: 'MODULE_04',
    phase: 'find-font',
    badge: 'Instant Match',
    question: 'How does the InkTwin handwriting font matcher work?',
    answer: 'InkTwin matches uploaded handwriting photos with the closest free handwriting font alternatives in our curated database.',
    benefits: ['Rapid font identification', 'Instant free alternative recommendations', 'Style vector matching', 'One-tap send to writer']
  },
  {
    icon: Sparkles,
    title: 'AI Humanizer',
    desc: 'Transform stiff AI answers into authentic student phrasing and natural classroom tone.',
    tag: 'MODULE_05',
    phase: 'ai-humanizer',
    badge: '5 Personas',
    question: 'How does the InkTwin AI Humanizer work?',
    answer: 'InkTwin uses tone models to rewrite robotic text into genuine student language while maintaining 100% accuracy.',
    benefits: ['5 student persona styles', 'Natural flow without AI tells', 'Side-by-side comparison', 'One-click send to writer']
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSaveKey, onExplore, theme, onToggleTheme }) => {
  const [keyInput, setKeyInput] = useState('');
  const [demoText, setDemoText] = useState('InkTwin turns your handwriting into a real digital font.');
  const [demoInk, setDemoInk] = useState('#1e3a8a'); // Royal Blue

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim()) onSaveKey(keyInput.trim());
  };

  const samplePhrases = [
    "InkTwin turns your handwriting into a real font.",
    "Chemistry Lab: Reaction rates under 25°C.",
    "Dear Professor, attached is my weekly report.",
    "The quick brown fox jumps over the lazy dog."
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen font-body flex flex-col selection:bg-warning-yellow selection:text-neutral-950 pb-20 md:pb-0"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b p-3.5 sm:p-5 flex items-center justify-between backdrop-blur-md bg-white/90 dark:bg-neutral-900/90"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => {
              if (window.location.hash || window.location.pathname.startsWith('/use-cases/')) {
                window.history.pushState({}, '', '/');
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 text-left bg-transparent border-0 p-0 cursor-pointer group active:scale-95 transition-transform"
            title="Go to Home"
            aria-label="Go to InkTwin Home"
          >
            <Logo size={36} showText={false} className="group-hover:scale-105 transition-transform" />
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight leading-none flex items-baseline gap-1">
                Ink<span className="text-warning-yellow">Twin</span>
              </h1>
              <span className="text-[10px] font-mono text-neutral-500 block leading-tight">
                by primuez.in
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="w-10 h-10 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {onExplore && (
            <button
              onClick={() => onExplore('font-creation')}
              className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-warning-yellow hover:bg-amber-300 text-black font-display font-bold text-xs uppercase tracking-wider items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <span>Get Started</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">

          {/* Hero Section */}
          <section className="space-y-4 text-center sm:text-left" aria-labelledby="hero-title">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning-yellow/20 text-neutral-950 dark:text-yellow-300 border border-warning-yellow/40 text-xs font-mono font-semibold">
              <Sparkles size={14} className="text-warning-yellow" />
              <span>Mobile-First Handwriting AI Studio</span>
            </div>

            <h2 id="hero-title" className="font-display font-extrabold uppercase tracking-tight text-3xl sm:text-5xl md:text-6xl leading-[1.05]">
              Your handwriting.
              <br />
              <span className="text-warning-yellow">Digitally Yours.</span>
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
              Convert real handwriting into TrueType (.ttf) fonts, write realistic handwritten assignments on paper, and solve homework with AI in your handwriting. 100% free and client-side safe.
            </p>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start pt-2">
              <button
                onClick={() => onExplore?.('font-creation')}
                className="px-5 py-3 rounded-xl bg-warning-yellow hover:bg-amber-300 text-black font-display font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <PenTool size={18} />
                <span>Create My Font</span>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => onExplore?.('text-writer')}
                className="px-5 py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-display font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <FileText size={18} />
                <span>Open Studio Writer</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-3 pt-3 justify-center sm:justify-start text-xs font-mono text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-warning-yellow" /> Free Forever
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-warning-yellow" /> Local &amp; Private
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap size={14} className="text-warning-yellow" /> Instant TTF Export
              </span>
            </div>
          </section>

          {/* Interactive Mobile Live Handwriting Demo */}
          <section className="relative rounded-2xl border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold block">
                  Interactive Live Demo
                </span>
                <h3 className="font-display font-bold text-base sm:text-lg text-neutral-900 dark:text-white">
                  Experience Handwriting Simulation
                </h3>
              </div>

              {/* Ink Color Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-500">Ink:</span>
                {[
                  { name: 'Royal Blue', color: '#1e3a8a' },
                  { name: 'Classic Black', color: '#18181b' },
                  { name: 'Emerald', color: '#047857' },
                  { name: 'Ballpoint Red', color: '#b91c1c' },
                ].map((ink) => (
                  <button
                    key={ink.name}
                    type="button"
                    onClick={() => setDemoInk(ink.color)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform active:scale-90",
                      demoInk === ink.color ? "border-warning-yellow scale-110 shadow-sm" : "border-transparent"
                    )}
                    style={{ backgroundColor: ink.color }}
                    title={ink.name}
                  />
                ))}
              </div>
            </div>

            {/* Ruled Paper Simulation Box - Always Authentic White/Cream Paper */}
            <div 
              className="my-4 p-5 sm:p-6 rounded-xl border border-neutral-300 shadow-sm min-h-[140px] flex flex-col justify-center relative overflow-hidden handwriting-paper-surface"
              style={{
                backgroundColor: '#FAF9F6',
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(59,130,246,0.18) 28px)',
                backgroundSize: '100% 28px',
                color: '#141414'
              }}
            >
              {/* Margin line */}
              <div 
                className="absolute top-0 bottom-0 left-6 sm:left-10 w-[2px] pointer-events-none"
                style={{ backgroundColor: 'rgba(239,68,68,0.45)' }}
              />

              <p 
                className="text-lg sm:text-2xl pl-4 sm:pl-8 font-normal leading-[28px] tracking-wide break-words transition-colors"
                style={{
                  fontFamily: "'Caveat', 'Patrick Hand', 'Dancing Script', cursive",
                  color: demoInk,
                  transform: 'rotate(-0.5deg)',
                }}
              >
                {demoText || "Start typing your words below..."}
              </p>
            </div>

            {/* Interactive Demo Input & Sample Pills */}
            <div className="space-y-3">
              <input
                type="text"
                value={demoText}
                onChange={(e) => setDemoText(e.target.value)}
                placeholder="Type anything to see it handwritten..."
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-medium focus:ring-2 focus:ring-warning-yellow outline-none"
              />

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono text-neutral-500 mr-1">Try samples:</span>
                {samplePhrases.map((phrase, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDemoText(phrase)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-mono text-neutral-600 dark:text-neutral-300 transition-colors"
                  >
                    {phrase.slice(0, 24)}...
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="space-y-4" aria-labelledby="features-heading">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold block">
                  Studio Toolkit
                </span>
                <h3 id="features-heading" className="font-display font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white">
                  Five Powerful Handwriting Tools
                </h3>
              </div>
              {onExplore && (
                <button
                  onClick={() => onExplore('font-creation')}
                  className="text-xs font-mono font-bold text-warning-yellow hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Explore All <ChevronRight size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {features.map((f, idx) => {
                const IconComponent = f.icon;
                return (
                  <article
                    key={f.title}
                    onClick={() => onExplore?.(f.phase)}
                    className={cn(
                      "p-5 sm:p-6 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-900 dark:hover:border-neutral-600 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md cursor-pointer",
                      idx === 0 && "sm:col-span-2 md:col-span-2",
                      idx === 3 && "sm:col-span-2 md:col-span-1"
                    )}
                  >
                    <div className="sr-only">
                      <h2>{f.question}</h2>
                      <p>{f.answer}</p>
                      <ul>{f.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-warning-yellow/15 text-neutral-950 dark:text-warning-yellow flex items-center justify-center group-hover:scale-105 transition-transform">
                          <IconComponent size={24} />
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                          {f.badge}
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-lg text-neutral-900 dark:text-white mb-2 group-hover:text-warning-yellow transition-colors flex items-center justify-between">
                        <span>{f.title}</span>
                        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h4>
                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {f.desc}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-neutral-400">{f.tag}</span>
                      <span className="text-xs font-mono font-semibold text-warning-yellow flex items-center gap-1">
                        Launch <ChevronRight size={14} />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* How It Works - 3 Easy Steps on Mobile */}
          <section className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold block">
                Workflow
              </span>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white">
                How It Works on Mobile
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-warning-yellow text-neutral-950 font-display font-bold flex items-center justify-center text-sm">
                  1
                </div>
                <h4 className="font-display font-bold text-sm text-neutral-900 dark:text-white">
                  Snap or Draw Letters
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Take a photo of your paper or draw missing letters directly on your screen using your finger or stylus.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-warning-yellow text-neutral-950 font-display font-bold flex items-center justify-center text-sm">
                  2
                </div>
                <h4 className="font-display font-bold text-sm text-neutral-900 dark:text-white">
                  AI Detects &amp; Vectorizes
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  InkTwin automatically extracts glyph bounding boxes, cleans ink strokes, and builds your custom .ttf font file.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-warning-yellow text-neutral-950 font-display font-bold flex items-center justify-center text-sm">
                  3
                </div>
                <h4 className="font-display font-bold text-sm text-neutral-900 dark:text-white">
                  Write &amp; Export PDFs
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Type any text and download realistic multi-page handwritten documents with natural ink variance.
                </p>
              </div>
            </div>
          </section>

          {/* Gemini API Key Setup Card */}
          <section
            className="rounded-2xl border-2 border-neutral-300 dark:border-neutral-700 p-6 space-y-5 bg-white dark:bg-neutral-900 shadow-lg"
            aria-labelledby="setup-heading"
          >
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold block mb-1">
                [BYOK_SETUP] FREE GEMINI API KEY
              </span>
              <h3 id="setup-heading" className="font-display font-bold text-2xl text-neutral-900 dark:text-white">
                Connect Google Gemini
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                A free Gemini API key enables AI character extraction and the homework solver. No credit card required.
              </p>
            </div>

            <ol className="space-y-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
              <li className="flex gap-2.5 items-start">
                <span className="w-6 h-6 rounded-md bg-warning-yellow text-neutral-950 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  Go to{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-warning-yellow underline decoration-2 underline-offset-2 inline-flex items-center gap-0.5"
                  >
                    Google AI Studio <ChevronRight size={14} />
                  </a>{' '}
                  and click "Create API Key".
                </span>
              </li>
              <li className="flex gap-2.5 items-start">
                <span className="w-6 h-6 rounded-md bg-warning-yellow text-neutral-950 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <span>Paste your key below (stored securely only on your device).</span>
              </li>
            </ol>

            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-mono focus:ring-2 focus:ring-warning-yellow outline-none"
              />

              <button
                type="submit"
                disabled={!keyInput.trim()}
                className="w-full py-3 rounded-xl bg-warning-yellow hover:bg-amber-300 text-black font-display font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>Save Key &amp; Start</span>
                <ChevronRight size={18} />
              </button>

              {onExplore && (
                <button
                  type="button"
                  onClick={() => onExplore('font-creation')}
                  className="w-full py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Explore App Without Key</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </form>
          </section>

          {/* Founder Note & Support */}
          <article className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-5 sm:p-6 space-y-3">
            <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold block">
              📌 Founder Memo
            </span>
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 italic">
              "Built by a student who suffered a hand injury and got an F for typed assignments. Built 100% free so no student or creator ever faces that frustration again."
            </p>
            <p className="text-xs font-mono font-semibold text-neutral-500 text-right">
              — Rahul (<a href="https://primuez.in" target="_blank" rel="noopener noreferrer" className="text-warning-yellow hover:underline">primuez.in</a>)
            </p>
          </article>

          {/* Support Section */}
          <section className="space-y-3" aria-labelledby="support-heading">
            <SupportCard />
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer
        className="border-t p-4 sm:p-6 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <span className="font-mono text-[11px]">
          InkTwin · A{' '}
          <a
            href="https://primuez.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-neutral-900 dark:text-white hover:text-warning-yellow transition-colors"
          >
            Primuez.in
          </a>{' '}
          Project
        </span>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>Free Forever</span>
          <div className="w-2 h-2 bg-warning-yellow rounded-full animate-pulse" />
        </div>
      </footer>
    </motion.div>
  );
};
