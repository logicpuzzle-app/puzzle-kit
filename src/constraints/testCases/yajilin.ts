/**
 * Yajilin (Yajirin) Test Cases
 * Source: pzpr-puzzlink/tests/script/test_yajirin.js
 */

import type { PuzzleTestData } from './types';

export const yajilinTestData: PuzzleTestData = {
  pid: 'yajirin',
  url: '5/5/m32j10',
  failchecks: [
    {
      failcode: 'lnBranch',
      pzprv3: 'pzprv3/yajirin/5/5/. . . . . /. . . . . /. . . 3,2 . /. . . . . /. . . . 1,0 /. . . . . /. . . . . /. . . . . /. . . . . /. . . . . /1 1 1 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 1 0 0 0 /0 1 0 0 0 /0 1 0 0 0 /0 0 0 0 0 /',
      description: 'Line branches',
    },
    {
      failcode: 'lnCross',
      pzprv3: 'pzprv3/yajirin/5/5/. . . . . /. . . . . /. . . 3,2 . /. . . . . /. . . . 1,0 /. . . . . /. . . . . /. . . . . /. . . . . /. . . . . /0 0 1 0 /1 1 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 1 1 0 0 /0 1 0 0 0 /0 1 0 0 0 /0 0 0 0 0 /',
      description: 'Lines cross',
    },
    {
      failcode: 'lnOnShade',
      pzprv3: 'pzprv3/yajirin/5/5/. . . . . /. . . . . /. . . 3,2 . /. . . . . /. . . . 1,0 /. . . # . /. . . . . /# . # . . /. . . . . /. . . . . /1 1 0 1 /1 0 1 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /1 0 1 1 0 /0 1 0 0 0 /0 1 0 0 0 /0 0 0 0 0 /',
      description: 'Line passes through shaded cell',
    },
    {
      failcode: 'csAdjacent',
      pzprv3: 'pzprv3/yajirin/5/5/. . . . . /. . . . . /. . . 3,2 . /. . . . . /. . . . 1,0 /. . . . . /. . . . . /# . # . . /. . # . . /. . . . . /1 1 0 1 /1 0 1 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /1 0 1 1 0 /0 1 0 0 0 /0 1 0 0 0 /0 0 0 0 0 /',
      description: 'Shaded cells are adjacent',
    },
    {
      failcode: 'anShadeNe',
      pzprv3: 'pzprv3/yajirin/5/5/. . . . . /. . . . . /. . . 3,2 . /. . . . . /. . . . 1,0 /. . . . . /. . . . + /# . . . + /. . + . + /. . . # . /1 1 -1 1 /1 -1 1 -1 /0 0 0 -1 /1 -1 1 1 /1 1 0 0 /1 -1 1 1 1 /0 1 0 0 1 /0 1 0 0 1 /1 -1 1 0 0 /',
      description: 'Arrow clue: number of shaded cells does not match',
    },
    {
      failcode: 'lnDeadEnd',
      pzprv3: 'pzprv3/yajirin/5/5/. . . . . /. . . . . /. . . 3,2 . /. . . . . /. . . . 1,0 /. . . . . /. . . . + /# . # . + /. . + . + /. . . . . /1 1 0 1 /1 0 1 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /1 0 1 1 0 /0 1 0 0 0 /0 1 0 0 0 /0 0 0 0 0 /',
      description: 'Line has dead end',
    },
    {
      failcode: 'lnPlLoop',
      pzprv3: 'pzprv3/yajirin/5/5/. . . . . /. . . . . /. . . 3,2 . /. . . . . /. . . . 1,0 /. . . . . /. . . . + /# . # . + /. . + . + /. . . . . /1 1 0 1 /1 1 0 1 /0 0 0 0 /0 0 1 0 /0 0 1 0 /1 0 1 1 1 /0 0 0 0 0 /0 0 0 0 0 /0 0 1 1 0 /',
      description: 'Multiple loops exist',
    },
    {
      failcode: 'ceEmpty',
      pzprv3: 'pzprv3/yajirin/5/5/. . . . . /. . . . . /. . . 3,2 . /. . . . . /. . . . 1,0 /. . . . . /. . . . + /# . # . + /. . + . + /. . . . . /1 1 0 1 /1 0 1 0 /0 0 0 0 /0 1 0 1 /0 0 1 0 /1 0 1 1 1 /0 1 0 0 1 /0 1 0 0 1 /0 0 1 1 0 /',
      description: 'Empty cell exists (not on line, not shaded)',
    },
    {
      failcode: null,
      pzprv3: 'pzprv3/yajirin/5/5/. . . . . /. . . . . /. . . 3,2 . /. . . . . /. . . . 1,0 /. . . . . /. . . . + /# . # . + /. . + . + /. . . # . /1 1 -1 1 /1 -1 1 -1 /0 0 0 -1 /1 -1 1 1 /1 1 0 0 /1 -1 1 1 1 /0 1 0 0 1 /0 1 0 0 1 /1 -1 1 0 0 /',
      description: 'Complete solution',
    },
  ],
};
