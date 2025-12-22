/**
 * Numberlink (Numlin) Constraint Schema
 *
 * Based on pzprjs/src/variety/numlin.js
 */

import type { ConstraintSchema } from '../types';

export const numlinSchema: ConstraintSchema = {
  pid: 'numlin',
  name: 'Numberlink',
  nameKey: 'puzzle.numlin',
  grid: 'square',
  gridStyle: 'normal',
  frameStyle: 'normal',

  // Line target: Lines connect cell centers
  lineTarget: 'cell',

  // Auto mode types based on pzprjs mouseinput_auto
  autoModeEdit: 'number',
  autoModePlay: 'line',

  // Input modes from pzprjs/src/variety/numlin.js
  inputModes: {
    edit: ['auto', 'number', 'clear', 'info-line'],
    play: ['auto', 'line', 'peke', 'info-line'],
  },

  problem: [
    {
      id: 'numlin.numbers',
      scope: 'problem',
      title: 'constraint.numlin.numbers.title',
      description: 'constraint.numlin.numbers.description',
      targets: ['cell'],
      toolPalette: ['number', 'clear'],
      pzpr: { pid: 'numlin' },
    },
  ],

  answer: [
    {
      id: 'numlin.link-draw',
      scope: 'answer',
      title: 'constraint.numlin.linkDraw.title',
      description: 'constraint.numlin.linkDraw.description',
      targets: ['edge'],
      states: ['line', 'peke', 'none'],
      toolPalette: ['line', 'peke'],
      pzpr: { pid: 'numlin' },
    },
  ],

  validation: [
    {
      id: 'numlin.line-exist',
      scope: 'validation',
      title: 'constraint.numlin.lineExist.title',
      description: 'constraint.numlin.lineExist.description',
      targets: ['edge'],
      defaultOn: true,
      pzpr: {
        pid: 'numlin',
        checklist: ['checkLineExist'],
        failcodes: ['brNoLine'],
      },
    },
    {
      id: 'numlin.no-branch',
      scope: 'validation',
      title: 'constraint.numlin.noBranch.title',
      description: 'constraint.numlin.noBranch.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'numlin',
        checklist: ['checkLineBranch'],
        failcodes: ['lnBranch'],
      },
    },
    {
      id: 'numlin.no-cross',
      scope: 'validation',
      title: 'constraint.numlin.noCross.title',
      description: 'constraint.numlin.noCross.description',
      targets: ['vertex'],
      defaultOn: true,
      pzpr: {
        pid: 'numlin',
        checklist: ['checkLineCross'],
        failcodes: ['lnCross'],
      },
    },
    {
      id: 'numlin.no-triple-number',
      scope: 'validation',
      title: 'constraint.numlin.noTripleNumber.title',
      description: 'constraint.numlin.noTripleNumber.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'numlin',
        checklist: ['checkTripleObject'],
        failcodes: ['lcTripleNum'],
      },
    },
    {
      id: 'numlin.same-number-link',
      scope: 'validation',
      title: 'constraint.numlin.sameNumberLink.title',
      description: 'constraint.numlin.sameNumberLink.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'numlin',
        checklist: ['checkLinkSameNumber'],
        failcodes: ['nmConnDiff'],
      },
    },
    {
      id: 'numlin.no-line-over-number',
      scope: 'validation',
      title: 'constraint.numlin.noLineOverNumber.title',
      description: 'constraint.numlin.noLineOverNumber.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'numlin',
        checklist: ['checkLineOverLetter'],
        failcodes: ['lcOnNum'],
      },
    },
    {
      id: 'numlin.no-deadend',
      scope: 'validation',
      title: 'constraint.numlin.noDeadend.title',
      description: 'constraint.numlin.noDeadend.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'numlin',
        checklist: ['checkDeadendConnectLine'],
        failcodes: ['lnDeadEnd'],
      },
    },
    {
      id: 'numlin.line-connects-number',
      scope: 'validation',
      title: 'constraint.numlin.lineConnectsNumber.title',
      description: 'constraint.numlin.lineConnectsNumber.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'numlin',
        checklist: ['checkDisconnectLine'],
        failcodes: ['lcIsolate'],
      },
    },
    {
      id: 'numlin.number-has-line',
      scope: 'validation',
      title: 'constraint.numlin.numberHasLine.title',
      description: 'constraint.numlin.numberHasLine.description',
      targets: ['cell'],
      defaultOn: true,
      pzpr: {
        pid: 'numlin',
        checklist: ['checkNoLineObject'],
        failcodes: ['nmNoLine'],
      },
    },
  ],

  notes: [
    'Connect identical numbers with a single path',
    'Lines cannot branch or cross',
    'Lines may not pass through other numbers',
  ],
};
