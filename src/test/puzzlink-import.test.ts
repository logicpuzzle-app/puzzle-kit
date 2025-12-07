import { describe, it, expect } from 'vitest';
import { parsePuzzlinkUrl } from '../utils/penpaCompat';
import { constraintCatalog } from '../constraints/ConstraintCatalog';

// Schema ID mapping (same as in MenuBar.tsx)
const puzzleTypeToSchemaId: Record<string, string> = {
  'yajilin': 'yajilin',
  'lixloop': 'yajilin',
  'slitherlink': 'slither',
  'slither': 'slither',
  'mashu': 'mashu',
  'nurikabe': 'nurikabe',
  'heyawake': 'heyawake',
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

  it('should parse slitherlink clues into directionalClues', () => {
    const testUrl = 'https://puzz.link/p?slither/5/5/cbcbcddad';
    const result = parsePuzzlinkUrl(testUrl);

    expect(result).not.toBeNull();
    expect(result?.state?.problem?.directionalClues).toBeDefined();

    const clues = Object.values(result?.state?.problem?.directionalClues || {});
    expect(clues.length).toBeGreaterThan(0);

    // Check clue structure
    const firstClue = clues[0];
    expect(firstClue).toHaveProperty('id');
    expect(firstClue).toHaveProperty('cell');
    expect(firstClue).toHaveProperty('direction');
    expect(firstClue).toHaveProperty('value');
    expect(firstClue.direction).toBe(0); // Slitherlink has no direction
    expect(firstClue.value).toBeGreaterThanOrEqual(0);
    expect(firstClue.value).toBeLessThanOrEqual(3);
  });
});
