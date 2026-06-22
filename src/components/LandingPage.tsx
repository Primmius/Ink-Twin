import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Moon, Sun } from 'lucide-react';
import { Logo } from './Logo';
import { SupportCard } from './SupportCard';
import { cn } from '../lib/utils';

interface LandingPageProps {
  onSaveKey: (key: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const features = [
  {
    emoji: '✏️',
    title: 'Create My Font',
    desc: 'Upload a photo of your handwriting. Get a real .ttf font file.',
    tag: 'MODULE_01 // CREATIVE',
    accentShadow: 'hover:shadow-[7px_7px_0px_#00FF00]',
    question: 'How does the InkTwin handwriting font creator work?',
    answer: 'InkTwin converts photographs of natural handwriting into fully functional, high-fidelity downloadable TTF font files using state-of-the-art vector trace algorithms.',
    benefits: ['Automatic handwriting vectorization','Universal TTF font generation','Custom glyph adjustment controls','Offline font safety and privacy']
  },
  {
    emoji: '📝',
    title: 'Write with My Handwriting',
    desc: 'Type anything. Download it looking handwritten on real paper.',
    tag: 'MODULE_02 // UTILITY',
    accentShadow: 'hover:shadow-[7px_7px_0px_#FFD700]',
    question: 'How does the InkTwin text-to-handwriting generator work?',
    answer: 'InkTwin renders typed inputs as natural handwritten documents on lined paper using custom handwriting fonts with advanced line-height variance and ink-bleed simulation.',
    benefits: ['Realistic ink color & bleed adjustment','Dynamic letter spacing','Custom paper background styles','Instant high-definition image downloads']
  },
  {
    emoji: '🎓',
    title: 'AI Study Assistant',
    desc: 'Upload any homework question. AI solves it in your handwriting.',
    tag: 'MODULE_03 // ACADEMIC',
    accentShadow: 'hover:shadow-[7px_7px_0px_#FF4B5C]',
    question: 'How does the InkTwin AI homework study assistant function?',
    answer: 'InkTwin integrates with the advanced Gemini API to process and solve academic questions, rendering answers in your unique handwriting style.',
    benefits: ['High-accuracy Gemini AI','Direct homework synthesis in your font','Automated document generation','Flexible BYOK access model']
  },
  {
    emoji: '🔍',
    title: 'Find My Font',
    desc: 'Upload any handwriting photo. We find your closest free font match.',
    tag: 'MODULE_04 // SEARCH',
    accentShadow: 'hover:shadow-[7px_7px_0px_#3B82F6]',
    question: 'How does the InkTwin handwriting font matcher work?',
    answer: 'InkTwin matches uploaded handwriting photos with the closest free handwriting font alternatives in our extensive database.',
    benefits: ['Rapid font identification','Instant free alternative recommendation','Image vector analysis matching','Seamless fallback for quick workflows']
  },
];

const card = {
  base: "p-6 border-2 hover:-translate-x-1 hover:-translate-y-1 transition-all duration-200 cursor-default",
};

export const LandingPage: React.FC<LandingPageProps> = ({ onSaveKey, theme, onToggleTheme }) => {
  const [keyInput, setKeyInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim()) onSaveKey(keyInput.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen font-body flex flex-col border-[8px] selection:bg-warning-yellow selection:text-brutal-black"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Header */}
      <header
        className="border-b-2 p-4 md:p-6 flex items-center justify-between"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-3">
          <Logo size={40} showText={false} />
          <h1 className="text-2xl md:text-4xl font-display uppercase tracking-tighter leading-none flex items-baseline gap-2">
            Ink<span style={{ color: 'var(--neon-green)' }}>Twin</span>
            <a
              href="https://primuez.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] lowercase tracking-normal opacity-60 hover:opacity-100 transition-all"
              style={{ color: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--warning-yellow)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}
            >
              by primuez.in
            </a>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] opacity-50 hidden sm:block uppercase">[V1.0] HANDWRITING ENGINE</span>
          <button
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="w-10 h-10 border-2 flex items-center justify-center transition-all duration-150 hover:-translate-y-[2px] hover:-translate-x-[2px] active:translate-x-px active:translate-y-px"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
              boxShadow: '2px 2px 0px var(--shadow-color)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--warning-yellow)';
              (e.currentTarget as HTMLButtonElement).style.color = '#141414';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#141414';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '3px 3px 0px var(--shadow-color)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-card)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-primary)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 0px var(--shadow-color)';
            }}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-12">

