import { describe, expect, it } from 'vitest';
import { normalizeLineGroup } from './lines';
import type { LineWithPosition } from '../../../../utils/lineMerge';

const makeSegment = (
  id: string,
  from: [number, number],
  to: [number, number],
  directed: 'endpoint' | undefined = undefined,
  arrowDirection: 'forward' | 'backward' | undefined = undefined
): LineWithPosition => ({
  line: {
    id,
    from: `v-${from[0]}-${from[1]}`,
    to: `v-${to[0]}-${to[1]}`,
    color: '#000',
    thickness: 'normal',
    style: 'solid',
    layer: 'answer',
    directed,
    arrowDirection,
  },
  fromX: from[0],
  fromY: from[1],
  toX: to[0],
  toY: to[1],
  midpoint: null,
});

describe('normalizeLineGroup', () => {
  it('orders a converted zigzag and assigns every segment direction', () => {
    const a = makeSegment('a', [0, 0], [20, 0], 'endpoint');
    const b = makeSegment('b', [20, 0], [20, 10], 'endpoint');
    const c = makeSegment('c', [20, 10], [0, 10], 'endpoint');
    const d = makeSegment('d', [0, 10], [0, 30], 'endpoint');
    expect(normalizeLineGroup([c, a, d, b], true)).toMatchObject({
      lineIds: ['a', 'b', 'c', 'd'],
      arrowDirections: new Map([
        ['a', 'forward'], ['b', 'forward'], ['c', 'forward'], ['d', 'forward'],
      ]),
    });
  });

  it('preserves an existing backward heading through a bend', () => {
    const a = makeSegment('a', [0, 0], [10, 0], 'endpoint', 'backward');
    const b = makeSegment('b', [10, 0], [10, 20], 'endpoint', 'backward');
    expect(normalizeLineGroup([b, a], false)).toMatchObject({
      lineIds: ['b', 'a'],
      arrowDirections: new Map([['a', 'backward'], ['b', 'backward']]),
    });
  });

  it('assigns backward only to the segment stored against the chain flow', () => {
    const a = makeSegment('a', [0, 0], [10, 0], 'endpoint');
    const b = makeSegment('b', [20, 0], [10, 0], 'endpoint');
    expect(normalizeLineGroup([a, b], true)).toMatchObject({
      lineIds: ['a', 'b'],
      arrowDirections: new Map([['a', 'forward'], ['b', 'backward']]),
    });
  });

  it('normalizes conflicting arrows into one connected heading', () => {
    const a = makeSegment('a', [0, 0], [10, 0], 'endpoint', 'forward');
    const b = makeSegment('b', [10, 0], [20, 0], 'endpoint', 'forward');
    const c = makeSegment('c', [20, 0], [20, 10], 'endpoint', 'backward');
    const result = normalizeLineGroup([c, a, b], false);
    // Conflicting arrows have no preferred winner, but must form one ordered path.
    expect([
      { lineIds: ['a', 'b', 'c'], arrowDirections: new Map([['a', 'forward'], ['b', 'forward'], ['c', 'forward']]) },
      { lineIds: ['c', 'b', 'a'], arrowDirections: new Map([['a', 'backward'], ['b', 'backward'], ['c', 'backward']]) },
    ]).toContainEqual({ lineIds: result?.lineIds, arrowDirections: result?.arrowDirections });
  });
});
