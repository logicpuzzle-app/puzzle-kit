import { describe, it, expect } from 'vitest';
import { parsePuzzlinkUrl } from '../utils/penpaCompat';
import { isDirectionalNumber } from '../utils/numberEntries';

describe('Puzz.link Slitherlink import', () => {
  it('should parse slither URL', () => {
    const testUrl = 'https://puzz.link/p?slither/10/10/dgj2l2i3i11c0c22c2ci1g3h2h1g0ci2c23c1c02ci1i3i2l2jgd';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('slither');
  });

  it('should parse slitherlink URL (alternate name)', () => {
    // Some puzz.link URLs use 'slitherlink' instead of 'slither'
    const testUrl = 'https://puzz.link/p?slitherlink/5/5/cbcbcddad';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('slitherlink');
  });

  it('should parse slitherlink clues into directional numbers', () => {
    const testUrl = 'https://puzz.link/p?slither/5/5/cbcbcddad';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    const numbers = Object.values(result?.state?.problem?.numbers || {}).filter(isDirectionalNumber);
    expect(numbers.length).toBeGreaterThan(0);

    // Check clue structure
    const firstClue = numbers[0];
    expect(firstClue).toHaveProperty('id');
    expect(firstClue).toHaveProperty('cellId');
    expect(firstClue).toHaveProperty('direction');
    expect(firstClue).toHaveProperty('value');
    expect(firstClue.direction).toBe(0); // Slitherlink has no direction
    const value = parseInt(firstClue.value, 10);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(3);
  });
});

describe('Puzz.link Simple Gako import', () => {
  it('should parse simplegako URL', () => {
    const testUrl = 'https://puzz.link/p?simplegako/2/2/1234';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('simplegako');
  });

  it('should parse simplegako numbers into problem layer', () => {
    const testUrl = 'https://puzz.link/p?simplegako/2/2/1234';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    const numbers = Object.values(result?.state?.problem?.numbers || {});
    expect(numbers.length).toBe(4);

    const numberMap = new Map(numbers.map((n) => [n.cellId, n.value]));
    expect(numberMap.get('cell-0-0')).toBe('1');
    expect(numberMap.get('cell-0-1')).toBe('2');
    expect(numberMap.get('cell-1-0')).toBe('3');
    expect(numberMap.get('cell-1-1')).toBe('4');
  });
});

describe('Puzz.link Nanro import', () => {
  it('should parse nanro URL', () => {
    const testUrl = 'https://puzz.link/p?nanro/2/2/001234';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('nanro');
  });

  it('should parse nanro borders and numbers', () => {
    const testUrl = 'https://puzz.link/p?nanro/2/2/001234';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.state?.problem?.walls).toBeDefined();
    expect(result?.state?.problem?.roomMap).toBeDefined();

    const numbers = Object.values(result?.state?.problem?.numbers || {});
    expect(numbers.length).toBe(4);
  });
});

describe('Puzz.link LITS import', () => {
  it('should parse lits URL', () => {
    const testUrl = 'https://puzz.link/p?lits/10/10/gdifrsp0ia3c6kt9268q384lesv2bud20tgo';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('lits');
  });

  it('should parse lits borders into walls and room map', () => {
    const testUrl = 'https://puzz.link/p?lits/10/10/gdifrsp0ia3c6kt9268q384lesv2bud20tgo';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.state?.problem?.walls).toBeDefined();
    expect(result?.state?.problem?.roomMap).toBeDefined();
  });
});

describe('Puzz.link Norinori import', () => {
  it('should parse norinori URL', () => {
    const testUrl = 'https://puzz.link/p?norinori/5/5/9a9a9a9a9a';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('norinori');
  });
});

describe('Puzz.link Choco Banana import', () => {
  it('should parse cbanana URL', () => {
    const testUrl = 'https://puzz.link/p?cbanana/2/2/1234';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('cbanana');
  });
});

describe('Puzz.link Nurimisaki import', () => {
  it('should parse nurimisaki URL', () => {
    const testUrl = 'https://puzz.link/p?nurimisaki/2/2/1234';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('nurimisaki');
  });
});

describe('Puzz.link Ayeheya import', () => {
  it('should parse ayeheya URL', () => {
    const testUrl = 'https://puzz.link/p?ayeheya/6/6/99aa8c0vu0ufk2k';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('ayeheya');
  });
});

describe('Puzz.link Akichi import', () => {
  it('should parse akichi URL', () => {
    const testUrl = 'https://puzz.link/p?akichi/6/6/lll199007rs11434g1g0';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('akichi');
  });
});

describe('Puzz.link Numberlink import', () => {
  it('should parse numlin URL', () => {
    const testUrl = 'https://puzz.link/p?numlin/5/5/1j2h3m1h2j3';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('numlin');
  });
});

describe('Puzz.link Simple Loop import', () => {
  it('should parse simpleloop URL', () => {
    const testUrl = 'https://puzz.link/p?simpleloop/5/5/sg020';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('simpleloop');
  });
});
