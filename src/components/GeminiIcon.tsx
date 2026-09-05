import React from 'react';

interface GeminiIconProps {
  className?: string;
  size?: number;
  color?: string; // Primary theme color
  accentColor?: string; // Secondary theme accent
  filled?: boolean;
}

/**
 * GeminiIcon
 * A vector representation of the iconic Gemini sparkle symbol that
 * seamlessly responds to the journal's active theme palette and dark mode.
 */
export const GeminiIcon: React.FC<GeminiIconProps> = ({
  className = 'h-5 w-5',
  size,
  color = 'currentColor',
  accentColor,
  filled = true,
}) => {
  const effectiveSecondary = accentColor || color;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gemini-theme-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} />
          <stop offset="1" stopColor={effectiveSecondary} />
        </linearGradient>
      </defs>

      {/* Primary 4-point Gemini star */}
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z"
        fill={filled ? "url(#gemini-theme-grad)" : "none"}
        stroke={color}
        strokeWidth={filled ? "0.5" : "1.75"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Companion micro sparkle */}
      <path
        d="M19 2.5C19 4.433 17.433 6 15.5 6C17.433 6 19 7.567 19 9.5C19 7.567 20.567 6 22.5 6C20.567 6 19 4.433 19 2.5Z"
        fill={filled ? effectiveSecondary : "none"}
        stroke={effectiveSecondary}
        strokeWidth={filled ? "0.3" : "1.25"}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
};
