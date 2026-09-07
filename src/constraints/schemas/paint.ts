/**
 * Paint Mode Constraint Schema
 *
 * Provides a full set of answer input modes without validation rules.
 */

import type { ConstraintSchema, InputMode } from '../types';

const paintInputModes: InputMode[] = [
  'auto',
  // Cell shading / backgrounds
  'shade',
  'unshade',
  'bgcolor',
  'bgcolor1',
  'bgcolor2',
  'empty',
  'ice',
  // Numbers
  'number',
  'number-',
  'direc',
  // Symbols
  'circle-shade',
  'circle-unshade',
  'subcircle',
  'subcross',
  'arrow',
  'bar',
  'crossdot',
  'objblank',
  // Lines
  'line',
  'peke',
];

export const paintSchema: ConstraintSchema = {
  pid: 'paint',
  name: 'Paint',
  nameKey: 'puzzle.paint',
  grid: 'square',
  frameStyle: 'none',
  inputModes: {
    edit: paintInputModes,
    play: paintInputModes,
  },
  problem: [],
  answer: [],
  validation: [],
};
