/**
 * Hashikake (Bridges) Constraint Schema
 *
 * Extracted from pzprjs/src/variety/hashikake.js
 */

import type { ConstraintSchema } from '../types';

export const hashikakeSchema: ConstraintSchema = {
  pid: 'hashikake',
  name: 'Hashikake (Bridges)',
  nameKey: 'puzzle.hashikake',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'thick',

  // Auto mode types
  autoModeEdit: 'number',
  autoModePlay: 'line',

  // Input modes
  inputModes: {
    edit: ['auto', 'number', 'clear'],
    play: ['auto', 'line', 'peke', 'info-line'],
  },

  problem: [
    {
      id: 'hashikake.island-numbers',
      scope: 'problem',
      title: 'constraint.hashikake.islandNumbers.title',
      description: 'constraint.hashikake.islandNumbers.description',
      targets: ['cell'],
      states: ['1', '2', '3', '4', '5', '6', '7', '8', 'none'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'hashikake' },
    },
  ],

  answer: [
    {
      id: 'hashikake.draw-bridges',
      scope: 'answer',
      title: 'constraint.hashikake.drawBridges.title',
      description: 'constraint.hashikake.drawBridges.description',
      targets: ['edge'],
      states: ['single', 'double', 'none'],
      toolPalette: ['line', 'peke'],
      pzpr: { pid: 'hashikake' },
    },
  ],

  validation: [
    {
      id: 'hashikake.no-cross',
      scope: 'validation',
      title: 'constraint.hashikake.noCross.title',
      description: 'constraint.hashikake.noCross.description',
      targets: ['edge'],
      defaultOn: true,
      pzpr: {
        pid: 'hashikake',
        checklist: ['checkCrossLine'],
        failcodes: ['lnCross'],
      },
    },
    {
      id: 'hashikake.bridge-count',
      scope: 'validation',
      title: 'constraint.hashikake.bridgeCount.title',
      description: 'constraint.hashikake.bridgeCount.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'hashikake',
        checklist: ['checkNumberAndLine'],
        failcodes: ['nmLineNe'],
      },
    },
    {
      id: 'hashikake.all-connected',
      scope: 'validation',
      title: 'constraint.hashikake.allConnected.title',
      description: 'constraint.hashikake.allConnected.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'hashikake',
        checklist: ['checkConnectObject'],
        failcodes: ['nmIsolate'],
      },
    },
  ],

  notes: [
    'Connect islands with horizontal/vertical bridges',
    'Bridges cannot cross each other',
    'At most 2 bridges between any pair of islands',
    'Island numbers indicate total bridges connected',
    'All islands must be connected',
  ],
};
