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

describe('normalizeLineGroup (undirected to directed)', () => {
  it('infers forward directions for scrambled undirected chain →→↓↓←←↓↓→→', () => {
    const base = [
      makeSegment('a', [0, 0], [10, 0]),
      makeSegment('b', [10, 0], [20, 0]),
      makeSegment('c', [20, 0], [20, 10]),
      makeSegment('d', [20, 10], [20, 20]),
      makeSegment('e', [20, 20], [10, 20]),
      makeSegment('f', [10, 20], [0, 20]),
      makeSegment('g', [0, 20], [0, 30]),
      makeSegment('h', [0, 30], [0, 40]),
    ];

    // Simulate conversion: mark directed without arrowDirection
    const directed: LineWithPosition[] = base.map((seg): LineWithPosition => ({
      ...seg,
      line: { ...seg.line, directed: 'endpoint', arrowDirection: undefined },
    }));

    const scrambled = [directed[4], directed[0], directed[7], directed[2], directed[6], directed[1], directed[5], directed[3]];
    const result = normalizeLineGroup(scrambled, true);
    expect(result).not.toBeNull();
    if (!result) return;

    // All segments should be forward after normalization
    for (const dir of result.arrowDirections.values()) {
      expect(dir).toBe('forward');
    }

    // Order should connect all segments
    expect(new Set(result.lineIds)).toEqual(new Set(base.map((s) => s.line.id)));
    expect(result.lineIds.length).toBe(base.length);
  });
});
