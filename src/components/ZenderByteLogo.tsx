/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ZenderByteLogoProps {
  variant?: 'hero' | 'icon' | 'badge';
  className?: string;
}

export const ZenderByteLogo: React.FC<ZenderByteLogoProps> = ({ variant = 'hero', className = '' }) => {
  if (variant === 'icon') {
    return (
      <svg
        className={`w-5 h-5 text-blue-500 ${className}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
    );
  }

  if (variant === 'badge') {
    return (
      <div className="glass p-1.5 rounded-xl shadow-lg bg-black/40 border border-white/10 backdrop-blur-md inline-flex items-center justify-center">
        <svg
          className="w-5 h-5 text-blue-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
      </div>
    );
  }

  // Exact official ZenderByte logo container and SVG markup
  return (
    <div className={`glass p-5 sm:p-6 rounded-[2.5rem] mb-4 sm:mb-6 shadow-2xl bg-black/40 border border-white/10 backdrop-blur-md inline-flex items-center justify-center ${className}`}>
      <svg
        className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-blue-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
    </div>
  );
};
