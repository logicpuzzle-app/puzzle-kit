/**
 * Nurikabe Test Cases
 * Source: pzpr-puzzlink/tests/script/test_nurikabe.js
 */

import type { PuzzleTestData } from './types';

export const nurikabeTestData: PuzzleTestData = {
  pid: 'nurikabe',
  url: '5/5/g5k2o1k3g',
  failchecks: [
    {
      failcode: 'cs2x2',
      pzprv3: 'pzprv3/nurikabe/5/5/. 5 . . . /. . 2 . . /# # . . . /# # 1 . . /. . . 3 . /',
      description: 'Shaded cells form a 2x2 square',
    },
    {
      failcode: 'bkNoNum',
      pzprv3: 'pzprv3/nurikabe/5/5/. 5 # # . /. # 2 . # /. # # # # /. # 1 . . /# . . 3 . /',
      description: 'White region has no number',
    },
    {
      failcode: 'csDivide',
      pzprv3: 'pzprv3/nurikabe/5/5/. 5 # # # /. # 2 . # /. . # # # /. . 1 . . /# . . 3 . /',
      description: 'Shaded cells are divided',
    },
    {
      failcode: 'bkNumGe2',
      pzprv3: 'pzprv3/nurikabe/5/5/. 5 # # # /. # 2 . # /. # # # # /. . 1 . . /. . . 3 . /',
      description: 'White region contains multiple numbers',
    },
    {
      failcode: 'bkSizeNe',
      pzprv3: 'pzprv3/nurikabe/5/5/. 5 # # # /. # 2 . # /. # # # # /. # 1 # . /. # # 3 . /',
      description: 'White region size does not match the number',
    },
    {
      failcode: null,
      pzprv3: 'pzprv3/nurikabe/5/5/+ 5 # # # /+ # 2 + # /+ # # # # /+ # 1 # . /# # # 3 . /',
      description: 'Complete solution',
    },
  ],
};
