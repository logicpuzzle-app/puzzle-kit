import { describe, it, expect } from 'vitest';
import { parsePuzzlinkUrl } from '../utils/penpaCompat';
import { constraintCatalog } from '../constraints/ConstraintCatalog';
import { isDirectionalNumber } from '../utils/numberEntries';

// Schema ID mapping (same as in MenuBar.tsx)
const puzzleTypeToSchemaId: Record<string, string> = {
  'yajilin': 'yajilin',
  'lixloop': 'yajilin',
  'slitherlink': 'slither',
  'slither': 'slither',
  'mashu': 'mashu',
  'nurikabe': 'nurikabe',
  'heyawake': 'heyawake',
  'ayeheya': 'ayeheya',
  'akichi': 'akichi',
  'numlin': 'numlin',
  'simpleloop': 'simpleloop',
  'lits': 'lits',
  'norinori': 'norinori',
  'cbanana': 'cbanana',
  'nurimisaki': 'nurimisaki',
  'simplegako': 'simplegako',
  'nanro': 'nanro',
};

describe('Puzz.link Slitherlink import', () => {
  it('should parse slither URL and get correct schema', () => {
    const testUrl = 'https://puzz.link/p?slither/10/10/dgj2l2i3i11c0c22c2ci1g3h2h1g0ci2c23c1c02ci1i3i2l2jgd';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('slither');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('slither');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('slither');
  });

  it('should parse slitherlink URL (alternate name) and get correct schema', () => {
    // Some puzz.link URLs use 'slitherlink' instead of 'slither'
    const testUrl = 'https://puzz.link/p?slitherlink/5/5/cbcbcddad';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('slitherlink');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('slither');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('slither');
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
  it('should parse simplegako URL and map to schema', () => {
    const testUrl = 'https://puzz.link/p?simplegako/2/2/1234';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('simplegako');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('simplegako');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('simplegako');
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
  it('should parse nanro URL and map to schema', () => {
    const testUrl = 'https://puzz.link/p?nanro/2/2/001234';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('nanro');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('nanro');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('nanro');
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
  it('should parse lits URL and map to schema', () => {
    const testUrl = 'https://puzz.link/p?lits/10/10/gdifrsp0ia3c6kt9268q384lesv2bud20tgo';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('lits');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('lits');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('lits');
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
  it('should parse norinori URL and map to schema', () => {
    const testUrl = 'https://puzz.link/p?norinori/5/5/9a9a9a9a9a';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('norinori');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('norinori');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('norinori');
  });
});

describe('Puzz.link Choco Banana import', () => {
  it('should parse cbanana URL and map to schema', () => {
    const testUrl = 'https://puzz.link/p?cbanana/2/2/1234';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('cbanana');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('cbanana');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('cbanana');
  });
});

describe('Puzz.link Nurimisaki import', () => {
  it('should parse nurimisaki URL and map to schema', () => {
    const testUrl = 'https://puzz.link/p?nurimisaki/2/2/1234';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('nurimisaki');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('nurimisaki');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('nurimisaki');
  });
});

describe('Puzz.link Ayeheya import', () => {
  it('should parse ayeheya URL and map to schema', () => {
    const testUrl = 'https://puzz.link/p?ayeheya/6/6/99aa8c0vu0ufk2k';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('ayeheya');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('ayeheya');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('ayeheya');
  });
});

describe('Puzz.link Akichi import', () => {
  it('should parse akichi URL and map to schema', () => {
    const testUrl = 'https://puzz.link/p?akichi/6/6/lll199007rs11434g1g0';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('akichi');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('akichi');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('akichi');
  });
});

describe('Puzz.link Numberlink import', () => {
  it('should parse numlin URL and map to schema', () => {
    const testUrl = 'https://puzz.link/p?numlin/5/5/1j2h3m1h2j3';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('numlin');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('numlin');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('numlin');
  });
});

describe('Puzz.link Simple Loop import', () => {
  it('should parse simpleloop URL and map to schema', () => {
    const testUrl = 'https://puzz.link/p?simpleloop/5/5/sg020';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.puzzleType).toBe('simpleloop');

    const schemaId = puzzleTypeToSchemaId[result?.puzzleType || ''];
    expect(schemaId).toBe('simpleloop');

    const schema = constraintCatalog.getSchema(schemaId);
    expect(schema).toBeDefined();
    expect(schema?.pid).toBe('simpleloop');
  });
});
