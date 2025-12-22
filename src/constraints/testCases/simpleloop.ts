/**
 * Simple Loop Test Cases
 * Source: pzprjs/test/script/simpleloop.js
 */

import type { PuzzleTestData } from './types';

export const simpleloopTestData: PuzzleTestData = {
  pid: 'simpleloop',
  url: '5/5',
  failchecks: [
    {
      failcode: 'lnBranch',
      pzprv3:
        'pzprv3/simpleloop/5/5/* * * . . /* . . . . /. . . . . /. . . * . /. . . . . /0 0 0 0 /0 0 1 1 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 0 /0 0 0 1 0 /0 0 0 0 0 /0 0 0 0 0 /',
      description: 'Line branches',
    },
    {
      failcode: 'lnCross',
      pzprv3:
        'pzprv3/simpleloop/5/5/* * * . . /* . . . . /. . . . . /. . . * . /. . . . . /0 0 0 0 /0 0 1 1 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 1 0 /0 0 0 1 0 /0 0 0 0 0 /0 0 0 0 0 /',
      description: 'Line crosses',
    },
    {
      failcode: 'lnDeadEnd',
      pzprv3:
        'pzprv3/simpleloop/5/5/* * * . . /* . . . . /. . . . . /. . . * . /. . . . . /0 0 0 0 /0 0 1 0 /0 1 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 0 /0 0 1 0 0 /0 0 0 0 0 /0 0 0 0 0 /',
      description: 'Dead-end line',
    },
    {
      failcode: 'ceNoLine',
      pzprv3:
        'pzprv3/simpleloop/5/5/* * * . . /* . . . . /. . . . . /. . . * . /. . . . . /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /',
      description: 'Cell without a line',
    },
    {
      failcode: null,
      pzprv3:
        'pzprv3/simpleloop/5/5/* * * . . /* . . . . /. . . . . /. . . * . /. . . . . /0 0 0 1 /0 1 0 0 /1 0 1 0 /0 1 0 0 /1 0 1 1 /0 0 0 1 1 /0 1 1 1 1 /1 0 0 0 1 /1 1 1 0 1 /',
      description: 'Complete solution',
    },
  ],
};
