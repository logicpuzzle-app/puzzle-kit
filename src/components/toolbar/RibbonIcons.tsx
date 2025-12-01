/**
 * RibbonIcons - SVG icons used in the Ribbon toolbar
 */

import React from 'react';

// Eye icons for visibility toggle
export const EyeIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// Checkbox icons for constraint layer toggle
export const CheckboxIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <polyline points="9 11 12 14 22 4" />
  </svg>
);

export const CheckboxEmptyIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

// SVG Icons for special tools - matching actual render appearance
export const ThermoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Thermo line (drawn first, behind bulb) */}
    <path
      d="M 6 18 L 6 6 L 12 6 L 18 6"
      stroke="#cfcfcf"
      strokeWidth="4"
      fill="none"
    />
    {/* Bulb at start - gray fill with thin border */}
    <circle cx="6" cy="18" r="5" fill="#cfcfcf" stroke="#cfcfcf" strokeWidth="1" />
  </svg>
);

export const ArrowIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Circle at start - hollow */}
    <circle cx="6" cy="12" r="5" fill="none" strokeWidth="1.5" />
    {/* Arrow line - thin */}
    <path d="M 11 12 L 20 12" strokeWidth="1.5" />
    {/* Arrow head */}
    <path d="M 20 12 L 16 9 M 20 12 L 16 15" strokeWidth="1.5" />
  </svg>
);

export const CageIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Dashed cage boundary - inset from cell edge */}
    <rect x="5" y="5" width="14" height="14" strokeDasharray="3,3" strokeWidth="1.5" fill="none" />
    {/* Small number in top-left corner */}
    <text x="6" y="11" fontSize="7" fontFamily="Helvetica, Arial, sans-serif" fill="currentColor" stroke="none">12</text>
  </svg>
);

export const BoxLineIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* L-shaped snake path: 3 cells with 90% polygons and connecting polygons */}
    {/* Top-left cell polygon (90% size) */}
    <polygon points="2.5,2.5 9.5,2.5 9.5,9.5 2.5,9.5" />
    {/* Bottom-left cell polygon (90% size) */}
    <polygon points="2.5,14.5 9.5,14.5 9.5,21.5 2.5,21.5" />
    {/* Bottom-right cell polygon (90% size) */}
    <polygon points="14.5,14.5 21.5,14.5 21.5,21.5 14.5,21.5" />
    {/* Vertical connection polygon (shared edge vertices) */}
    <polygon points="2.5,9.5 9.5,9.5 9.5,14.5 2.5,14.5" />
    {/* Horizontal connection polygon (shared edge vertices) */}
    <polygon points="9.5,14.5 9.5,21.5 14.5,21.5 14.5,14.5" />
  </svg>
);

// Map tool IDs to SVG icons
export const SPECIAL_TOOL_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'special-thermo': ThermoIcon,
  'special-arrow': ArrowIcon,
  'special-cage': CageIcon,
  'special-boxline': BoxLineIcon,
};
