/**
 * Numberlink (Numlin) Test Cases
 * Source: pzprjs/test/script/numlin.js
 */

import type { PuzzleTestData } from './types';

export const numlinTestData: PuzzleTestData = {
  pid: 'numlin',
  url: '5/5',
  failchecks: [
    {
      failcode: 'brNoLine',
      pzprv3: 'pzprv3/numlin/5/5',
      description: 'No lines drawn',
    },
    {
      failcode: 'lnBranch',
      pzprv3:
        'pzprv3/numlin/5/5/1 . . . . /2 . . 3 . /. . . . . /. 1 . . 2 /. . . . 3 /0 0 0 0 /1 1 1 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 0 /0 1 0 0 0 /0 1 0 0 0 /0 0 0 0 0 /',
      description: 'Line branches',
    },
    {
      failcode: 'lnCross',
      pzprv3:
        'pzprv3/numlin/5/5/1 . . . . /2 . . 3 . /. . . . . /. 1 . . 2 /. . . . 3 /1 0 0 0 /1 1 1 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 1 0 0 0 /0 1 0 0 0 /0 1 0 0 0 /0 0 0 0 0 /',
      description: 'Line crosses',
    },
    {
      failcode: 'lcTripleNum',
      pzprv3:
        'pzprv3/numlin/5/5/1 . . . . /2 . . 3 . /. . . . . /. 1 . . 2 /. . . . 3 /1 1 1 1 /1 1 1 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /1 0 0 0 1 /0 0 0 0 1 /0 0 0 0 1 /0 0 0 0 1 /',
      description: 'Three or more numbers connected',
    },
    {
      failcode: 'nmConnDiff',
      pzprv3:
        'pzprv3/numlin/5/5/1 . . . . /2 . . 3 . /. . . . . /. 1 . . 2 /. . . . 3 /1 1 0 0 /0 0 0 0 /0 0 0 0 /0 0 1 1 /0 0 0 0 /0 0 1 0 0 /0 0 1 0 0 /0 0 1 0 0 /0 0 0 0 0 /',
      description: 'Different numbers connected',
    },
    {
      failcode: 'lcOnNum',
      pzprv3:
        'pzprv3/numlin/5/5/1 . . . . /2 . . 3 . /. . . . . /. 1 . . 2 /. . . . 3 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 1 1 /0 0 0 0 /0 0 1 0 1 /0 0 1 0 1 /0 0 1 0 1 /0 0 0 0 0 /',
      description: 'Line passes through number',
    },
    {
      failcode: 'lnDeadEnd',
      pzprv3:
        'pzprv3/numlin/5/5/1 . . . . /2 . . 3 . /. . . . . /. 1 . . 2 /. . . . 3 /1 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 1 /0 1 0 0 0 /0 1 0 1 0 /0 0 0 1 0 /0 0 0 1 0 /',
      description: 'Dead-end line',
    },
    {
      failcode: 'lcIsolate',
      pzprv3:
        'pzprv3/numlin/5/5/1 . . . . /2 . . 3 . /. . . . . /. 1 . . 2 /. . . . 3 /1 0 0 0 /0 0 0 0 /0 0 1 0 /0 0 0 0 /0 0 1 0 /0 1 0 0 0 /0 1 0 0 0 /0 1 1 1 0 /0 0 1 1 0 /',
      description: 'Line does not connect any number',
    },
    {
      failcode: 'nmNoLine',
      pzprv3:
        'pzprv3/numlin/5/5/1 . . . . /2 . . 3 . /. . . . . /. 1 . . 2 /. . . . 3 /1 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 1 /0 1 0 0 0 /0 1 0 1 0 /0 1 0 1 0 /0 0 0 1 0 /',
      description: 'Number without a line',
    },
    {
      failcode: null,
      pzprv3:
        'pzprv3/numlin/5/5/1 . . . . /2 . . 3 . /. . . . . /. 1 . . 2 /. . . . 3 /1 -1 1 1 /0 -1 0 0 /0 -1 -1 0 /0 -1 -1 0 /1 1 -1 1 /0 1 1 0 1 /1 1 1 1 1 /1 1 1 1 1 /1 0 1 1 0 /',
      description: 'Complete solution',
    },
  ],
};
