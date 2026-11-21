'use client';

import React from 'react';

interface SchoolLogoProps {
  logoUrl?: string | null;
  name?: string;
  className?: string;
  size?: number; // Size in px (e.g. 36, 40, 48, 64)
  fallbackToDefault?: boolean;
}

/**
 * Reusable School Logo / Crest Component
 * Renders the custom white-label transparent school crest if provided,
 * or cleanly falls back to the official Aegis Shield SVG/PNG.
 */
export function SchoolLogo({
  logoUrl,
  name = 'School Crest',
  className = 'h-10 w-10 object-contain shrink-0',
  size,
  fallbackToDefault = true,
}: SchoolLogoProps) {
  const [imageError, setImageError] = React.useState(false);

  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  if (logoUrl && !imageError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        style={style}
        className={`${className} transition-opacity duration-200 select-none`}
        onError={() => setImageError(true)}
      />
    );
  }

  if (!fallbackToDefault) {
    return null;
  }

  // Official Aegis Default Shield Logo
  return (
    <img
      src="/aegis-logo.png"
      alt={name || 'Aegis Academy Crest'}
      style={style}
      className={`${className} transition-opacity duration-200 select-none`}
    />
  );
}
