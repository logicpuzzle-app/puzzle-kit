/**
 * Puzzle Genres and Constraints
 *
 * Defines puzzle genre types, tags, and constraint checking interfaces
 */

/**
 * Known puzzle genres with their identifiers
 */
export const PUZZLE_GENRES = {
  // Number placement puzzles
  SUDOKU: 'sudoku',
  KAKURO: 'kakuro',
  FUTOSHIKI: 'futoshiki',
  KENKEN: 'kenken',
  KROPKI: 'kropki',
  KILLER_SUDOKU: 'killer-sudoku',
  SKYSCRAPER: 'skyscraper',
  HIDATO: 'hidato',

  // Shading puzzles
  NURIKABE: 'nurikabe',
  HEYAWAKE: 'heyawake',
  NORINORI: 'norinori',
  TAPA: 'tapa',
  CAVE: 'cave',
  KURODOKO: 'kurodoko',

  // Line/path puzzles
  SLITHERLINK: 'slitherlink',
  MASYU: 'masyu',
  YAJILIN: 'yajilin',
  ARAF: 'araf',
  CASTLE_WALL: 'castle-wall',
  SHAKASHAKA: 'shakashaka',

  // Region puzzles
  FILLOMINO: 'fillomino',
  PENTOMINOUS: 'pentominous',
  LITS: 'lits',
  STOSTONE: 'stostone',

  // Object placement puzzles
  TENTS: 'tents',
  BATTLESHIPS: 'battleships',
  STAR_BATTLE: 'star-battle',
  QUEENS: 'queens',

  // Hybrid/other puzzles
  NANRO: 'nanro',
  RIPPLE_EFFECT: 'ripple-effect',
  THERMOMETER: 'thermometer',
  ARROW_SUDOKU: 'arrow-sudoku',

  // Generic
  CUSTOM: 'custom',
  UNKNOWN: 'unknown',
} as const;

export type PuzzleGenre = (typeof PUZZLE_GENRES)[keyof typeof PUZZLE_GENRES];

/**
 * Puzzle tags for filtering and categorization
 */
export const PUZZLE_TAGS = {
  // Difficulty
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert',

  // Grid type
  SQUARE_GRID: 'square-grid',
  HEX_GRID: 'hex-grid',
  TRIANGLE_GRID: 'triangle-grid',

  // Element types
  HAS_NUMBERS: 'has-numbers',
  HAS_SHADING: 'has-shading',
  HAS_LINES: 'has-lines',
  HAS_REGIONS: 'has-regions',
  HAS_SYMBOLS: 'has-symbols',

  // Constraint types
  LATIN_SQUARE: 'latin-square',
  NO_2X2: 'no-2x2',
  CONNECTED: 'connected',
  SINGLE_LOOP: 'single-loop',
  ORTHOGONAL: 'orthogonal',
  DIAGONAL: 'diagonal',

  // Source
  NIKOLI: 'nikoli',
  JAPANESE: 'japanese',
  WESTERN: 'western',
  ORIGINAL: 'original',
} as const;

export type PuzzleTag = (typeof PUZZLE_TAGS)[keyof typeof PUZZLE_TAGS];

/**
 * Genre metadata
 */
export interface GenreInfo {
  id: PuzzleGenre;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  tags: PuzzleTag[];
  rules?: string;
  rulesJa?: string;
}

/**
 * Genre registry
 */