          {/* Hero */}
          <section className="space-y-4" aria-labelledby="hero-title">
            <p className="font-mono text-[11px] uppercase opacity-60 tracking-widest">[PHASE_00] WELCOME_PROTOCOL</p>
            <h2 id="hero-title" className="font-display uppercase tracking-tighter leading-[0.92] text-5xl md:text-7xl break-words">
              Your handwriting.
              <br />
              <span style={{ color: 'var(--warning-yellow)' }}>Digitally yours.</span>
            </h2>
            <p className="font-mono text-sm md:text-base max-w-2xl" style={{ opacity: 0.8 }}>
              Type in your own handwriting. Solve homework with AI. Find your closest font match. All free, forever. Built for students who care about work presentation.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="bg-warning-yellow text-brutal-black text-[10px] font-mono font-bold uppercase px-3 py-1 border-2 border-brutal-black rounded-full" style={{ boxShadow: '2px 2px 0px var(--shadow-color)' }}>
                🎓 Student Approved
              </span>
              <span className="bg-neon-green text-brutal-black text-[10px] font-mono font-bold uppercase px-3 py-1 border-2 border-brutal-black rounded-full" style={{ boxShadow: '2px 2px 0px var(--shadow-color)' }}>
                ⚡ 100% Free
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-3 py-1 border-2 rounded-full" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)', boxShadow: '2px 2px 0px var(--shadow-color)' }}>
                🔒 Local &amp; Private
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-3 py-1 border-2 rounded-full" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)', boxShadow: '2px 2px 0px var(--shadow-color)' }}>
                ✍️ Save Hand Strain
              </span>
            </div>
          </section>

