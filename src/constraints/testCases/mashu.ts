/**
 * Mashu Test Cases
 * Source: pzpr-puzzlink/tests/script/test_mashu.js
 */

import type { PuzzleTestData } from './types';

export const mashuTestData: PuzzleTestData = {
  pid: 'mashu',
  url: '6/6/1063000i3000',
  failchecks: [
    {
      failcode: 'brNoLine',
      pzprv3: 'pzprv3/mashu/6/6',
      description: 'No lines drawn',
    },
    {
      failcode: 'lnBranch',
      pzprv3: 'pzprv3/mashu/6/6/. . 1 . . . /. 2 . . 1 . /. . . . . . /. . . 2 . . /. 1 . . . . /. . . . . . /0 0 1 1 0 /0 0 0 0 0 /1 1 1 1 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 1 0 0 0 /0 0 1 0 0 0 /0 0 0 0 0 0 /0 0 0 0 0 0 /0 0 0 0 0 0 /',
      description: 'Line branches (more than 2 lines at a cell)',
    },
    {
      failcode: 'lnCross',
      pzprv3: 'pzprv3/mashu/6/6/. . 1 . . . /. 2 . . 1 . /. . . . . . /. . . 2 . . /. 1 . . . . /. . . . . . /0 0 1 1 0 /0 0 0 0 0 /1 1 1 1 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 1 0 0 0 /0 0 1 0 0 0 /0 0 1 0 0 0 /0 0 1 0 0 0 /0 0 1 0 0 0 /',
      description: 'Lines cross',
    },
    {
      failcode: 'mashuWCurve',
      pzprv3: 'pzprv3/mashu/6/6/. . 1 . . . /. 2 . . 1 . /. . . . . . /. . . 2 . . /. 1 . . . . /. . . . . . /0 0 1 1 0 /0 0 0 0 0 /0 0 1 1 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 1 0 0 0 /0 0 1 0 0 0 /0 0 0 0 0 0 /0 0 0 0 0 0 /0 0 0 0 0 0 /',
      description: 'White pearl: line must turn',
    },
    {
      failcode: 'mashuBStrig',
      pzprv3: 'pzprv3/mashu/6/6/. . 1 . . . /. 2 . . 1 . /. . . . . . /. . . 2 . . /. 1 . . . . /. . . . . . /0 0 0 0 0 /0 1 1 -1 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 0 /0 1 0 0 0 0 /0 1 0 1 0 0 /0 -1 0 1 0 0 /0 0 0 1 0 0 /',
      description: 'Black pearl: line must go straight',
    },
    {
      failcode: 'mashuBCvNbr',
      pzprv3: 'pzprv3/mashu/6/6/. . 1 . . . /. 2 . . 1 . /. . . . . . /. . . 2 . . /. 1 . . . . /. . . . . . /1 1 1 0 0 /0 1 1 -1 0 /0 0 0 0 0 /0 0 1 0 0 /0 0 0 0 0 /0 0 0 0 0 /1 0 0 0 0 0 /0 1 0 0 0 0 /0 1 0 1 0 0 /0 -1 1 0 0 0 /0 0 0 0 0 0 /',
      description: 'Black pearl: line must turn in adjacent cell',
    },
    {
      failcode: 'mashuWStNbr',
      pzprv3: 'pzprv3/mashu/6/6/. . 1 . . . /. 2 . . 1 . /. . . . . . /. . . 2 . . /. 1 . . . . /. . . . . . /1 1 1 1 0 /0 1 1 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /1 0 0 0 0 0 /1 1 0 0 0 0 /1 1 0 0 0 0 /0 0 0 0 0 0 /0 0 0 0 0 0 /',
      description: 'White pearl: line must go straight in at least one adjacent cell',
    },
    {
      failcode: 'mashuOnLine',
      pzprv3: 'pzprv3/mashu/6/6/. . 1 . . . /. 2 . . 1 . /. . . . . . /. . . 2 . . /. 1 . . . . /. . . . . . /1 1 1 0 0 /0 1 1 -1 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /1 0 0 1 0 0 /0 1 0 0 0 0 /0 1 0 0 0 0 /0 -1 0 0 0 0 /0 0 0 0 0 0 /',
      description: 'Pearl must be on the line',
    },
    {
      failcode: 'lnDeadEnd',
      pzprv3: 'pzprv3/mashu/6/6/. . 1 . . . /. 2 . . 1 . /. . . . . . /. . . 2 . . /. 1 . . . . /. . . . . . /1 1 1 0 1 /0 1 1 -1 0 /0 0 0 0 0 /0 1 0 0 0 /1 1 0 0 0 /0 0 0 0 0 /1 0 0 1 1 1 /1 1 0 0 1 1 /1 1 0 0 0 1 /1 -1 0 1 0 0 /0 0 0 1 0 0 /',
      description: 'Line has dead end',
    },
    {
      failcode: 'lnPlLoop',
      pzprv3: 'pzprv3/mashu/6/6/. . 1 . . . /. 2 . . 1 . /. . . . . . /. . . 2 . . /. 1 . . . . /. . . . . . /1 1 1 0 1 /0 1 1 -1 0 /0 0 0 0 0 /0 1 1 0 0 /1 1 0 0 0 /0 0 1 0 1 /1 0 0 1 1 1 /1 1 0 0 1 1 /1 1 0 0 1 1 /1 -1 0 1 1 1 /0 0 1 1 1 1 /',
      description: 'Multiple loops exist',
    },
    {
      failcode: null,
      pzprv3: 'pzprv3/mashu/6/6/. . 1 . . . /. 2 . . 1 . /. . . . . . /. . . 2 . . /. 1 . . . . /. . . . . . /1 1 1 0 1 /0 1 1 -1 0 /0 0 1 1 0 /0 1 -1 1 1 /1 1 0 0 0 /0 0 1 0 0 /1 0 0 1 1 1 /1 1 0 0 1 1 /1 1 1 -1 0 1 /1 -1 0 1 0 0 /0 0 1 1 0 0 /',
      description: 'Complete solution',
    },
  ],
};