export const GENRE_INFO: Record<PuzzleGenre, GenreInfo> = {
  [PUZZLE_GENRES.SUDOKU]: {
    id: PUZZLE_GENRES.SUDOKU,
    name: 'Sudoku',
    nameJa: '数独',
    description: 'Fill a 9x9 grid with digits 1-9 so each row, column, and 3x3 box contains each digit exactly once.',
    descriptionJa: '9×9のマスに1〜9の数字を入れて、各行・列・3×3ブロックに同じ数字が重複しないようにする。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.LATIN_SQUARE, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.KAKURO]: {
    id: PUZZLE_GENRES.KAKURO,
    name: 'Kakuro',
    nameJa: 'カックロ',
    description: 'Fill white cells with digits 1-9 so each horizontal or vertical run sums to the clue, with no repeated digits in a run.',
    descriptionJa: '白マスに1〜9を入れ、連続する白マスの和が手がかりの数字になるようにする。同じ連続内で数字は重複しない。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.SLITHERLINK]: {
    id: PUZZLE_GENRES.SLITHERLINK,
    name: 'Slitherlink',
    nameJa: 'スリザーリンク',
    description: 'Draw a single closed loop along grid edges so each number indicates how many of its edges are part of the loop.',
    descriptionJa: '格子点を結んで1つの閉じた輪を作る。数字はその周りの辺のうち何本が輪の一部かを示す。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_LINES, PUZZLE_TAGS.SINGLE_LOOP, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.MASYU]: {
    id: PUZZLE_GENRES.MASYU,
    name: 'Masyu',
    nameJa: 'ましゅ',
    description: 'Draw a single closed loop passing through all circles. White circles: loop passes straight through but turns on at least one adjacent cell. Black circles: loop turns on the circle and passes straight through both adjacent cells.',
    descriptionJa: 'すべての丸を通る1つの閉じた輪を作る。白丸では直進し、隣接セルの少なくとも1つで曲がる。黒丸では曲がり、両隣で直進する。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_SYMBOLS, PUZZLE_TAGS.HAS_LINES, PUZZLE_TAGS.SINGLE_LOOP, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.NURIKABE]: {
    id: PUZZLE_GENRES.NURIKABE,
    name: 'Nurikabe',
    nameJa: 'ぬりかべ',
    description: 'Shade some cells so that: (1) all shaded cells form one connected region, (2) numbered cells are unshaded and each is part of an island of that size, (3) there are no 2x2 shaded regions.',
    descriptionJa: '黒マスを塗りつぶし、数字セルは白いまま。数字の島はその大きさで、黒は全体で繋がり、2×2の黒ができないようにする。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.NO_2X2, PUZZLE_TAGS.CONNECTED, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.HEYAWAKE]: {
    id: PUZZLE_GENRES.HEYAWAKE,
    name: 'Heyawake',
    nameJa: 'へやわけ',
    description: 'Shade some cells so that: (1) shaded cells cannot be adjacent, (2) unshaded cells form one connected region, (3) numbers indicate shaded cells in that room, (4) a straight line cannot pass through 2+ room boundaries uninterrupted.',
    descriptionJa: '部屋内に指定数の黒マスを置く。黒は隣接せず、白は全体でつながり、2つ以上の部屋の境界を白で連続して横切らない。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.HAS_REGIONS, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.YAJILIN]: {
    id: PUZZLE_GENRES.YAJILIN,
    name: 'Yajilin',
    nameJa: 'ヤジリン',
    description: 'Shade some cells and draw a single closed loop through all unshaded cells (except clue cells). Clue arrows indicate how many shaded cells are in that direction. Shaded cells cannot be adjacent.',
    descriptionJa: '黒マスを塗り、残りの白マス（手がかり除く）を通る1つの輪を作る。矢印は方向にある黒マスの数を示す。黒は隣接しない。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.HAS_LINES, PUZZLE_TAGS.SINGLE_LOOP, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.TAPA]: {
    id: PUZZLE_GENRES.TAPA,
    name: 'Tapa',
    nameJa: 'タパ',
    description: 'Shade cells so that shaded cells form one connected region with no 2x2 squares. Clue numbers indicate the lengths of consecutive shaded cell groups around that cell.',
    descriptionJa: '黒マスを塗り、全体でつながり2×2を作らない。数字はその周囲8マスの黒の連続の長さを示す。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.NO_2X2, PUZZLE_TAGS.CONNECTED],
  },
  [PUZZLE_GENRES.FILLOMINO]: {
    id: PUZZLE_GENRES.FILLOMINO,
    name: 'Fillomino',
    nameJa: 'フィルオミノ',
    description: 'Fill the grid with numbers where each number belongs to a region of that size. Same-numbered regions cannot touch orthogonally.',
    descriptionJa: '全マスに数字を入れ、同じ数字がつながった領域のサイズがその数字になるようにする。同じ数字の領域は辺で隣接しない。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_REGIONS, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.STAR_BATTLE]: {
    id: PUZZLE_GENRES.STAR_BATTLE,
    name: 'Star Battle',
    nameJa: 'スターバトル',
    description: 'Place stars in the grid so that each row, column, and region contains exactly the required number of stars. Stars cannot touch, even diagonally.',
    descriptionJa: '各行・列・領域に決められた数の星を置く。星は縦横斜めに隣接しない。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_SYMBOLS, PUZZLE_TAGS.HAS_REGIONS],
  },
  // Add more genres as needed...
  [PUZZLE_GENRES.FUTOSHIKI]: {
    id: PUZZLE_GENRES.FUTOSHIKI,
    name: 'Futoshiki',
    nameJa: '不等式',
    description: 'Fill the grid with numbers 1-N so each row and column contains each number once. Inequality signs between cells must be satisfied.',
    descriptionJa: '各行・列に1〜Nを1つずつ入れる。不等号の関係を満たすこと。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.LATIN_SQUARE],
  },
  [PUZZLE_GENRES.KENKEN]: {
    id: PUZZLE_GENRES.KENKEN,
    name: 'KenKen',
    nameJa: 'けんけん',
    description: 'Fill the grid with numbers 1-N so each row and column contains each number once. Cages show a target number and operation that cells must satisfy.',
    descriptionJa: '各行・列に1〜Nを1つずつ入れる。ケージ内の数字は指定演算の結果になる。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_REGIONS, PUZZLE_TAGS.LATIN_SQUARE],
  },
  [PUZZLE_GENRES.KROPKI]: {
    id: PUZZLE_GENRES.KROPKI,
    name: 'Kropki',
    nameJa: 'クロプキ',
    description: 'Fill the grid with numbers 1-N so each row and column contains each number once. White dots: adjacent numbers differ by 1. Black dots: one number is double the other.',
    descriptionJa: '各行・列に1〜Nを1つずつ入れる。白丸は差が1、黒丸は一方が他方の2倍。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_SYMBOLS, PUZZLE_TAGS.LATIN_SQUARE],
  },
  [PUZZLE_GENRES.KILLER_SUDOKU]: {
    id: PUZZLE_GENRES.KILLER_SUDOKU,
    name: 'Killer Sudoku',
    nameJa: 'キラー数独',
    description: 'Standard Sudoku rules, plus cage sums. Numbers in a cage must sum to the indicated value and cannot repeat within the cage.',
    descriptionJa: '通常の数独ルールに加え、ケージ内の数字の和が指定値になり、ケージ内で数字は重複しない。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_REGIONS, PUZZLE_TAGS.LATIN_SQUARE, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.SKYSCRAPER]: {
    id: PUZZLE_GENRES.SKYSCRAPER,
    name: 'Skyscraper',
    nameJa: '高層ビル',
    description: 'Fill the grid with numbers 1-N so each row and column contains each number once. Edge clues indicate how many buildings are visible from that direction (taller buildings block shorter ones behind).',
    descriptionJa: '各行・列に1〜Nを1つずつ入れる。端の数字は、その方向から見えるビル（数字）の数。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.LATIN_SQUARE],
  },
  [PUZZLE_GENRES.HIDATO]: {
    id: PUZZLE_GENRES.HIDATO,
    name: 'Hidato',
    nameJa: 'ヒダト',
    description: 'Fill the grid with consecutive numbers so that each number is adjacent (including diagonally) to the next number.',
    descriptionJa: 'マスに連続する数字を入れ、各数字が次の数字と（斜めも含めて）隣接するようにする。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.DIAGONAL],
  },
  [PUZZLE_GENRES.NORINORI]: {
    id: PUZZLE_GENRES.NORINORI,
    name: 'Norinori',
    nameJa: 'のりのり',
    description: 'Shade exactly two cells in each region so that every shaded cell is part of a 1x2 domino (two orthogonally adjacent shaded cells).',
    descriptionJa: '各領域に2マス塗る。塗ったマスはすべて他の塗ったマスと1つだけ辺を共有する（1×2のドミノを形成）。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.HAS_REGIONS, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.CAVE]: {
    id: PUZZLE_GENRES.CAVE,
    name: 'Cave',
    nameJa: 'ケイブ',
    description: 'Shade some cells to create a cave (unshaded region). The cave must be connected. Clue numbers indicate how many unshaded cells are visible in a straight line from that cell.',
    descriptionJa: '黒マスを塗り、白マスで洞窟を作る。白は連結。数字はその位置から縦横に見える白マスの総数。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.CONNECTED],
  },
  [PUZZLE_GENRES.KURODOKO]: {
    id: PUZZLE_GENRES.KURODOKO,
    name: 'Kurodoko',
    nameJa: '黒どこ',
    description: 'Shade some cells so that unshaded cells form one connected region with no 2x2 unshaded squares. Numbers indicate total cells visible in a straight line from that cell (including itself).',
    descriptionJa: '黒マスを塗り、白は連結で2×2を作らない。数字はその位置から縦横に見える白マスの総数（自身含む）。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.NO_2X2, PUZZLE_TAGS.CONNECTED],
  },
  [PUZZLE_GENRES.ARAF]: {
    id: PUZZLE_GENRES.ARAF,
    name: 'Araf',
    nameJa: 'アーラフ',
    description: 'Divide the grid into regions so each region contains exactly two numbers and its size is strictly between those two numbers.',
    descriptionJa: 'グリッドを領域に分け、各領域は2つの数字を含み、サイズはその2つの数字の間（両端含まず）。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_REGIONS, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.CASTLE_WALL]: {
    id: PUZZLE_GENRES.CASTLE_WALL,
    name: 'Castle Wall',
    nameJa: '城壁',
    description: 'Draw a single closed loop. Black clues must be outside the loop, white clues inside. Numbers indicate loop segments on edges adjacent to that cell.',
    descriptionJa: '1つの閉じた輪を描く。黒い数字は輪の外、白い数字は輪の内側。数字はそのセルに隣接する辺のうちループの一部の数。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_LINES, PUZZLE_TAGS.SINGLE_LOOP],
  },
  [PUZZLE_GENRES.SHAKASHAKA]: {
    id: PUZZLE_GENRES.SHAKASHAKA,
    name: 'Shakashaka',
    nameJa: 'シャカシャカ',
    description: 'Place right triangles (shaded in half) so that white regions form rectangles. Numbers indicate how many triangles touch that black cell.',
    descriptionJa: '直角三角形（半分塗り）を置き、白い部分がすべて長方形になるようにする。黒マスの数字は隣接する三角形の数。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.PENTOMINOUS]: {
    id: PUZZLE_GENRES.PENTOMINOUS,
    name: 'Pentominous',
    nameJa: 'ペントミノ',
    description: 'Divide the grid into pentominoes (5-cell regions). Same-shaped pentominoes cannot touch orthogonally. Letters indicate which pentomino shape that cell belongs to.',
    descriptionJa: 'グリッドを5マスのペントミノに分ける。同じ形のペントミノは辺で隣接しない。文字はそのセルが属する形を示す。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_REGIONS],
  },
  [PUZZLE_GENRES.LITS]: {
    id: PUZZLE_GENRES.LITS,
    name: 'LITS',
    nameJa: 'LITS',
    description: 'Shade exactly 4 cells in each region to form one of the tetrominoes L, I, T, or S. Shaded cells must all connect, but no 2x2 squares. Same-shape tetrominoes cannot touch orthogonally.',
    descriptionJa: '各領域に4マス塗り、L/I/T/Sのテトロミノを1つ作る。黒は全体で連結、2×2禁止。同じ形は辺で隣接しない。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.HAS_REGIONS, PUZZLE_TAGS.NO_2X2, PUZZLE_TAGS.CONNECTED, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.STOSTONE]: {
    id: PUZZLE_GENRES.STOSTONE,
    name: 'Stostone',
    nameJa: 'ストストーン',
    description: 'Shade some cells so each region has exactly half shaded. Shaded cells must form one connected region. When "gravity" pulls shaded cells down, they fill exactly the bottom half of the grid.',
    descriptionJa: '各領域の半分を塗る。黒は全体で連結。黒を下に落とすとグリッドの下半分がちょうど埋まる。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.HAS_REGIONS, PUZZLE_TAGS.CONNECTED, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.TENTS]: {
    id: PUZZLE_GENRES.TENTS,
    name: 'Tents',
    nameJa: 'テント',
    description: 'Place tents so each tree has exactly one adjacent tent (orthogonally). Tents cannot touch each other, even diagonally. Row/column clues indicate tent counts.',
    descriptionJa: '各木に1つのテントを隣接させる。テントは縦横斜めに隣接しない。端の数字はその行/列のテント数。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_SYMBOLS],
  },
  [PUZZLE_GENRES.BATTLESHIPS]: {
    id: PUZZLE_GENRES.BATTLESHIPS,
    name: 'Battleships',
    nameJa: '戦艦',
    description: 'Place a fleet of ships in the grid. Ships cannot touch each other, even diagonally. Row/column clues indicate how many ship cells are in that line.',
    descriptionJa: '艦隊を配置する。船は縦横斜めに隣接しない。端の数字はその行/列の船セル数。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_SHADING],
  },
  [PUZZLE_GENRES.QUEENS]: {
    id: PUZZLE_GENRES.QUEENS,
    name: 'Queens',
    nameJa: 'クイーン',
    description: 'Place queens so no two attack each other. Each region must contain exactly one queen.',
    descriptionJa: '各領域に1つのクイーンを置く。クイーン同士は縦横斜めに攻撃できない。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_SYMBOLS, PUZZLE_TAGS.HAS_REGIONS],
  },
  [PUZZLE_GENRES.NANRO]: {
    id: PUZZLE_GENRES.NANRO,
    name: 'Nanro',
    nameJa: 'ナンロ',
    description: 'Fill some cells with numbers so numbered cells form one connected region with no 2x2 squares. Each region has at least one number, all numbers in a region are the same and equal the count of numbers in that region. Same numbers cannot touch across region borders.',
    descriptionJa: 'マスに数字を入れ、数字のマスは連結で2×2を作らない。各領域に少なくとも1つ数字があり、領域内は同じ数字で領域内の数字の個数を示す。異なる領域で同じ数字は辺で隣接しない。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_REGIONS, PUZZLE_TAGS.NO_2X2, PUZZLE_TAGS.CONNECTED, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.RIPPLE_EFFECT]: {
    id: PUZZLE_GENRES.RIPPLE_EFFECT,
    name: 'Ripple Effect',
    nameJa: '波及効果',
    description: 'Fill each region with numbers 1 to its size. If two identical numbers N appear in the same row/column, there must be at least N cells between them.',
    descriptionJa: '各領域に1からサイズまでの数字を入れる。同じ行/列で同じ数字Nがあれば、間にNマス以上必要。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.HAS_REGIONS, PUZZLE_TAGS.NIKOLI],
  },
  [PUZZLE_GENRES.THERMOMETER]: {
    id: PUZZLE_GENRES.THERMOMETER,
    name: 'Thermometer',
    nameJa: 'サーモメーター',
    description: 'Fill cells on thermometers from the bulb upward. Row/column clues indicate how many cells are filled. Numbers increase from bulb to tip.',
    descriptionJa: 'サーモメーターは球から先端に向かって連続して塗る。端の数字は塗ったマス数。数字は球から先端へ増加。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_SHADING, PUZZLE_TAGS.HAS_NUMBERS],
  },
  [PUZZLE_GENRES.ARROW_SUDOKU]: {
    id: PUZZLE_GENRES.ARROW_SUDOKU,
    name: 'Arrow Sudoku',
    nameJa: '矢印数独',
    description: 'Standard Sudoku rules. Numbers on an arrow must sum to the number in the arrow\'s circle.',
    descriptionJa: '通常の数独ルール。矢印上の数字の和は、矢印の円内の数字と等しい。',
    tags: [PUZZLE_TAGS.SQUARE_GRID, PUZZLE_TAGS.HAS_NUMBERS, PUZZLE_TAGS.LATIN_SQUARE],
  },
  [PUZZLE_GENRES.CUSTOM]: {
    id: PUZZLE_GENRES.CUSTOM,
    name: 'Custom',
    nameJa: 'カスタム',
    description: 'A custom puzzle with user-defined rules.',
    descriptionJa: 'ユーザー定義ルールのカスタムパズル。',
    tags: [],
  },
  [PUZZLE_GENRES.UNKNOWN]: {
    id: PUZZLE_GENRES.UNKNOWN,
    name: 'Unknown',
    nameJa: '不明',
    description: 'Puzzle type is not identified.',
    descriptionJa: 'パズルタイプが不明。',
    tags: [],
  },
};

/**
 * Get all genres with a specific tag
 */
export function getGenresByTag(tag: PuzzleTag): PuzzleGenre[] {
  return Object.values(GENRE_INFO)
    .filter((info) => info.tags.includes(tag))
    .map((info) => info.id);
}

/**
 * Get all genres containing specified tags (AND logic)
 */
export function getGenresWithTags(tags: PuzzleTag[]): PuzzleGenre[] {
  return Object.values(GENRE_INFO)
    .filter((info) => tags.every((tag) => info.tags.includes(tag)))
    .map((info) => info.id);
}

/**
 * Get genre info by ID
 */
export function getGenreInfo(genre: PuzzleGenre): GenreInfo {
  return GENRE_INFO[genre] || GENRE_INFO[PUZZLE_GENRES.UNKNOWN];
}