          {/* Features Bento Grid */}
          <section className="space-y-3" aria-labelledby="features-heading">
            <h3 id="features-heading" className="font-mono text-[10px] uppercase opacity-60 tracking-widest">
              [STUDENT_TOOLKIT] WHAT_YOU_CAN_DO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((f, idx) => (
                <article
                  key={f.title}
                  className={cn(
                    card.base,
                    f.accentShadow,
                    idx === 0 && "md:col-span-2",
                    idx === 3 && "md:col-span-2",
                  )}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    boxShadow: '4px 4px 0px var(--shadow-color)',
                  }}
                >
                  <div className="sr-only">
                    <h2>{f.question}</h2>
                    <p>{f.answer}</p>
                    <ul>{f.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl">{f.emoji}</div>
                    <span
                      className="font-mono text-[9px] uppercase tracking-wider opacity-50 px-2 py-0.5 border rounded"
                      style={{ borderColor: 'var(--border-primary)' }}
                    >
                      {f.tag}
                    </span>
                  </div>
                  <h4 className="font-display uppercase text-lg mb-2 tracking-tight">{f.title}</h4>
                  <p className="font-mono text-xs leading-snug" style={{ opacity: 0.72 }}>{f.desc}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Founder note — sticky note style */}
          <article
            className="border-2 p-6 rounded-[4px] md:rotate-1 hover:rotate-0 transition-transform duration-300"
            style={{
              backgroundColor: theme === 'dark' ? '#1e1e10' : '#FFFDE7',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-primary)',
              boxShadow: '4px 4px 0px var(--shadow-color)',
            }}
          >
            <p className="font-mono text-[10px] uppercase opacity-75 tracking-widest mb-2 pb-1" style={{ borderBottom: '1px solid var(--border-primary)' }}>
              📌 [FOUNDER_MEMO]
            </p>
            <p className="text-sm leading-relaxed italic font-display">
              "Built by a student who got an F for typed work after a hand injury. Built 100% free by{' '}
              <a
                href="https://primuez.in"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold transition-all"
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--warning-yellow)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}
              >
                Primuez.in
              </a>{' '}
              so no student ever has to go through that again."
            </p>
            <p className="font-mono text-xs opacity-80 mt-3 text-right">— Rahul, Founder</p>
          </article>

          {/* API Key Setup */}
          <section
            className="border-2 p-6 space-y-5"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
              boxShadow: '4px 4px 0px var(--shadow-color)',
            }}
            aria-labelledby="setup-heading"
          >
            <div>
              <p className="font-mono text-[10px] uppercase opacity-60 tracking-widest mb-2">[SETUP_REQUIRED] API_KEY</p>
              <h3 id="setup-heading" className="font-display uppercase text-3xl md:text-4xl tracking-tighter leading-none">
                Get Started Free
              </h3>
              <p className="font-mono text-xs opacity-70 mt-2">
                You need a free Gemini API key to use InkTwin. It takes 2 minutes and costs nothing.
              </p>
            </div>

            <ol className="space-y-3">
              <li className="flex gap-3 items-start">
                <span
                  className="font-display uppercase text-xs px-2 py-1 border-2 shrink-0"
                  style={{ backgroundColor: 'var(--warning-yellow)', color: '#141414', borderColor: 'var(--border-primary)' }}
                >
                  01
                </span>
                <span className="text-sm">
                  Go to{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline decoration-2 underline-offset-2 inline-flex items-center gap-1 transition-all"
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--warning-yellow)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}
                  >
                    aistudio.google.com <ChevronRight size={14} />
                  </a>{' '}
                  and click "Get API Key" → "Create".
                </span>
              </li>
              <li className="flex gap-3 items-start">
                <span
                  className="font-display uppercase text-xs px-2 py-1 border-2 shrink-0"
                  style={{ backgroundColor: 'var(--warning-yellow)', color: '#141414', borderColor: 'var(--border-primary)' }}
                >
                  02
                </span>
                <span className="text-sm">Paste your key below.</span>
              </li>
            </ol>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label
                className="font-mono text-[10px] font-bold uppercase opacity-60 tracking-widest block"
              >
                Your Gemini API Key
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Paste your Gemini API key here..."
                autoComplete="new-password"
                className="w-full px-4 py-3 border-2 font-mono outline-none"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-primary)',
                }}
              />
              <button
                type="submit"
                disabled={!keyInput.trim()}
                className="w-full brutal-btn text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--warning-yellow)',
                  color: '#141414',
                  boxShadow: '4px 4px 0px var(--shadow-color)',
                }}
              >
                Start Using InkTwin <ChevronRight size={18} />
              </button>
              <p className="font-mono text-[10px] opacity-60 text-center uppercase">
                Your key is stored only in your browser. Never sent to our servers. 🔒
              </p>
            </form>
          </section>

          {/* Support */}
          <section className="space-y-3" aria-labelledby="support-heading">
            <h3 id="support-heading" className="font-mono text-[10px] uppercase opacity-60 tracking-widest">
              [OPTIONAL] SUPPORT_THE_PROJECT
            </h3>
            <SupportCard />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="border-t-2 p-4 md:p-6 flex items-center justify-between"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
      >
        <span className="font-mono text-[10px] opacity-40 uppercase">
          A{' '}
          <a
            href="https://primuez.in"
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-all"
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--neon-green)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}
          >
            Primuez.in
          </a>{' '}
          Project
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] opacity-40 uppercase">Free forever</span>
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
        </div>
      </footer>
    </motion.div>
  );
};
