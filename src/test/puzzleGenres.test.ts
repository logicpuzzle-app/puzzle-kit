import { describe, it, expect } from 'vitest';
import {
  getGenresByTag,
  getGenresWithTags,
  getGenreInfo,
  type PuzzleGenre,
} from '../types/puzzleGenres';

describe('genre queries', () => {
  it('returns matching genres and excludes unrelated genres for one tag', () => {
    const genres = getGenresByTag('latin-square');
    expect(genres).toEqual(expect.arrayContaining(['sudoku', 'futoshiki']));
    expect(genres).not.toContain('nurikabe');
  });

  it('requires every requested tag and returns no matches for incompatible tags', () => {
    const genres = getGenresWithTags(['single-loop', 'has-numbers']);
    expect(genres).toEqual(expect.arrayContaining(['slitherlink', 'yajilin']));
    expect(genres).not.toContain('masyu'); // Loop without numbers.
    expect(genres).not.toContain('sudoku'); // Numbers without a loop.
    expect(getGenresWithTags(['latin-square', 'single-loop'])).toEqual([]);
  });

  it('looks up a known genre and falls back for an unrecognized ID', () => {
    expect(getGenreInfo('masyu').id).toBe('masyu');
    expect(getGenreInfo('invalid-genre' as PuzzleGenre).id).toBe('unknown');
  });
});
