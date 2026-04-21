import React from 'react';

interface SupportCardProps {
  id?: string;
  className?: string;
}

export const SupportCard: React.FC<SupportCardProps> = ({ id, className = '' }) => {
  return (
    <div
      id={id}
      className={`border-2 border-brutal-black bg-neutral-50 dark:bg-neutral-900 p-4 text-sm ${className}`}
    >
      <div className="font-display uppercase text-xs mb-2 flex items-center gap-2">
        <span>☕</span> Support InkTwin
      </div>
      <p className="text-xs leading-snug opacity-80 mb-3">
        Built free by a student, for students. If this helped you, consider buying me a coffee!
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href="https://rzp.io/rzp/xxegcrlA"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center px-3 py-2 border-2 border-brutal-black bg-white hover:bg-neon-green transition-colors text-xs font-bold uppercase"
        >
          ☕ Razorpay (India)
        </a>
        <a
          href="https://ko-fi.com/primuez"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center px-3 py-2 border-2 border-brutal-black bg-white hover:bg-neon-green transition-colors text-xs font-bold uppercase"
        >
          ❤️ Ko-fi (Global)
        </a>
      </div>
      <p className="text-[10px] text-neutral-500 mt-2 text-center">
        100% free forever. No pressure. 🙏
      </p>
    </div>
  );
};
