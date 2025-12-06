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

// Constraint layer icons
export const PresetIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Clipboard with list */}
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="8" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="16" y2="14" />
    <line x1="8" y1="18" x2="12" y2="18" />
  </svg>
);

export const CommonIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Circle with dot - common/shared */}
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

export const ProblemInputIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Pencil writing */}
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

export const AnswerInputIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Edit/pencil icon */}
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

export const ValidationIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Checkmark in circle */}
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const ConstraintIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Settings/cog icon for constraints */}
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// Map tool IDs to SVG icons
export const SPECIAL_TOOL_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'special-thermo': ThermoIcon,
  'special-arrow': ArrowIcon,
  'special-cage': CageIcon,
  'special-boxline': BoxLineIcon,
};

// Constraint sub-category icons
export const CONSTRAINT_ICONS = {
  common: CommonIcon,
  'problem-input': ProblemInputIcon,
  'answer-input': AnswerInputIcon,
  validation: ValidationIcon,
  preset: PresetIcon,
  constraint: ConstraintIcon,
};
