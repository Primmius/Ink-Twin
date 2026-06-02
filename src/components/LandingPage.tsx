import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { Logo } from './Logo';
import { SupportCard } from './SupportCard';
import { cn } from '../lib/utils';

interface LandingPageProps {
  onSaveKey: (key: string) => void;
}

const features = [
  {
    emoji: '✏️',
    title: 'Create My Font',
    desc: 'Upload a photo of your handwriting. Get a real .ttf font file.',
    tag: 'MODULE_01 // CREATIVE',
    question: 'How does the InkTwin handwriting font creator work?',
    answer: 'InkTwin converts photographs of natural handwriting into fully functional, high-fidelity downloadable TTF font files using state-of-the-art vector trace algorithms, allowing you to synthesize custom handwriting fonts on Replit and preserve your personal writing style digitally.',
    benefits: [
      'Automatic handwriting vectorization',
      'Universal TTF font generation',
      'Custom glyph adjustment controls',
      'Offline font safety and privacy'
    ]
  },
  {
    emoji: '📝',
    title: 'Write with My Handwriting',
    desc: 'Type anything. Download it looking handwritten on real paper.',
    tag: 'MODULE_02 // UTILITY',
    question: 'How does the InkTwin text-to-handwriting generator work?',
    answer: 'InkTwin utilizes a fast text-to-handwriting rendering engine that takes typed inputs and outputs natural, realistic handwritten documents on lined paper using custom handwriting fonts, featuring advanced line-height variance and ink-bleed simulation to look completely authentic.',
    benefits: [
      'Realistic ink color & bleed adjustment',
      'Dynamic letter spacing & hand-strain reduction',
      'Custom document paper background styles',
      'Instant high-definition image downloads'
    ]
  },
  {
    emoji: '🎓',
    title: 'AI Study Assistant',
    desc: 'Upload any homework question. AI solves it in your handwriting.',
    tag: 'MODULE_03 // ACADEMIC',
    question: 'How does the InkTwin AI homework study assistant function?',
    answer: 'InkTwin integrates with the advanced Gemini API to process and solve academic questions or homework prompts, rendering the highly accurate answers directly in your unique handwriting style, saving hours of manual drafting while preserving study output presentation.',
    benefits: [
      'High-accuracy Gemini intelligence integration',
      'Direct homework synthesis in your own font',
      'Automated handwriting document generation',
      'Flexible BYOK access model for students'
    ]
  },
  {
    emoji: '🔍',
    title: 'Find My Font',
    desc: 'Upload any handwriting photo. We find your closest free font match.',
    tag: 'MODULE_04 // SEARCH',
    question: 'How does the InkTwin handwriting font matcher search work?',
    answer: 'InkTwin matches uploaded photos of hand-written scripts with the closest free handwriting font alternatives in our extensive global database, bypassing complex creation pipelines to find clean digital handwriting matches for quick, high-speed document synthesis workflows.',
    benefits: [
      'Rapid font identification database indexing',
      'Instant closest free alternative font recommendation',
      'Image vector analysis handwriting matching',
      'Seamless fallback for quick document generation'
    ]
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSaveKey }) => {
  const [keyInput, setKeyInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyInput.trim();
    if (trimmed) onSaveKey(trimmed);
  };

  const getBentoStyle = (index: number) => {
    switch (index) {
      case 0:
        return "md:col-span-2 hover:shadow-[7px_7px_0px_var(--neon-green)] bg-white dark:bg-[#12131A]";
      case 1:
        return "md:col-span-1 hover:shadow-[7px_7px_0px_var(--warning-yellow)] bg-white dark:bg-[#12131A]";
      case 2:
        return "md:col-span-1 hover:shadow-[7px_7px_0px_#FF4B5C] bg-white dark:bg-[#12131A]";
      case 3:
        return "md:col-span-2 hover:shadow-[7px_7px_0px_#3B82F6] bg-white dark:bg-[#12131A]";
      default:
        return "md:col-span-1 bg-white dark:bg-[#12131A]";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen theme-bg font-body flex flex-col border-[8px] border-brutal-black selection:bg-warning-yellow selection:text-brutal-black"
    >
      {/* Header */}
      <header className="border-b-2 border-brutal-black p-4 md:p-6 flex items-center justify-between bg-[var(--bg-primary)]">
        <div className="flex items-center gap-3">
          <Logo size={40} showText={false} />
          <h1 className="text-2xl md:text-4xl font-display uppercase tracking-tighter leading-none flex items-baseline gap-2">
            Ink<span style={{ color: 'var(--neon-green)' }}>Twin</span>
            <a 
              href="https://primuez.in" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-mono text-[10px] lowercase tracking-normal opacity-60 hover:text-warning-yellow hover:opacity-100 transition-all"
            >
              by primuez.in
            </a>
          </h1>
        </div>
        <span className="font-mono text-[10px] opacity-50 hidden sm:block uppercase">
          [V1.0] HANDWRITING ENGINE
        </span>
      </header>

      <main className="flex-grow overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-12">
          {/* Hero */}
          <section className="space-y-4" aria-labelledby="hero-title">
            <p className="font-mono text-[11px] uppercase opacity-60 tracking-widest">
              [PHASE_00] WELCOME_PROTOCOL
            </p>
            <h2 id="hero-title" className="font-display uppercase tracking-tighter leading-[0.92] text-5xl md:text-7xl break-words">
              Your handwriting.
              <br />
              <span className="text-warning-yellow">Digitally yours.</span>
            </h2>
            <p className="font-mono text-sm md:text-base opacity-80 max-w-2xl">
              Type in your own handwriting. Solve homework with AI. Find your closest font match. All free,
              forever. Built for students who care about work presentation.
            </p>
            
            {/* Student approved chip badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span 
                className="bg-warning-yellow text-brutal-black text-[10px] font-mono font-bold uppercase px-3 py-1 border-2 border-brutal-black rounded-full select-none"
                style={{ boxShadow: '2px 2px 0px var(--shadow-color)' }}
              >
                🎓 Student Approved
              </span>
              <span 
                className="bg-neon-green text-brutal-black text-[10px] font-mono font-bold uppercase px-3 py-1 border-2 border-brutal-black rounded-full select-none"
                style={{ boxShadow: '2px 2px 0px var(--shadow-color)' }}
              >
                ⚡ 100% Free
              </span>
              <span 
                className="bg-[#E3F2FD] dark:bg-[#1E293B] text-blue-800 dark:text-blue-300 text-[10px] font-mono font-bold uppercase px-3 py-1 border-2 border-brutal-black rounded-full select-none"
                style={{ boxShadow: '2px 2px 0px var(--shadow-color)' }}
              >
                🔒 Local & Private
              </span>
              <span 
                className="bg-[#FCE4EC] dark:bg-[#3B1F2A] text-pink-800 dark:text-pink-300 text-[10px] font-mono font-bold uppercase px-3 py-1 border-2 border-brutal-black rounded-full select-none"
                style={{ boxShadow: '2px 2px 0px var(--shadow-color)' }}
              >
                ✍️ Save Hand Strain
              </span>
            </div>
          </section>

          {/* Features Asymmetric Bento Grid */}
          <section className="space-y-3" aria-labelledby="features-heading">
            <h3 id="features-heading" className="font-mono text-[10px] uppercase opacity-60 tracking-widest">
              [STUDENT_TOOLKIT] WHAT_YOU_CAN_DO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((f, idx) => (
                <article
                  key={f.title}
                  aria-labelledby={`feature-title-${idx}`}
                  className={cn(
                    "brutal-card brutal-shadow hover:-translate-x-1 hover:-translate-y-1 transition-all duration-200",
                    getBentoStyle(idx)
                  )}
                >
                  {/* Visually Hidden GEO Retrieval QA Block */}
                  <div className="sr-only">
                    <h2>{f.question}</h2>
                    <p>{f.answer}</p>
                    <ul>
                      {f.benefits.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl">{f.emoji}</div>
                    <span className="font-mono text-[9px] uppercase tracking-wider opacity-60 px-2 py-0.5 border border-brutal-black/20 dark:border-white/10 rounded">
                      {f.tag}
                    </span>
                  </div>
                  <h4 id={`feature-title-${idx}`} className="font-display uppercase text-lg mb-2 tracking-tight">{f.title}</h4>
                  <p className="font-mono text-xs opacity-75 leading-snug">{f.desc}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Founder note styled as a tilted Yellow Sticky Note */}
          <article className="border-2 border-brutal-black p-6 rounded-[4px] bg-[#FFFDE7] dark:bg-[#20211A] text-brutal-black dark:text-neutral-200 brutal-shadow md:rotate-1 hover:rotate-0 transition-transform duration-300" aria-labelledby="founder-memo-heading">
            <p id="founder-memo-heading" className="font-mono text-[10px] uppercase opacity-75 tracking-widest mb-2 border-b border-brutal-black/10 pb-1">
              📌 [FOUNDER_MEMO]
            </p>
            <p className="text-sm leading-relaxed italic font-display">
              "Built by a student who got an F for typed work after a hand injury. Built 100% free by <a href="https://primuez.in" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-[#E6B800] transition-all">Primuez.in</a> so no student ever has to go through that again."
            </p>
            <p className="font-mono text-xs opacity-80 mt-3 text-right">— Rahul, Founder</p>
          </article>

          {/* API Key Setup */}
          <section className="brutal-card brutal-shadow space-y-5" aria-labelledby="setup-heading">
            <div>
              <p className="font-mono text-[10px] uppercase opacity-60 tracking-widest mb-2">
                [SETUP_REQUIRED] API_KEY
              </p>
              <h3 id="setup-heading" className="font-display uppercase text-3xl md:text-4xl tracking-tighter leading-none">
                Get Started Free
              </h3>
              <p className="font-mono text-xs opacity-70 mt-2">
                You need a free Gemini API key to use InkTwin. It takes 2 minutes and costs nothing.
              </p>
            </div>

            <ol className="space-y-3">
              <li className="flex gap-3 items-start">
                <span className="bg-warning-yellow text-brutal-black font-display uppercase text-xs px-2 py-1 brutal-border shrink-0">
                  01
                </span>
                <span className="text-sm">
                  Go to{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline decoration-2 underline-offset-2 hover:text-warning-yellow inline-flex items-center gap-1"
                  >
                    aistudio.google.com <ChevronRight size={14} />
                  </a>{' '}
                  and click "Get API Key" → "Create".
                </span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="bg-warning-yellow text-brutal-black font-display uppercase text-xs px-2 py-1 brutal-border shrink-0">
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
                className="w-full px-4 py-3 brutal-border font-mono outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:bg-[color-mix(in_srgb,var(--warning-yellow)_15%,transparent)]"
              />
              <button
                type="submit"
                disabled={!keyInput.trim()}
                className="w-full brutal-btn bg-warning-yellow brutal-shadow text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-allowed"
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
      <footer className="border-t-2 border-brutal-black p-4 md:p-6 flex items-center justify-between bg-[var(--bg-primary)]">
        <span className="font-mono text-[10px] opacity-40 uppercase">
          A <a href="https://primuez.in" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--neon-green)] transition-all">Primuez.in</a> Project
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] opacity-40 uppercase">Free forever</span>
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
        </div>
      </footer>
    </motion.div>
  );
};
