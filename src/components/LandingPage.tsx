import React, { useState } from 'react';
import { motion } from 'motion/react';
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
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-white text-brutal-black dark:bg-neutral-950 dark:text-white"
    >
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-16 space-y-12">
        <header className="flex items-center justify-between">
          <Logo size={42} />
        </header>

        <section className="space-y-5 text-center md:text-left">
          <h1 className="font-display uppercase tracking-tighter leading-[0.95] text-5xl md:text-7xl">
            Your handwriting.
            <br />
            <span style={{ color: '#2ecc40' }}>Digitally yours.</span>
          </h1>
          <p className="text-base md:text-xl opacity-80 max-w-2xl">
            Type in your own handwriting. Solve homework with AI. Find your closest font match. All free,
            forever.
          </p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="border-2 border-brutal-black p-4 bg-white dark:bg-neutral-900 brutal-shadow"
            >
              <div className="text-3xl mb-2">{f.emoji}</div>
              <div className="font-display uppercase text-sm mb-2">{f.title}</div>
              <p className="text-xs opacity-80 leading-snug">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="border-l-4 pl-4 py-2 text-sm opacity-80" style={{ borderColor: '#2ecc40' }}>
          "Built by a student who got an F for typed work after a hand injury. Built free so no one else
          has to."
          <div className="text-xs mt-1 opacity-70">— Rahul, Founder</div>
        </section>

        <section className="border-2 border-brutal-black p-6 md:p-8 bg-neutral-50 dark:bg-neutral-900 space-y-5">
          <div>
            <h2 className="font-display uppercase text-2xl md:text-3xl">Get Started Free</h2>
            <p className="text-sm opacity-80 mt-1">
              You need a free Gemini API key to use InkTwin. It takes 2 minutes and costs nothing.
            </p>
          </div>

          <ol className="space-y-2 text-sm">
            <li>
              <span className="font-bold">Step 1:</span> Go to{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: '#2ecc40' }}
              >
                aistudio.google.com
              </a>{' '}
              → Get API Key → Create
            </li>
            <li>
              <span className="font-bold">Step 2:</span> Paste your key below
            </li>
          </ol>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste your Gemini API key here..."
              className="w-full px-4 py-3 border-2 border-brutal-black font-mono outline-none bg-white dark:bg-neutral-950"
            />
            <button
              type="submit"
              className="w-full px-4 py-3 border-2 border-brutal-black font-display uppercase text-sm text-brutal-black brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              style={{ backgroundColor: '#2ecc40' }}
            >
              Start Using InkTwin →
            </button>
            <p className="text-xs opacity-70 text-center">
              Your key is stored only in your browser. Never sent to our servers. 🔒
            </p>
          </form>
        </section>

        <SupportCard />

        <footer className="text-xs opacity-60 text-center pt-4">
          InkTwin — Free forever.
        </footer>
      </div>
    </motion.div>
  );
};
