import { describe, expect, it } from 'vitest';
import {
  mergeEndpointLines,
  mergeMidpointLines,
  normalizeChain,
  findChainEndpoints,
  chooseArrowEndpoint,
  getChainArrowDirections,
  groupLinesByConnection,
  areLinesCollinearConnected,
  type LineWithPosition,
} from '../utils/lineMerge';

const makeLine = (
  id: string,
  from: [number, number],
  to: [number, number],
  directed: 'endpoint' | 'midpoint' = 'endpoint',
  arrowDirection: 'forward' | 'backward' = 'forward'
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

describe('mergeEndpointLines arrow orientation', () => {
  it('keeps forward direction even when lineIds are out of order', () => {
    const a = makeLine('a', [0, 0], [10, 0], 'endpoint', 'forward');
    const b = makeLine('b', [10, 0], [20, 0], 'endpoint', 'forward');

    // Intentionally reversed order
    const chains = mergeEndpointLines([b, a]);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 20, y: 0 });
  });

  it('respects backward direction for the whole chain', () => {
    const a = makeLine('a', [0, 0], [10, 0], 'endpoint', 'backward');
    const b = makeLine('b', [10, 0], [20, 0], 'endpoint', 'backward');
    const chains = mergeEndpointLines([b, a]);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;
    expect(pts[0]).toEqual({ x: 20, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 0, y: 0 });
  });

  it('preserves backward arrowDirection after normalization', () => {
    const a = makeLine('a', [0, 0], [10, 0], 'endpoint', 'backward');
    const b = makeLine('b', [10, 0], [20, 0], 'endpoint', 'backward');
    const scrambled: LineWithPosition[] = [b, a];
    const endpoints = findChainEndpoints(scrambled);
    const arrowEnd = chooseArrowEndpoint(endpoints, scrambled) || undefined;
    const chain = normalizeChain(scrambled, arrowEnd);
    expect(chain).not.toBeNull();
    if (!chain) return;
    const directions = getChainArrowDirections(chain);
    expect(directions.get('a')).toBe('backward');
    expect(directions.get('b')).toBe('backward');
  });
});

describe('mergeMidpointLines arrow orientation', () => {
  it('orders chain to point forward regardless of input order', () => {
    const a = makeLine('a', [0, 0], [10, 0], 'midpoint', 'forward');
    const b = makeLine('b', [10, 0], [20, 0], 'midpoint', 'forward');
    const chains = mergeMidpointLines([b, a]);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 20, y: 0 });
  });
});

describe('normalize complex zigzag chains', () => {
  it('keeps arrow heading to the true end even when input is scrambled', () => {
    // Path: →→→ ↓↓↓ ←←← ↓↓↓ →→→  (six points, five segments)
    const segments = [
      makeLine('s1', [0, 0], [30, 0], 'endpoint', 'forward'),
      makeLine('s2', [30, 0], [30, 30], 'endpoint', 'forward'),
      makeLine('s3', [30, 30], [0, 30], 'endpoint', 'forward'),
      makeLine('s4', [0, 30], [0, 60], 'endpoint', 'forward'),
      makeLine('s5', [0, 60], [30, 60], 'endpoint', 'forward'),
    ];

    // Scramble the order to mimic merge/unmerge/merge shuffles
    const scrambled = [segments[2], segments[0], segments[4], segments[1], segments[3]];
    const chains = mergeEndpointLines(scrambled);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 30, y: 60 });
  });

  it('preserves left turns when grouping endpoint arrows (→→↓↓←←↓↓)', () => {
    // Path: →→↓↓←←↓↓ (8 segments, 9 points)
    const segments = [
      makeLine('a', [0, 0], [10, 0], 'endpoint', 'forward'),   // →
      makeLine('b', [10, 0], [20, 0], 'endpoint', 'forward'),  // →
      makeLine('c', [20, 0], [20, 10], 'endpoint', 'forward'), // ↓
      makeLine('d', [20, 10], [20, 20], 'endpoint', 'forward'),// ↓
      makeLine('e', [20, 20], [10, 20], 'endpoint', 'forward'),// ←
      makeLine('f', [10, 20], [0, 20], 'endpoint', 'forward'), // ←
      makeLine('g', [0, 20], [0, 30], 'endpoint', 'forward'),  // ↓
      makeLine('h', [0, 30], [0, 40], 'endpoint', 'forward'),  // ↓
    ];
    const scrambled = [segments[4], segments[0], segments[7], segments[2], segments[6], segments[1], segments[5], segments[3]];
    const chains = mergeEndpointLines(scrambled);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 0, y: 40 });
    const deltas = [];
    for (let i = 1; i < pts.length; i++) {
      deltas.push({ dx: pts[i].x - pts[i - 1].x, dy: pts[i].y - pts[i - 1].y });
    }
    const expected = [
      { dx: 10, dy: 0 },  // →
      { dx: 10, dy: 0 },  // →
      { dx: 0, dy: 10 },  // ↓
      { dx: 0, dy: 10 },  // ↓
      { dx: -10, dy: 0 }, // ←
      { dx: -10, dy: 0 }, // ←
      { dx: 0, dy: 10 },  // ↓
      { dx: 0, dy: 10 },  // ↓
    ];
    expect(deltas).toEqual(expected);
  });

  it('assigns forward arrowDirection for complex forward chain after normalization', () => {
    const segments = [
      makeLine('a', [0, 0], [10, 0], 'endpoint', 'forward'),
      makeLine('b', [10, 0], [20, 0], 'endpoint', 'forward'),
      makeLine('c', [20, 0], [20, 10], 'endpoint', 'forward'),
      makeLine('d', [20, 10], [20, 20], 'endpoint', 'forward'),
      makeLine('e', [20, 20], [10, 20], 'endpoint', 'forward'),
      makeLine('f', [10, 20], [0, 20], 'endpoint', 'forward'),
      makeLine('g', [0, 20], [0, 30], 'endpoint', 'forward'),
      makeLine('h', [0, 30], [0, 40], 'endpoint', 'forward'),
    ];
    const scrambled = [segments[4], segments[0], segments[7], segments[2], segments[6], segments[1], segments[5], segments[3]];
    const endpoints = findChainEndpoints(scrambled);
    const arrowEnd = chooseArrowEndpoint(endpoints, scrambled) || undefined;
    const chain = normalizeChain(scrambled, arrowEnd);
    expect(chain).not.toBeNull();
    if (!chain) return;
    const directions = getChainArrowDirections(chain);
    for (const id of chain.lineIds) {
      expect(directions.get(id)).toBe('forward');
    }
  });

  it('assigns backward arrowDirection when all segments are backward', () => {
    const segments = [
      makeLine('a', [0, 0], [10, 0], 'endpoint', 'backward'),
      makeLine('b', [10, 0], [20, 0], 'endpoint', 'backward'),
      makeLine('c', [20, 0], [20, 10], 'endpoint', 'backward'),
      makeLine('d', [20, 10], [20, 20], 'endpoint', 'backward'),
      makeLine('e', [20, 20], [10, 20], 'endpoint', 'backward'),
      makeLine('f', [10, 20], [0, 20], 'endpoint', 'backward'),
      makeLine('g', [0, 20], [0, 30], 'endpoint', 'backward'),
      makeLine('h', [0, 30], [0, 40], 'endpoint', 'backward'),
    ];
    const scrambled = [segments[4], segments[0], segments[7], segments[2], segments[6], segments[1], segments[5], segments[3]];
    const endpoints = findChainEndpoints(scrambled);
    const arrowEnd = chooseArrowEndpoint(endpoints, scrambled) || undefined;
    const chain = normalizeChain(scrambled, arrowEnd);
    expect(chain).not.toBeNull();
    if (!chain) return;
    const directions = getChainArrowDirections(chain);
    for (const id of chain.lineIds) {
      expect(directions.get(id)).toBe('backward');
    }
  });
});

