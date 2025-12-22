/**
 * Akichi Test Cases
 * Source: pzprjs/test/script/akichi.js
 */

import type { PuzzleTestData } from './types';

export const akichiTestData: PuzzleTestData = {
  pid: 'akichi',
  url: '6/6',
  failchecks: [
    {
      failcode: 'brNoShade',
      pzprv3:
        'pzprv3/akichi/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 6 6 6 3 /5 5 6 6 6 7 /1 4 . 3 . 4 /. . . . . . /. . . . . . /. . . . . . /1 . . . . . /. . . . . 0 /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. . . . . . /',
      description: 'No shaded cells',
    },
    {
      failcode: 'cuRoomLt',
      pzprv3:
        'pzprv3/akichi/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 6 6 6 3 /5 5 6 6 6 7 /1 4 . 3 . 4 /. . . . . . /. . . . . . /. . . . . . /1 . . . . . /. . . . . 0 /. . . . . . /. . . . . # /. . . . . . /. . . . . . /. . . . . . /. . . . . . /',
      description: 'Largest unshaded cluster does not reach the clue',
    },
    {
      failcode: 'cuRoomGt',
      pzprv3:
        'pzprv3/akichi/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 6 6 6 3 /5 5 6 6 6 7 /1 4 . 3 . 4 /. . . . . . /. . . . . . /. . . . . . /1 . . . . . /. . . . . 0 /# . . . . # /. . . # . . /# . # . # . /. . . . . . /. . . . . . /. . . . . # /',
      description: 'Unshaded cluster exceeds the clue',
    },
    {
      failcode: 'bkUnshadeConsecGt3',
      pzprv3:
        'pzprv3/akichi/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 6 6 6 3 /5 5 6 6 6 7 /1 4 . 3 . 4 /. . . . . . /. . . . . . /. . . . . . /1 . . . . . /. . . . . 0 /# . # . . # /. . . # . . /# . # . # . /. . . . . . /. # . . . . /# . . . . # /',
      description: 'Straight white path crosses multiple rooms',
    },
    {
      failcode: 'csAdjacent',
      pzprv3:
        'pzprv3/akichi/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 6 6 6 3 /5 5 6 6 6 7 /1 4 . 3 . 4 /. . . . . . /. . . . . . /. . . . . . /1 . . . . . /. . . . . 0 /. . . . . . /. . . . . . /# # . . . . /. . . . . . /. . . . . . /. . . . . . /',
      description: 'Adjacent shaded cells',
    },
    {
      failcode: 'cuDivideRB',
      pzprv3:
        'pzprv3/akichi/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 6 6 6 3 /5 5 6 6 6 7 /1 4 . 3 . 4 /. . . . . . /. . . . . . /. . . . . . /1 . . . . . /. . . . . 0 /. . . . . . /. . . . . . /. . . . . . /# . . . . . /. # . . . . /. . # . . . /',
      description: 'White area disconnected',
    },
    {
      failcode: null,
      pzprv3:
        'pzprv3/akichi/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 6 6 6 3 /5 5 6 6 6 7 /1 4 . 3 . 4 /. . . . . . /. . . . . . /. . . . . . /1 . . . . . /. . . . . 0 /# + # + + # /+ + + # + + /# + # + # + /+ + + + + + /+ # + # + + /# + + + + # /',
      description: 'Complete solution',
    },
  ],
};
