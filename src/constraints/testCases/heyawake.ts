/**
 * Heyawake Test Cases
 * Source: pzprjs/test/script/heyawake.js
 */

import type { PuzzleTestData } from './types';

export const heyawakeTestData: PuzzleTestData = {
  pid: 'heyawake',
  url: '6/6',
  failchecks: [
    {
      failcode: 'brNoShade',
      pzprv3: 'pzprv3/heyawake/6/6',
      description: 'No shaded cells',
    },
    {
      failcode: 'csAdjacent',
      pzprv3:
        'pzprv3/heyawake/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 5 6 6 3 /5 5 5 6 6 7 /2 2 . 2 . 2 /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. # . . . . /. # . . . . /. . . . . . /. . . . . . /',
      description: 'Adjacent shaded cells',
    },
    {
      failcode: 'cuDivideRB',
      pzprv3:
        'pzprv3/heyawake/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 5 6 6 3 /5 5 5 6 6 7 /2 2 . 2 . 2 /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. . . . . . /# . # . . . /. . . # . . /# . # . . . /. # . . . . /. . . . . . /. . . . . . /',
      description: 'White area disconnected',
    },
    {
      failcode: 'bkShadeNe',
      pzprv3:
        'pzprv3/heyawake/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 5 6 6 3 /5 5 5 6 6 7 /2 2 . 2 . 2 /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. . . . . . /# . . . . . /. . . # . . /# . # . # . /. # . . . . /. . . . . . /. . . . . . /',
      description: 'Room clue mismatch',
    },
    {
      failcode: 'bkUnshadeConsecGt3',
      pzprv3:
        'pzprv3/heyawake/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 5 6 6 3 /5 5 5 6 6 7 /2 2 . 2 . 2 /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. . . . . . /# + # + + # /+ + + # + + /# + # + # + /+ + + + + + /. # . # . # /. . . . . . /',
      description: 'Straight white path crosses multiple rooms',
    },
    {
      failcode: 'bkNotRect',
      pzprv3:
        'pzprv3/heyawake/6/6/7/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 5 6 6 3 /5 5 5 6 6 6 /2 2 . 2 . 2 /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. . . . . . /# + # + + # /+ + + # + + /# + # + # + /+ + + + + + /. # . # . # /. . . . . . /',
      description: 'Room shape not rectangular (variant check)',
    },
    {
      failcode: null,
      pzprv3:
        'pzprv3/heyawake/6/6/8/0 1 1 2 2 3 /0 1 1 2 2 3 /0 1 1 2 2 3 /4 4 4 4 4 3 /5 5 5 6 6 3 /5 5 5 6 6 7 /2 2 . 2 . 2 /. . . . . . /. . . . . . /. . . . . . /. . . . . . /. . . . . . /# + # + + # /+ + + # + + /# + # + # + /+ + + + + + /. # . # . # /. . # . . . /',
      description: 'Complete solution',
    },
  ],
};
