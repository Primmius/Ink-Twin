import React from 'react';

interface SupportCardProps {
  id?: string;
  className?: string;
}

export const SupportCard: React.FC<SupportCardProps> = ({ id, className = '' }) => {
  return (
    <div
      id={id}
      className={`brutal-card brutal-shadow ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">☕</span>
        <h3 className="font-display uppercase text-sm tracking-tight">Support InkTwin</h3>
      </div>
      <p className="font-mono text-[11px] opacity-70 leading-snug mb-4">
        Built free by a student, for students. If this helped you, consider buying me a coffee.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href="https://rzp.io/rzp/xxegcrlA"
          target="_blank"
          rel="noopener noreferrer"
          className="brutal-btn flex-1 text-center text-[11px] py-2"
        >
          ☕ Razorpay (IN)
        </a>
        <a
          href="https://ko-fi.com/primuez"
          target="_blank"
          rel="noopener noreferrer"
          className="brutal-btn flex-1 text-center text-[11px] py-2"
        >
          ❤️ Ko-fi (Global)
        </a>
      </div>
      <p className="font-mono text-[10px] opacity-50 mt-3 text-center uppercase">
        100% free forever. No pressure. 🙏
      </p>
    </div>
  );
};
