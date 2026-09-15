import { describe, expect, it } from 'vitest';
import {
  mergeEndpointLines, mergeMidpointLines, normalizeChain,
  getChainArrowDirections, groupLinesByConnection, areLinesCollinearConnected,
  type LineWithPosition,
} from '../utils/lineMerge';

const makeLine = (
  id: string,
  from: [number, number],
  to: [number, number],
  directed: 'endpoint' | 'midpoint' | undefined = 'endpoint',
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


describe('merged arrow paths', () => {
  it('keeps every turn of a scrambled endpoint chain', () => {
    const a = makeLine('a', [0, 0], [20, 0], 'endpoint', 'forward');
    const b = makeLine('b', [20, 0], [20, 10], 'endpoint', 'forward');
    const c = makeLine('c', [20, 10], [0, 10], 'endpoint', 'forward');
    const d = makeLine('d', [0, 10], [0, 30], 'endpoint', 'forward');
    const chains = mergeEndpointLines([c, a, d, b]);
    expect(chains).toHaveLength(1);
    expect(chains[0].points).toEqual([
      { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 },
      { x: 0, y: 10 }, { x: 0, y: 30 },
    ]);
  });

  it('reverses the endpoint path for backward arrows', () => {
    const a = makeLine('a', [0, 0], [10, 0], 'endpoint', 'backward');
    const b = makeLine('b', [10, 0], [10, 20], 'endpoint', 'backward');
    const chains = mergeEndpointLines([b, a]);
    expect(chains).toHaveLength(1);
    expect(chains[0].points).toEqual([
      { x: 10, y: 20 }, { x: 10, y: 0 }, { x: 0, y: 0 },
    ]);
  });

  it('uses explicit midpoint direction despite reversed input order', () => {
    const a = makeLine('a', [0, 0], [10, 0], 'midpoint', 'forward');
    const b = makeLine('b', [10, 0], [20, 0], 'midpoint', 'forward');
    const chains = mergeMidpointLines([b, a]);
    expect(chains).toHaveLength(1);
    expect(chains[0].points).toEqual([
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 },
    ]);
  });

  it('uses the first input segment when midpoint direction is unspecified', () => {
    const a = makeLine('a', [0, 0], [10, 0], 'midpoint');
    const b = makeLine('b', [10, 0], [10, 20], 'midpoint');
    const c = makeLine('c', [10, 20], [0, 20], 'midpoint');
    expect(mergeMidpointLines([a, c, b])[0].points).toEqual([
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 20 },
    ]);
    expect(mergeMidpointLines([c, a, b])[0].points).toEqual([
      { x: 0, y: 20 }, { x: 10, y: 20 }, { x: 10, y: 0 }, { x: 0, y: 0 },
    ]);
  });

  it('resolves unspecified midpoint direction when the first input is interior', () => {
    const a = makeLine('a', [0, 0], [20, 0], 'midpoint');
    const b = makeLine('b', [20, 0], [20, 10], 'midpoint');
    const c = makeLine('c', [20, 10], [0, 10], 'midpoint');
    const d = makeLine('d', [0, 10], [0, 20], 'midpoint');
    const e = makeLine('e', [0, 20], [20, 20], 'midpoint');
    const chains = mergeMidpointLines([c, a, e, b, d]);
    expect(chains).toHaveLength(1);
    expect(chains[0].points).toEqual([
      { x: 20, y: 20 }, { x: 0, y: 20 }, { x: 0, y: 10 },
      { x: 20, y: 10 }, { x: 20, y: 0 }, { x: 0, y: 0 },
    ]);
  });
});

describe('collinear groups and isolated segments', () => {
  it('separates connected horizontal, vertical and left-pointing groups', () => {
    const a = makeLine('a', [0, 0], [10, 0], 'midpoint');
    const b = makeLine('b', [10, 0], [20, 0], 'midpoint');
    const c = makeLine('c', [20, 0], [20, 10], 'midpoint');
    const d = makeLine('d', [20, 10], [20, 20], 'midpoint');
    const e = makeLine('e', [20, 20], [10, 20], 'midpoint');
    const f = makeLine('f', [10, 20], [0, 20], 'midpoint');
    const groups = groupLinesByConnection([f, c, a, e, b, d], areLinesCollinearConnected);
    expect(new Set(groups.map(ids => [...ids].sort().join(',')))).toEqual(new Set(['a,b', 'c,d', 'e,f']));
    expect(groups).toHaveLength(3);
  });

  it('keeps a single left-pointing segment forward relative to its stored endpoints', () => {
    const chain = normalizeChain([makeLine('e', [20, 20], [10, 20], 'midpoint')]);
    expect(chain).toMatchObject({
      lineIds: ['e'], startPoint: { x: 20, y: 20 }, endPoint: { x: 10, y: 20 },
    });
    expect(getChainArrowDirections(chain!)).toEqual(new Map([['e', 'forward']]));
  });

  it('does not group bends or disconnected collinear segments', () => {
    const segments = [
      makeLine('a', [0, 0], [10, 0], 'midpoint'),
      makeLine('b', [10, 0], [10, 10], 'midpoint'),
      makeLine('c', [20, 0], [30, 0], 'midpoint'),
    ];
    expect(groupLinesByConnection(segments, areLinesCollinearConnected)).toEqual([]);
  });
});
