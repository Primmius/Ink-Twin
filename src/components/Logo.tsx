import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 36, showText = true, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 60 60"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="InkTwin logo"
      >
        <rect x="16" y="4" width="14" height="28" rx="4" className="logo-dark-part" fill="#111" />
        <rect x="30" y="4" width="14" height="28" rx="4" fill="#2ecc40" />
        <path d="M16,32 L23,52 L30,44 Z" className="logo-dark-part" fill="#111" />
        <path d="M44,32 L37,52 L30,44 Z" fill="#2ecc40" />
        <ellipse cx="30" cy="55" rx="4" ry="5" fill="#2ecc40" />
      </svg>
      {showText && (
        <span className="font-display uppercase tracking-tighter leading-none text-2xl md:text-3xl">
          Ink<span style={{ color: '#2ecc40' }}>Twin</span>
        </span>
      )}
    </div>
  );
};