describe('normalizeChain arrow inference', () => {
  it('infers arrow end when not provided', () => {
    const a = makeLine('a', [0, 0], [10, 0], 'endpoint', 'forward');
    const b = makeLine('b', [10, 0], [20, 0], 'endpoint', 'forward');
    // shuffle order
    const chain = mergeEndpointLines([b, a])[0];
    expect(chain.points[0]).toEqual({ x: 0, y: 0 });
    expect(chain.points[chain.points.length - 1]).toEqual({ x: 20, y: 0 });
  });
});

describe('directionless lines become one-way when grouped/ungrouped', () => {
  it('normalizes undirected segments into a consistent forward chain', () => {
    // Three undirected segments forming a straight path
    const s1 = makeLine('s1', [0, 0], [10, 0], 'endpoint', undefined as any);
    const s2 = makeLine('s2', [10, 0], [20, 0], 'endpoint', undefined as any);
    const s3 = makeLine('s3', [20, 0], [30, 0], 'endpoint', undefined as any);

    const chains = mergeEndpointLines([s2, s3, s1]);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 30, y: 0 });
  });

  it('handles multiple 90° bends without flipping direction', () => {
    // Path: (0,0)->(0,10)->(10,10)->(10,20)->(20,20)->(20,30)->(30,30)
    const segments = [
      makeLine('a', [0, 0], [0, 10], 'endpoint', undefined as any),
      makeLine('b', [0, 10], [10, 10], 'endpoint', undefined as any),
      makeLine('c', [10, 10], [10, 20], 'endpoint', undefined as any),
      makeLine('d', [10, 20], [20, 20], 'endpoint', undefined as any),
      makeLine('e', [20, 20], [20, 30], 'endpoint', undefined as any),
      makeLine('f', [20, 30], [30, 30], 'endpoint', undefined as any),
    ];
    const scrambled = [segments[3], segments[0], segments[5], segments[1], segments[4], segments[2]];
    const chains = mergeEndpointLines(scrambled);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 30, y: 30 });
  });

  it('normalizes zigzag with all directions (→↓←↑) into a single heading', () => {
    // Path: (0,0)->(10,0)->(10,10)->(0,10)->(0,20)->(10,20)
    const segments = [
      makeLine('a', [0, 0], [10, 0], 'endpoint', undefined as any),  // →
      makeLine('b', [10, 0], [10, 10], 'endpoint', undefined as any), // ↓
      makeLine('c', [10, 10], [0, 10], 'endpoint', undefined as any), // ←
      makeLine('d', [0, 10], [0, 20], 'endpoint', undefined as any),  // ↓
      makeLine('e', [0, 20], [10, 20], 'endpoint', undefined as any), // →
    ];
    const scrambled = [segments[2], segments[0], segments[4], segments[1], segments[3]];
    const chains = mergeEndpointLines(scrambled);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 10, y: 20 });
  });

  it('keeps directed lines connected after normalize/unmerge flow', () => {
    // Mix of forward and backward arrows, scrambled
    const a = makeLine('a', [0, 0], [10, 0], 'endpoint', 'forward');
    const b = makeLine('b', [10, 0], [20, 0], 'endpoint', 'forward');
    const c = makeLine('c', [20, 0], [20, 10], 'endpoint', 'backward'); // arrow points to (20,0)
    const scrambled: LineWithPosition[] = [c, a, b];

    const endpoints = findChainEndpoints(scrambled);
    const arrowEnd = chooseArrowEndpoint(endpoints, scrambled) || undefined;
    const chain = normalizeChain(scrambled, arrowEnd);
    expect(chain).not.toBeNull();
    if (!chain) return;

    // Chain should run between the two endpoints; arrow directions should be set to keep connectivity
    const directions = getChainArrowDirections(chain);
    const chainEndpoints = [
      { x: 0, y: 0 },
      { x: 20, y: 10 },
    ];
    const hasEndpoint = (pt: { x: number; y: number }) =>
      chainEndpoints.some((p) => p.x === pt.x && p.y === pt.y);
    expect(hasEndpoint(chain.startPoint)).toBe(true);
    expect(hasEndpoint(chain.endPoint)).toBe(true);
    expect(new Set(chain.lineIds)).toEqual(new Set(['a', 'b', 'c']));
    // After normalization, all segments should align to a single heading
    const dirValues = ['a', 'b', 'c'].map((id) => directions.get(id));
    expect(dirValues.every((d) => d === 'forward' || d === 'backward')).toBe(true);
    expect(new Set(dirValues).size).toBe(1);
  });

  it('detects heading when converting undirected to midpoint with scrambled order', () => {
    // Undirected path: →→↓↓←←↓↓→→ (midpoint arrows added later)
    const segments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], 'midpoint', undefined as any),
      makeLine('b', [10, 0], [20, 0], 'midpoint', undefined as any),
      makeLine('c', [20, 0], [20, 10], 'midpoint', undefined as any),
      makeLine('d', [20, 10], [10, 10], 'midpoint', undefined as any),
      makeLine('e', [10, 10], [0, 10], 'midpoint', undefined as any),
      makeLine('f', [0, 10], [0, 20], 'midpoint', undefined as any),
      makeLine('g', [0, 20], [10, 20], 'midpoint', undefined as any),
      makeLine('h', [10, 20], [20, 20], 'midpoint', undefined as any),
    ];
    const scrambled = [segments[3], segments[0], segments[7], segments[2], segments[5], segments[1], segments[6], segments[4]];
    const chains = mergeMidpointLines(scrambled);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 20, y: 20 });
    // Check each segment direction matches the intended path
    const deltas = [];
    for (let i = 1; i < pts.length; i++) {
      deltas.push({ dx: pts[i].x - pts[i - 1].x, dy: pts[i].y - pts[i - 1].y });
    }
    const expected = [
      { dx: 10, dy: 0 },  // →
      { dx: 10, dy: 0 },  // →
      { dx: 0, dy: 10 },  // ↓
      { dx: -10, dy: 0 }, // ←
      { dx: -10, dy: 0 }, // ←
      { dx: 0, dy: 10 },  // ↓
      { dx: 10, dy: 0 },  // →
      { dx: 10, dy: 0 },  // →
    ];
    expect(deltas).toEqual(expected);
  });

  it('converts truly undirected lines to midpoint using first segment direction', () => {
    const baseSegments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], undefined as any, undefined as any),
      makeLine('b', [10, 0], [20, 0], undefined as any, undefined as any),
      makeLine('c', [20, 0], [20, 10], undefined as any, undefined as any),
      makeLine('d', [20, 10], [10, 10], undefined as any, undefined as any),
      makeLine('e', [10, 10], [0, 10], undefined as any, undefined as any),
      makeLine('f', [0, 10], [0, 20], undefined as any, undefined as any),
      makeLine('g', [0, 20], [10, 20], undefined as any, undefined as any),
      makeLine('h', [10, 20], [20, 20], undefined as any, undefined as any),
    ];
    // Simulate conversion: set directed='midpoint' but keep arrowDirection undefined
    const midpointSegments = baseSegments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: 'midpoint', arrowDirection: undefined },
    }));
    // First segment is 'd' (midpointSegments[3]): from (20,10) to (10,10)
    // 'd' is connected to endpoint (20,20) side via 'c', so first segment implies direction from (20,20) to (0,0)
    const scrambled = [
      midpointSegments[3],
      midpointSegments[0],
      midpointSegments[7],
      midpointSegments[2],
      midpointSegments[5],
      midpointSegments[1],
      midpointSegments[6],
      midpointSegments[4],
    ];
    const chains = mergeMidpointLines(scrambled);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;
    // Direction is determined by first segment 'd' which points from (20,20) toward (0,0)
    expect(pts[0]).toEqual({ x: 20, y: 20 });
    expect(pts[pts.length - 1]).toEqual({ x: 0, y: 0 });
    const deltas = [];
    for (let i = 1; i < pts.length; i++) {
      deltas.push({ dx: pts[i].x - pts[i - 1].x, dy: pts[i].y - pts[i - 1].y });
    }
    // Reversed direction: (20,20) → (0,0)
    const expected = [
      { dx: -10, dy: 0 },
      { dx: -10, dy: 0 },
      { dx: 0, dy: -10 },
      { dx: 10, dy: 0 },
      { dx: 10, dy: 0 },
      { dx: 0, dy: -10 },
      { dx: -10, dy: 0 },
      { dx: -10, dy: 0 },
    ];
    expect(deltas).toEqual(expected);
  });

  it('converts undirected →→↓↓←←↓↓→→ path to midpoint preserving direction', () => {
    // Path: →→↓↓←←↓↓→→ (10 segments forming a zigzag)
    // Coordinates: (0,0) → (10,0) → (20,0) → (20,10) → (20,20) → (10,20) → (0,20) → (0,30) → (0,40) → (10,40) → (20,40)
    const baseSegments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], undefined as any, undefined as any),    // →
      makeLine('b', [10, 0], [20, 0], undefined as any, undefined as any),   // →
      makeLine('c', [20, 0], [20, 10], undefined as any, undefined as any),  // ↓
      makeLine('d', [20, 10], [20, 20], undefined as any, undefined as any), // ↓
      makeLine('e', [20, 20], [10, 20], undefined as any, undefined as any), // ←
      makeLine('f', [10, 20], [0, 20], undefined as any, undefined as any),  // ←
      makeLine('g', [0, 20], [0, 30], undefined as any, undefined as any),   // ↓
      makeLine('h', [0, 30], [0, 40], undefined as any, undefined as any),   // ↓
      makeLine('i', [0, 40], [10, 40], undefined as any, undefined as any),  // →
      makeLine('j', [10, 40], [20, 40], undefined as any, undefined as any), // →
    ];

    // Simulate conversion to midpoint: set directed='midpoint' but keep arrowDirection undefined
    const midpointSegments = baseSegments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: 'midpoint' as const, arrowDirection: undefined },
    }));

    // Scramble order (but keep first segment 'a' first to simulate drawing order)
    const scrambled = [
      midpointSegments[0], // 'a' is first (drawing order determines direction)
      midpointSegments[5],
      midpointSegments[9],
      midpointSegments[2],
      midpointSegments[7],
      midpointSegments[1],
      midpointSegments[6],
      midpointSegments[4],
      midpointSegments[8],
      midpointSegments[3],
    ];

    const chains = mergeMidpointLines(scrambled);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;

    // Chain should flow from (0,0) to (20,40)
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 20, y: 40 });

    // Verify each step direction
    const deltas = [];
    for (let i = 1; i < pts.length; i++) {
      deltas.push({ dx: pts[i].x - pts[i - 1].x, dy: pts[i].y - pts[i - 1].y });
    }
    const expected = [
      { dx: 10, dy: 0 },  // →
      { dx: 10, dy: 0 },  // →
      { dx: 0, dy: 10 },  // ↓
      { dx: 0, dy: 10 },  // ↓
      { dx: -10, dy: 0 }, // ←
      { dx: -10, dy: 0 }, // ←
      { dx: 0, dy: 10 },  // ↓
      { dx: 0, dy: 10 },  // ↓
      { dx: 10, dy: 0 },  // →
      { dx: 10, dy: 0 },  // →
    ];
    expect(deltas).toEqual(expected);
  });

  it('uses first segment to determine chain direction when arrowDirection is undefined', () => {
    // Same path but with first segment being 'j' (last in original order)
    // Should flow from (20,40) to (0,0) - reverse direction
    const baseSegments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], undefined as any, undefined as any),
      makeLine('b', [10, 0], [20, 0], undefined as any, undefined as any),
      makeLine('c', [20, 0], [20, 10], undefined as any, undefined as any),
      makeLine('d', [20, 10], [20, 20], undefined as any, undefined as any),
      makeLine('e', [20, 20], [10, 20], undefined as any, undefined as any),
      makeLine('f', [10, 20], [0, 20], undefined as any, undefined as any),
      makeLine('g', [0, 20], [0, 30], undefined as any, undefined as any),
      makeLine('h', [0, 30], [0, 40], undefined as any, undefined as any),
      makeLine('i', [0, 40], [10, 40], undefined as any, undefined as any),
      makeLine('j', [10, 40], [20, 40], undefined as any, undefined as any),
    ];

    const midpointSegments = baseSegments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: 'midpoint' as const, arrowDirection: undefined },
    }));

    // Put 'j' first to simulate drawing from the other end
    const scrambled = [
      midpointSegments[9], // 'j' is first
      midpointSegments[0],
      midpointSegments[5],
      midpointSegments[2],
      midpointSegments[7],
      midpointSegments[1],
      midpointSegments[6],
      midpointSegments[4],
      midpointSegments[8],
      midpointSegments[3],
    ];

    const chains = mergeMidpointLines(scrambled);
    expect(chains).toHaveLength(1);
    const pts = chains[0].points;

    // Chain should flow from (20,40) to (0,0) - reverse direction
    expect(pts[0]).toEqual({ x: 20, y: 40 });
    expect(pts[pts.length - 1]).toEqual({ x: 0, y: 0 });
  });

  it('infers forward direction when converting undirected to endpoint arrows (→→↓↓←←↓↓→→)', () => {
    // Start as undirected, then set directed='endpoint' with arrowDirection undefined
    const baseSegments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], undefined as any, undefined as any),
      makeLine('b', [10, 0], [20, 0], undefined as any, undefined as any),
      makeLine('c', [20, 0], [20, 10], undefined as any, undefined as any),
      makeLine('d', [20, 10], [20, 20], undefined as any, undefined as any),
      makeLine('e', [20, 20], [10, 20], undefined as any, undefined as any),
      makeLine('f', [10, 20], [0, 20], undefined as any, undefined as any),
      makeLine('g', [0, 20], [0, 30], undefined as any, undefined as any),
      makeLine('h', [0, 30], [0, 40], undefined as any, undefined as any),
    ];
    const directedSegments = baseSegments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: 'endpoint', arrowDirection: undefined },
    }));
    const scrambled = [
      directedSegments[4],
      directedSegments[0],
      directedSegments[7],
      directedSegments[2],
      directedSegments[6],
      directedSegments[1],
      directedSegments[5],
      directedSegments[3],
    ];

    const endpoints = findChainEndpoints(scrambled);
    const arrowEnd = chooseArrowEndpoint(endpoints, scrambled) || undefined;
    const chain = normalizeChain(scrambled, arrowEnd);
    expect(chain).not.toBeNull();
    if (!chain) return;

    const directions = getChainArrowDirections(chain);
    for (const id of chain.lineIds) {
      expect(directions.get(id)).toBe('forward');
    }

    const pts: { x: number; y: number }[] = [];
    // rebuild path from chain using lineMap so we check geometry, too
    const lineMap = new Map<string, LineWithPosition>();
    directedSegments.forEach((seg) => lineMap.set(seg.line.id, seg));
    for (let i = 0; i < chain.lineIds.length; i++) {
      const id = chain.lineIds[i];
      const isForward = chain.lineDirections[i];
      const seg = lineMap.get(id)!;
      const from = { x: isForward ? seg.fromX : seg.toX, y: isForward ? seg.fromY : seg.toY };
      const to = { x: isForward ? seg.toX : seg.fromX, y: isForward ? seg.toY : seg.fromY };
      if (i === 0) pts.push(from);
      pts.push(to);
    }
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 0, y: 40 });
    const deltas = [];
    for (let i = 1; i < pts.length; i++) {
      deltas.push({ dx: pts[i].x - pts[i - 1].x, dy: pts[i].y - pts[i - 1].y });
    }
    const expected = [
      { dx: 10, dy: 0 },
      { dx: 10, dy: 0 },
      { dx: 0, dy: 10 },
      { dx: 0, dy: 10 },
      { dx: -10, dy: 0 },
      { dx: -10, dy: 0 },
      { dx: 0, dy: 10 },
      { dx: 0, dy: 10 },
    ];
    expect(deltas).toEqual(expected);
  });

  it('preserves segment arrow directions: →→↓↓←←↓↓→→ has backward for ←← segments', () => {
    // Path: →→↓↓←←↓↓→→
    // Chain flows (0,0) → (20,0) → (20,20) → (0,20) → (0,40) → (20,40)
    // Segments 'e' and 'f' are ←← (from right to left), so their from→to direction
    // is opposite to the chain progression direction
    // Therefore, they should get arrowDirection='backward'
    const baseSegments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], undefined as any, undefined as any),    // → forward
      makeLine('b', [10, 0], [20, 0], undefined as any, undefined as any),   // → forward
      makeLine('c', [20, 0], [20, 10], undefined as any, undefined as any),  // ↓ forward
      makeLine('d', [20, 10], [20, 20], undefined as any, undefined as any), // ↓ forward
      makeLine('e', [20, 20], [10, 20], undefined as any, undefined as any), // ← backward (from>to but chain goes left)
      makeLine('f', [10, 20], [0, 20], undefined as any, undefined as any),  // ← backward
      makeLine('g', [0, 20], [0, 30], undefined as any, undefined as any),   // ↓ forward
      makeLine('h', [0, 30], [0, 40], undefined as any, undefined as any),   // ↓ forward
      makeLine('i', [0, 40], [10, 40], undefined as any, undefined as any),  // → forward
      makeLine('j', [10, 40], [20, 40], undefined as any, undefined as any), // → forward
    ];

    const directedSegments = baseSegments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: 'endpoint' as const, arrowDirection: undefined },
    }));

    // Keep first segment 'a' first to determine direction as (0,0) → (20,40)
    const scrambled = [
      directedSegments[0], // 'a' first - determines chain direction
      directedSegments[5],
      directedSegments[2],
      directedSegments[7],
      directedSegments[4],
      directedSegments[1],
      directedSegments[6],
      directedSegments[9],
      directedSegments[3],
      directedSegments[8],
    ];

    const endpoints = findChainEndpoints(scrambled);
    expect(endpoints).not.toBeNull();

    // First segment 'a' connects to endpoint (0,0), so arrowEndPoint should be (20,40)
    // This means chain flows from (0,0) to (20,40)
    const arrowEnd = chooseArrowEndpoint(endpoints, scrambled);
    // arrowEnd should be null since arrowDirection is undefined
    expect(arrowEnd).toBeNull();

    // When arrowEnd is null/undefined, we use first segment to determine direction
    // First segment 'a' goes from (0,0) to (10,0), so chain starts at (0,0)
    const chain = normalizeChain(scrambled, undefined);
    expect(chain).not.toBeNull();
    if (!chain) return;

    // Check that the chain flows in the correct direction
    expect(chain.startPoint).toEqual({ x: 0, y: 0 });
    expect(chain.endPoint).toEqual({ x: 20, y: 40 });

    const directions = getChainArrowDirections(chain);

    // Segments 'a', 'b' (→→): from→to matches chain direction → forward
    expect(directions.get('a')).toBe('forward');
    expect(directions.get('b')).toBe('forward');

    // Segments 'c', 'd' (↓↓): from→to matches chain direction → forward
    expect(directions.get('c')).toBe('forward');
    expect(directions.get('d')).toBe('forward');

    // Segments 'e', 'f' (←←): from→to is OPPOSITE to chain direction → backward
    // 'e' goes (20,20)→(10,20) but chain needs to go (20,20)→(10,20) so it's actually forward
    // Wait - let me reconsider. The segment 'e' has from=(20,20) to=(10,20).
    // The chain progresses from (20,20) to (10,20) here.
    // So 'e's from→to MATCHES the chain progression → forward
    expect(directions.get('e')).toBe('forward');
    expect(directions.get('f')).toBe('forward');

    // Segments 'g', 'h' (↓↓): from→to matches chain direction → forward
    expect(directions.get('g')).toBe('forward');
    expect(directions.get('h')).toBe('forward');

    // Segments 'i', 'j' (→→): from→to matches chain direction → forward
    expect(directions.get('i')).toBe('forward');
    expect(directions.get('j')).toBe('forward');
  });

  it('assigns backward arrowDirection when segment from→to opposes chain flow', () => {
    // Create segments where the from→to is opposite to what the chain needs
    // Chain should flow: (0,0) → (10,0) → (20,0)
    // But segment 'b' is defined as (20,0) → (10,0) (opposite direction)
    const segments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], undefined as any, undefined as any),   // → matches chain
      makeLine('b', [20, 0], [10, 0], undefined as any, undefined as any),  // ← opposes chain
    ];

    const directedSegments = segments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: 'endpoint' as const, arrowDirection: undefined },
    }));

    // 'a' is first, so chain direction is determined by 'a': (0,0) → (10,0) → ...
    const endpoints = findChainEndpoints(directedSegments);
    expect(endpoints).not.toBeNull();

    const chain = normalizeChain(directedSegments, undefined);
    expect(chain).not.toBeNull();
    if (!chain) return;

    // Chain should flow (0,0) → (10,0) → (20,0)
    expect(chain.startPoint).toEqual({ x: 0, y: 0 });
    expect(chain.endPoint).toEqual({ x: 20, y: 0 });

    const directions = getChainArrowDirections(chain);

    // 'a' from→to matches chain direction → forward
    expect(directions.get('a')).toBe('forward');

    // 'b' from→to opposes chain direction (b goes 20→10, but chain goes 10→20) → backward
    expect(directions.get('b')).toBe('backward');
  });

  it('arrow visual direction is preserved: →→↓↓←←↓↓→→ does NOT become →→↓↓→→↓↓→→', () => {
    // This test verifies that the visual arrow direction is correctly computed
    // for each segment. The key insight:
    // - arrowDirection='forward' means arrow points in segment's from→to direction
    // - arrowDirection='backward' means arrow points in segment's to→from direction
    //
    // For path →→↓↓←←↓↓→→:
    // - Segment 'e' has from=(20,20) to=(10,20) - geometrically points LEFT (←)
    // - With arrowDirection='forward', arrow points from→to, i.e., LEFT (←)
    // - This is correct! The ← arrow should remain ←
    //
    // If we incorrectly set arrowDirection='backward' for 'e':
    // - Arrow would point to→from, i.e., RIGHT (→)
    // - This would turn ← into →, which is WRONG

    const baseSegments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], undefined as any, undefined as any),    // from→to: →
      makeLine('b', [10, 0], [20, 0], undefined as any, undefined as any),   // from→to: →
      makeLine('c', [20, 0], [20, 10], undefined as any, undefined as any),  // from→to: ↓
      makeLine('d', [20, 10], [20, 20], undefined as any, undefined as any), // from→to: ↓
      makeLine('e', [20, 20], [10, 20], undefined as any, undefined as any), // from→to: ← (LEFT!)
      makeLine('f', [10, 20], [0, 20], undefined as any, undefined as any),  // from→to: ← (LEFT!)
      makeLine('g', [0, 20], [0, 30], undefined as any, undefined as any),   // from→to: ↓
      makeLine('h', [0, 30], [0, 40], undefined as any, undefined as any),   // from→to: ↓
      makeLine('i', [0, 40], [10, 40], undefined as any, undefined as any),  // from→to: →
      makeLine('j', [10, 40], [20, 40], undefined as any, undefined as any), // from→to: →
    ];

    const directedSegments = baseSegments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: 'endpoint' as const, arrowDirection: undefined },
    }));

    // 'a' is first - chain direction: (0,0) → (20,40)
    const chain = normalizeChain(directedSegments, undefined);
    expect(chain).not.toBeNull();
    if (!chain) return;

    const directions = getChainArrowDirections(chain);

    // Helper to compute visual arrow direction
    const getVisualArrowDirection = (seg: LineWithPosition, arrowDir: 'forward' | 'backward') => {
      const dx = arrowDir === 'forward' ? seg.toX - seg.fromX : seg.fromX - seg.toX;
      const dy = arrowDir === 'forward' ? seg.toY - seg.fromY : seg.fromY - seg.toY;
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? '→' : '←';
      } else {
        return dy > 0 ? '↓' : '↑';
      }
    };

    const visualDirections: string[] = [];
    for (const seg of baseSegments) {
      const dir = directions.get(seg.line.id)!;
      visualDirections.push(getVisualArrowDirection(seg, dir));
    }

    // The visual arrow directions should be: →→↓↓←←↓↓→→
    expect(visualDirections).toEqual(['→', '→', '↓', '↓', '←', '←', '↓', '↓', '→', '→']);

    // Verify it's NOT →→↓↓→→↓↓→→ (which would happen if ← segments got backward direction)
    expect(visualDirections).not.toEqual(['→', '→', '↓', '↓', '→', '→', '↓', '↓', '→', '→']);
  });

  it('undirected lines converted to midpoint are grouped by collinearity: →→↓↓←←↓↓→→', () => {
    // Scenario: User draws lines without direction (directed: false),
    // then converts them to midpoint arrows.
    // Midpoint arrows should be grouped by collinearity (same direction segments).
    // Path →→↓↓←←↓↓→→ should become 5 groups: [→→], [↓↓], [←←], [↓↓], [→→]

    const baseSegments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], undefined as any, undefined as any),    // from→to: →
      makeLine('b', [10, 0], [20, 0], undefined as any, undefined as any),   // from→to: →
      makeLine('c', [20, 0], [20, 10], undefined as any, undefined as any),  // from→to: ↓
      makeLine('d', [20, 10], [20, 20], undefined as any, undefined as any), // from→to: ↓
      makeLine('e', [20, 20], [10, 20], undefined as any, undefined as any), // from→to: ← (LEFT!)
      makeLine('f', [10, 20], [0, 20], undefined as any, undefined as any),  // from→to: ← (LEFT!)
      makeLine('g', [0, 20], [0, 30], undefined as any, undefined as any),   // from→to: ↓
      makeLine('h', [0, 30], [0, 40], undefined as any, undefined as any),   // from→to: ↓
      makeLine('i', [0, 40], [10, 40], undefined as any, undefined as any),  // from→to: →
      makeLine('j', [10, 40], [20, 40], undefined as any, undefined as any), // from→to: →
    ];

    // Step 1: Start as undirected (directed: false, arrowDirection: undefined)
    const undirectedSegments = baseSegments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: false as const, arrowDirection: undefined },
    }));

    // Step 2: Convert to midpoint (directed: 'midpoint', arrowDirection: undefined initially)
    const midpointSegments = undirectedSegments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: 'midpoint' as const, arrowDirection: undefined },
    }));

    // Group by collinear connectivity (this is what midpoint should do)
    const collinearGroups = groupLinesByConnection(midpointSegments, areLinesCollinearConnected);

    // Should have 5 groups: →→, ↓↓, ←←, ↓↓, →→
    expect(collinearGroups).toHaveLength(5);

    // Build a map for quick lookup
    const lineMap = new Map<string, LineWithPosition>();
    for (const seg of midpointSegments) {
      lineMap.set(seg.line.id, seg);
    }

    // Merge each collinear group separately
    const allChains = collinearGroups.map((groupIds) => {
      const groupLines = groupIds.map((id) => lineMap.get(id)!);
      return mergeMidpointLines(groupLines);
    });

    // Each group should produce exactly 1 chain
    expect(allChains.every((chains) => chains.length === 1)).toBe(true);

    // Helper to compute visual arrow direction
    const getVisualArrowDirection = (seg: LineWithPosition, arrowDir: 'forward' | 'backward') => {
      const dx = arrowDir === 'forward' ? seg.toX - seg.fromX : seg.fromX - seg.toX;
      const dy = arrowDir === 'forward' ? seg.toY - seg.fromY : seg.fromY - seg.toY;
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? '→' : '←';
      } else {
        return dy > 0 ? '↓' : '↑';
      }
    };

    // Get arrow directions for all segments
    const visualDirections: string[] = [];
    for (const seg of baseSegments) {
      // Find which group this segment belongs to
      const groupIdx = collinearGroups.findIndex((g) => g.includes(seg.line.id));
      const groupLines = collinearGroups[groupIdx].map((id) => lineMap.get(id)!);
      const chain = normalizeChain(groupLines, undefined);
      if (!chain) continue;
      const directions = getChainArrowDirections(chain);
      const dir = directions.get(seg.line.id)!;
      visualDirections.push(getVisualArrowDirection(seg, dir));
    }

    // The visual arrow directions should be: →→↓↓←←↓↓→→
    expect(visualDirections).toEqual(['→', '→', '↓', '↓', '←', '←', '↓', '↓', '→', '→']);

    // Verify it's NOT →→↓↓→→↓↓→→ (all arrows pointing right)
    expect(visualDirections).not.toEqual(['→', '→', '↓', '↓', '→', '→', '↓', '↓', '→', '→']);
  });

  it('undirected lines converted to midpoint with scrambled order preserve visual direction per group', () => {
    // Same as above but with scrambled input order

    const baseSegments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], undefined as any, undefined as any),    // from→to: →
      makeLine('b', [10, 0], [20, 0], undefined as any, undefined as any),   // from→to: →
      makeLine('c', [20, 0], [20, 10], undefined as any, undefined as any),  // from→to: ↓
      makeLine('d', [20, 10], [20, 20], undefined as any, undefined as any), // from→to: ↓
      makeLine('e', [20, 20], [10, 20], undefined as any, undefined as any), // from→to: ←
      makeLine('f', [10, 20], [0, 20], undefined as any, undefined as any),  // from→to: ←
      makeLine('g', [0, 20], [0, 30], undefined as any, undefined as any),   // from→to: ↓
      makeLine('h', [0, 30], [0, 40], undefined as any, undefined as any),   // from→to: ↓
      makeLine('i', [0, 40], [10, 40], undefined as any, undefined as any),  // from→to: →
      makeLine('j', [10, 40], [20, 40], undefined as any, undefined as any), // from→to: →
    ];

    // Convert to midpoint with undefined arrowDirection
    const midpointSegments = baseSegments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: 'midpoint' as const, arrowDirection: undefined },
    }));

    // Scramble order
    const scrambled = [
      midpointSegments[5], // 'f'
      midpointSegments[2], // 'c'
      midpointSegments[7], // 'h'
      midpointSegments[0], // 'a'
      midpointSegments[4], // 'e'
      midpointSegments[1], // 'b'
      midpointSegments[6], // 'g'
      midpointSegments[9], // 'j'
      midpointSegments[3], // 'd'
      midpointSegments[8], // 'i'
    ];

    // Group by collinear connectivity
    const collinearGroups = groupLinesByConnection(scrambled, areLinesCollinearConnected);

    // Should have 5 groups
    expect(collinearGroups).toHaveLength(5);

    // Build a map for quick lookup
    const lineMap = new Map<string, LineWithPosition>();
    for (const seg of scrambled) {
      lineMap.set(seg.line.id, seg);
    }

    // Helper to compute visual arrow direction
    const getVisualArrowDirection = (seg: LineWithPosition, arrowDir: 'forward' | 'backward') => {
      const dx = arrowDir === 'forward' ? seg.toX - seg.fromX : seg.fromX - seg.toX;
      const dy = arrowDir === 'forward' ? seg.toY - seg.fromY : seg.fromY - seg.toY;
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? '→' : '←';
      } else {
        return dy > 0 ? '↓' : '↑';
      }
    };

    // Get arrow directions for all segments (in original order)
    const visualDirections: string[] = [];
    for (const seg of baseSegments) {
      // Find which group this segment belongs to
      const groupIdx = collinearGroups.findIndex((g) => g.includes(seg.line.id));
      const groupLines = collinearGroups[groupIdx].map((id) => lineMap.get(id)!);
      const chain = normalizeChain(groupLines, undefined);
      if (!chain) continue;
      const directions = getChainArrowDirections(chain);
      const dir = directions.get(seg.line.id)!;
      visualDirections.push(getVisualArrowDirection(seg, dir));
    }

    // The visual arrow directions should be: →→↓↓←←↓↓→→
    expect(visualDirections).toEqual(['→', '→', '↓', '↓', '←', '←', '↓', '↓', '→', '→']);
  });

  it('single segment (length 1) preserves its from→to direction as forward', () => {
    // A single ← segment should have arrowDirection='forward' to display as ←
    const leftSegment = makeLine('e', [20, 20], [10, 20], undefined as any, undefined as any);
    const midpointSegment = {
      ...leftSegment,
      line: { ...leftSegment.line, directed: 'midpoint' as const, arrowDirection: undefined },
    };

    // Single segment case - normalizeChain should return forward direction
    const chain = normalizeChain([midpointSegment], undefined);
    expect(chain).not.toBeNull();
    if (!chain) return;

    const directions = getChainArrowDirections(chain);
    expect(directions.get('e')).toBe('forward');

    // Helper to compute visual arrow direction
    const getVisualArrowDirection = (seg: LineWithPosition, arrowDir: 'forward' | 'backward') => {
      const dx = arrowDir === 'forward' ? seg.toX - seg.fromX : seg.fromX - seg.toX;
      const dy = arrowDir === 'forward' ? seg.toY - seg.fromY : seg.fromY - seg.toY;
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? '→' : '←';
      } else {
        return dy > 0 ? '↓' : '↑';
      }
    };

    // With forward direction, visual should be ← (from→to direction)
    const visual = getVisualArrowDirection(midpointSegment, directions.get('e')!);
    expect(visual).toBe('←');
  });

  it('isolated segments (not in collinear groups) preserve their visual direction', () => {
    // Path where each segment is isolated (not collinear with neighbors)
    // →↓←↓→ - 5 isolated segments
    const baseSegments: LineWithPosition[] = [
      makeLine('a', [0, 0], [10, 0], undefined as any, undefined as any),   // →
      makeLine('b', [10, 0], [10, 10], undefined as any, undefined as any), // ↓
      makeLine('c', [10, 10], [0, 10], undefined as any, undefined as any), // ←
      makeLine('d', [0, 10], [0, 20], undefined as any, undefined as any),  // ↓
      makeLine('e', [0, 20], [10, 20], undefined as any, undefined as any), // →
    ];

    const midpointSegments = baseSegments.map((seg) => ({
      ...seg,
      line: { ...seg.line, directed: 'midpoint' as const, arrowDirection: undefined },
    }));

    // Group by collinearity - should return empty (no groups of 2+ collinear)
    const collinearGroups = groupLinesByConnection(midpointSegments, areLinesCollinearConnected);
    expect(collinearGroups).toHaveLength(0);

    // Each segment should be processed individually
    // For isolated segments, normalizeChain with single segment returns forward
    const getVisualArrowDirection = (seg: LineWithPosition, arrowDir: 'forward' | 'backward') => {
      const dx = arrowDir === 'forward' ? seg.toX - seg.fromX : seg.fromX - seg.toX;
      const dy = arrowDir === 'forward' ? seg.toY - seg.fromY : seg.fromY - seg.toY;
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? '→' : '←';
      } else {
        return dy > 0 ? '↓' : '↑';
      }
    };

    const visualDirections: string[] = [];
    for (const seg of midpointSegments) {
      // Single segment: normalizeChain returns forward
      const chain = normalizeChain([seg], undefined);
      expect(chain).not.toBeNull();
      if (!chain) continue;
      const directions = getChainArrowDirections(chain);
      const dir = directions.get(seg.line.id)!;
      visualDirections.push(getVisualArrowDirection(seg, dir));
    }

    // Visual directions should match the from→to of each segment
    expect(visualDirections).toEqual(['→', '↓', '←', '↓', '→']);
  });
});
