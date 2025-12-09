/**
 * Common types for symbol components
 */

export interface SymbolProps {
  x: number;
  y: number;
  size: number;
  color: string;
  fillColor?: string;
  rotation: number;
  directions?: boolean[];  // For multi-direction arrows
  directionAngles?: number[];  // Custom angles for each direction (degrees, 0=up)
}

export interface TextSymbolProps extends SymbolProps {
  text: string;
}
