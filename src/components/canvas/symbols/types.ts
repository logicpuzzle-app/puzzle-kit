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
}

export interface TextSymbolProps extends SymbolProps {
  text: string;
}
