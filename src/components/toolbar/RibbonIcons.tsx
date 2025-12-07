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

// Tool category icons
export const SurfaceIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Filled square */}
    <rect x="4" y="4" width="16" height="16" rx="1" />
  </svg>
);

export const LineIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
    {/* Horizontal line */}
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

export const NumberIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Number "1" */}
    <text x="12" y="17" fontSize="16" fontFamily="Helvetica, Arial, sans-serif" fontWeight="bold" textAnchor="middle">1</text>
  </svg>
);

export const SymbolIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    {/* Circle symbol */}
    <circle cx="12" cy="12" r="7" />
  </svg>
);

export const SpecialIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Grid/cage icon */}
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

export const NoneIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    {/* Empty circle */}
    <circle cx="12" cy="12" r="8" />
  </svg>
);

// Category icons map
export const CATEGORY_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  surface: SurfaceIcon,
  line: LineIcon,
  number: NumberIcon,
  symbol: SymbolIcon,
  special: SpecialIcon,
  none: NoneIcon,
};

// Input mode icons for constraint-aware mode
export const AutoModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Refresh/cycle arrows */}
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);

export const NumberModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* "123" numbers */}
    <text x="4" y="16" fontSize="10" fontFamily="Helvetica, Arial, sans-serif" fontWeight="bold">123</text>
  </svg>
);

export const ClearModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Eraser icon */}
    <path d="M20 20H7L3 16c-.6-.6-.6-1.5 0-2.1l10-10c.6-.6 1.5-.6 2.1 0l6 6c.6.6.6 1.5 0 2.1l-7 7" />
    <path d="M6 11l4 4" />
  </svg>
);

export const LineModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className}>
    {/* Thick horizontal line */}
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

export const PekeModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
    {/* X mark */}
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export const ShadeModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Filled square */}
    <rect x="4" y="4" width="16" height="16" rx="1" />
  </svg>
);

export const UnshadeModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    {/* Empty square */}
    <rect x="4" y="4" width="16" height="16" rx="1" />
  </svg>
);

export const BorderModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className}>
    {/* Vertical line (border) */}
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

export const SublineModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3,3" className={className}>
    {/* Dashed horizontal line */}
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

export const BgcolorModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Paint bucket */}
    <path d="M19 11l-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11z" />
    <path d="M5 2l5 5" />
    <path d="M2 13h15" />
    <path d="M22 21a2 2 0 1 1-4 0c0-1.1 2-4 2-4s2 2.9 2 4z" fill="currentColor" />
  </svg>
);

export const Bgcolor1ModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    {/* Green square with "1" */}
    <rect x="4" y="4" width="16" height="16" rx="2" fill="#A0FFA0" stroke="currentColor" strokeWidth="1" />
    <text x="12" y="16" fontSize="12" fontFamily="Helvetica, Arial, sans-serif" fontWeight="bold" textAnchor="middle" fill="#333">1</text>
  </svg>
);

export const Bgcolor2ModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    {/* Yellow square with "2" */}
    <rect x="4" y="4" width="16" height="16" rx="2" fill="#FFFF7F" stroke="currentColor" strokeWidth="1" />
    <text x="12" y="16" fontSize="12" fontFamily="Helvetica, Arial, sans-serif" fontWeight="bold" textAnchor="middle" fill="#333">2</text>
  </svg>
);

export const SubcircleModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    {/* Small circle */}
    <circle cx="12" cy="12" r="5" />
  </svg>
);

export const SubcrossModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className}>
    {/* Small X */}
    <line x1="8" y1="8" x2="16" y2="16" />
    <line x1="16" y1="8" x2="8" y2="16" />
  </svg>
);

export const CircleUnshadeModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    {/* White/empty circle */}
    <circle cx="12" cy="12" r="7" />
  </svg>
);

export const CircleShadeModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Black/filled circle */}
    <circle cx="12" cy="12" r="7" />
  </svg>
);

export const ArrowModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Right arrow */}
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const DirecModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Diagonal arrow (up-right) */}
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

export const BarModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className}>
    {/* Thick vertical bar */}
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

export const EmptyModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    {/* Empty set symbol */}
    <circle cx="12" cy="12" r="8" />
    <line x1="5" y1="19" x2="19" y2="5" />
  </svg>
);

export const IceModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    {/* Ice/snowflake - light blue square */}
    <rect x="4" y="4" width="16" height="16" rx="2" fill="#C0E0FF" stroke="currentColor" strokeWidth="1" />
  </svg>
);

export const CrossdotModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    {/* Circle with dot */}
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

export const ObjblankModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Small dot */}
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const InfoModeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Info icon */}
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// Input mode icons map
export const INPUT_MODE_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'auto': AutoModeIcon,
  'number': NumberModeIcon,
  'number-': NumberModeIcon,
  'clear': ClearModeIcon,
  'line': LineModeIcon,
  'peke': PekeModeIcon,
  'shade': ShadeModeIcon,
  'unshade': UnshadeModeIcon,
  'border': BorderModeIcon,
  'subline': SublineModeIcon,
  'bgcolor': BgcolorModeIcon,
  'bgcolor1': Bgcolor1ModeIcon,
  'bgcolor2': Bgcolor2ModeIcon,
  'subcircle': SubcircleModeIcon,
  'subcross': SubcrossModeIcon,
  'circle-unshade': CircleUnshadeModeIcon,
  'circle-shade': CircleShadeModeIcon,
  'arrow': ArrowModeIcon,
  'direc': DirecModeIcon,
  'bar': BarModeIcon,
  'empty': EmptyModeIcon,
  'ice': IceModeIcon,
  'crossdot': CrossdotModeIcon,
  'objblank': ObjblankModeIcon,
  'info-line': InfoModeIcon,
  'info-blk': InfoModeIcon,
  'info-ublk': InfoModeIcon,
  'info-room': InfoModeIcon,
};
