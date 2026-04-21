import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { Logo } from './Logo';
import { SupportCard } from './SupportCard';

interface LandingPageProps {
  onSaveKey: (key: string) => void;
}

const features = [
  {
    emoji: '✏️',
    title: 'Create My Font',
    desc: 'Upload a photo of your handwriting. Get a real .ttf font file.',
  },
  {
    emoji: '📝',
    title: 'Write with My Handwriting',
    desc: 'Type anything. Download it looking handwritten on real paper.',
  },
  {
    emoji: '🎓',
    title: 'AI Study Assistant',
    desc: 'Upload any homework question. AI solves it in your handwriting.',
  },
  {
    emoji: '🔍',
    title: 'Find My Font',
    desc: 'Upload any handwriting photo. We find your closest free font match.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSaveKey }) => {
  const [keyInput, setKeyInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyInput.trim();
    if (trimmed) onSaveKey(trimmed);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen theme-bg font-body flex flex-col border-[8px] border-brutal-black selection:bg-neon-green selection:text-brutal-black"
    >
      {/* Header */}
      <header className="border-b-2 border-brutal-black p-4 md:p-6 flex items-center justify-between bg-[var(--bg-primary)]">
        <div className="flex items-center gap-3">
          <Logo size={40} showText={false} />
          <h1 className="text-2xl md:text-4xl font-display uppercase tracking-tighter leading-none">
            Ink<span style={{ color: 'var(--neon-green)' }}>Twin</span>
          </h1>
        </div>
        <span className="font-mono text-[10px] opacity-50 hidden sm:block uppercase">
          [V1.0] HANDWRITING ENGINE
        </span>
      </header>

      <main className="flex-grow overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-12">
          {/* Hero */}
          <section className="space-y-4">
            <p className="font-mono text-[11px] uppercase opacity-60 tracking-widest">
              [PHASE_00] WELCOME_PROTOCOL
            </p>
            <h2 className="font-display uppercase tracking-tighter leading-[0.92] text-5xl md:text-7xl break-words">
              Your handwriting.
              <br />
              <span style={{ color: 'var(--neon-green)' }}>Digitally yours.</span>
            </h2>
            <p className="font-mono text-sm md:text-base opacity-80 max-w-2xl">
              Type in your own handwriting. Solve homework with AI. Find your closest font match. All free,
              forever.
            </p>
          </section>

          {/* Features */}
          <section className="space-y-3">
            <h3 className="font-mono text-[10px] uppercase opacity-60 tracking-widest">
              [MODULES] WHAT_YOU_GET
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="brutal-card brutal-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  <div className="text-3xl mb-3">{f.emoji}</div>
                  <h4 className="font-display uppercase text-base mb-2 tracking-tight">{f.title}</h4>
                  <p className="font-mono text-xs opacity-70 leading-snug">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Founder note */}
          <section className="brutal-card brutal-shadow">
            <p className="font-mono text-[10px] uppercase opacity-60 tracking-widest mb-2">
              [FOUNDER_NOTE]
            </p>
            <p className="text-sm leading-relaxed">
              "Built by a student who got an F for typed work after a hand injury. Built free so no one
              else has to."
            </p>
            <p className="font-mono text-xs opacity-70 mt-2">— Rahul, Founder</p>
          </section>

          {/* API Key Setup */}
          <section className="brutal-card brutal-shadow space-y-5">
            <div>
              <p className="font-mono text-[10px] uppercase opacity-60 tracking-widest mb-2">
                [SETUP_REQUIRED] API_KEY
              </p>
              <h3 className="font-display uppercase text-3xl md:text-4xl tracking-tighter leading-none">
                Get Started Free
              </h3>
              <p className="font-mono text-xs opacity-70 mt-2">
                You need a free Gemini API key to use InkTwin. It takes 2 minutes and costs nothing.
              </p>
            </div>

            <ol className="space-y-3">
              <li className="flex gap-3 items-start">
                <span className="bg-neon-green text-brutal-black font-display uppercase text-xs px-2 py-1 brutal-border shrink-0">
                  01
                </span>
                <span className="text-sm">
                  Go to{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline decoration-2 underline-offset-2 hover:text-[var(--neon-green)] inline-flex items-center gap-1"
                  >
                    aistudio.google.com <ChevronRight size={14} />
                  </a>{' '}
                  and click "Get API Key" → "Create".
                </span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="bg-neon-green text-brutal-black font-display uppercase text-xs px-2 py-1 brutal-border shrink-0">
                  02
                </span>
                <span className="text-sm">Paste your key below.</span>
              </li>
            </ol>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="font-mono text-[10px] font-bold uppercase opacity-60 tracking-widest block">
                Your Gemini API Key
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Paste your Gemini API key here..."
                autoComplete="new-password"
                className="w-full px-4 py-3 brutal-border font-mono outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:bg-[color-mix(in_srgb,var(--neon-green)_15%,transparent)]"
              />
              <button
                type="submit"
                disabled={!keyInput.trim()}
                className="w-full brutal-btn brutal-btn-primary brutal-shadow text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Start Using InkTwin <ChevronRight size={18} />
              </button>
              <p className="font-mono text-[10px] opacity-60 text-center uppercase">
                Your key is stored only in your browser. Never sent to our servers. 🔒
              </p>
            </form>
          </section>

          {/* Support */}
          <section className="space-y-3">
            <h3 className="font-mono text-[10px] uppercase opacity-60 tracking-widest">
              [OPTIONAL] SUPPORT_THE_PROJECT
            </h3>
            <SupportCard />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-brutal-black p-4 md:p-6 flex items-center justify-between bg-[var(--bg-primary)]">
        <span className="font-mono text-[10px] opacity-40 uppercase">
          INKTWIN_ENGINE_STABLE_V1.0
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] opacity-40 uppercase">Free forever</span>
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
        </div>
      </footer>
    </motion.div>
  );
};
