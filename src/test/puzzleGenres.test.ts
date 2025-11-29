/**
 * Puzzle Genres Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PUZZLE_GENRES,
  PUZZLE_TAGS,
  GENRE_INFO,
  getGenresByTag,
  getGenresWithTags,
  getGenreInfo,
  type PuzzleGenre,
  type PuzzleTag,
} from '../types/puzzleGenres';

describe('Puzzle Genres', () => {
  describe('PUZZLE_GENRES', () => {
    it('contains common puzzle types', () => {
      expect(PUZZLE_GENRES.SUDOKU).toBe('sudoku');
      expect(PUZZLE_GENRES.SLITHERLINK).toBe('slitherlink');
      expect(PUZZLE_GENRES.NURIKABE).toBe('nurikabe');
      expect(PUZZLE_GENRES.MASYU).toBe('masyu');
    });

    it('has unique values', () => {
      const values = Object.values(PUZZLE_GENRES);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });
  });

  describe('PUZZLE_TAGS', () => {
    it('contains difficulty tags', () => {
      expect(PUZZLE_TAGS.EASY).toBe('easy');
      expect(PUZZLE_TAGS.MEDIUM).toBe('medium');
      expect(PUZZLE_TAGS.HARD).toBe('hard');
      expect(PUZZLE_TAGS.EXPERT).toBe('expert');
    });

    it('contains element type tags', () => {
      expect(PUZZLE_TAGS.HAS_NUMBERS).toBe('has-numbers');
      expect(PUZZLE_TAGS.HAS_SHADING).toBe('has-shading');
      expect(PUZZLE_TAGS.HAS_LINES).toBe('has-lines');
      expect(PUZZLE_TAGS.HAS_REGIONS).toBe('has-regions');
    });

    it('contains constraint tags', () => {
      expect(PUZZLE_TAGS.LATIN_SQUARE).toBe('latin-square');
      expect(PUZZLE_TAGS.NO_2X2).toBe('no-2x2');
      expect(PUZZLE_TAGS.CONNECTED).toBe('connected');
      expect(PUZZLE_TAGS.SINGLE_LOOP).toBe('single-loop');
    });
  });

  describe('GENRE_INFO', () => {
    it('has info for all genres', () => {
      const genres = Object.values(PUZZLE_GENRES);
      const infoKeys = Object.keys(GENRE_INFO);

      // All genres should have info
      for (const genre of genres) {
        expect(GENRE_INFO[genre as PuzzleGenre]).toBeDefined();
      }
    });

    it('has complete info for sudoku', () => {
      const info = GENRE_INFO[PUZZLE_GENRES.SUDOKU];

      expect(info.id).toBe('sudoku');
      expect(info.name).toBe('Sudoku');
      expect(info.nameJa).toBe('数独');
      expect(info.description).toBeTruthy();
      expect(info.descriptionJa).toBeTruthy();
      expect(info.tags).toContain(PUZZLE_TAGS.LATIN_SQUARE);
      expect(info.tags).toContain(PUZZLE_TAGS.HAS_NUMBERS);
    });

    it('has complete info for slitherlink', () => {
      const info = GENRE_INFO[PUZZLE_GENRES.SLITHERLINK];

      expect(info.id).toBe('slitherlink');
      expect(info.name).toBe('Slitherlink');
      expect(info.nameJa).toBe('スリザーリンク');
      expect(info.tags).toContain(PUZZLE_TAGS.HAS_LINES);
      expect(info.tags).toContain(PUZZLE_TAGS.SINGLE_LOOP);
    });

    it('has complete info for nurikabe', () => {
      const info = GENRE_INFO[PUZZLE_GENRES.NURIKABE];

      expect(info.id).toBe('nurikabe');
      expect(info.tags).toContain(PUZZLE_TAGS.HAS_SHADING);
      expect(info.tags).toContain(PUZZLE_TAGS.NO_2X2);
      expect(info.tags).toContain(PUZZLE_TAGS.CONNECTED);
    });
  });

  describe('getGenresByTag', () => {
    it('finds nikoli puzzles', () => {
      const nikoliPuzzles = getGenresByTag(PUZZLE_TAGS.NIKOLI);

      expect(nikoliPuzzles).toContain(PUZZLE_GENRES.SUDOKU);
      expect(nikoliPuzzles).toContain(PUZZLE_GENRES.SLITHERLINK);
      expect(nikoliPuzzles).toContain(PUZZLE_GENRES.NURIKABE);
      expect(nikoliPuzzles).toContain(PUZZLE_GENRES.MASYU);
    });

    it('finds latin square puzzles', () => {
      const latinSquarePuzzles = getGenresByTag(PUZZLE_TAGS.LATIN_SQUARE);

      expect(latinSquarePuzzles).toContain(PUZZLE_GENRES.SUDOKU);
      expect(latinSquarePuzzles).toContain(PUZZLE_GENRES.FUTOSHIKI);
      expect(latinSquarePuzzles).not.toContain(PUZZLE_GENRES.NURIKABE);
    });

    it('finds single loop puzzles', () => {
      const loopPuzzles = getGenresByTag(PUZZLE_TAGS.SINGLE_LOOP);

      expect(loopPuzzles).toContain(PUZZLE_GENRES.SLITHERLINK);
      expect(loopPuzzles).toContain(PUZZLE_GENRES.MASYU);
      expect(loopPuzzles).toContain(PUZZLE_GENRES.YAJILIN);
    });

    it('finds shading puzzles', () => {
      const shadingPuzzles = getGenresByTag(PUZZLE_TAGS.HAS_SHADING);

      expect(shadingPuzzles).toContain(PUZZLE_GENRES.NURIKABE);
      expect(shadingPuzzles).toContain(PUZZLE_GENRES.TAPA);
      expect(shadingPuzzles).toContain(PUZZLE_GENRES.HEYAWAKE);
    });
  });

  describe('getGenresWithTags', () => {
    it('finds puzzles with multiple tags (AND)', () => {
      const puzzles = getGenresWithTags([
        PUZZLE_TAGS.HAS_SHADING,
        PUZZLE_TAGS.NO_2X2,
        PUZZLE_TAGS.CONNECTED,
      ]);

      expect(puzzles).toContain(PUZZLE_GENRES.NURIKABE);
      expect(puzzles).toContain(PUZZLE_GENRES.TAPA);
      expect(puzzles).toContain(PUZZLE_GENRES.LITS);
    });

    it('finds loop puzzles with numbers', () => {
      const puzzles = getGenresWithTags([
        PUZZLE_TAGS.SINGLE_LOOP,
        PUZZLE_TAGS.HAS_NUMBERS,
      ]);

      expect(puzzles).toContain(PUZZLE_GENRES.SLITHERLINK);
      expect(puzzles).toContain(PUZZLE_GENRES.YAJILIN);
    });

    it('returns empty for impossible tag combinations', () => {
      // Latin square puzzles don't typically have shading
      const puzzles = getGenresWithTags([
        PUZZLE_TAGS.LATIN_SQUARE,
        PUZZLE_TAGS.SINGLE_LOOP,
      ]);

      expect(puzzles).toHaveLength(0);
    });
  });

  describe('getGenreInfo', () => {
    it('returns correct info for valid genre', () => {
      const info = getGenreInfo(PUZZLE_GENRES.MASYU);

      expect(info.id).toBe('masyu');
      expect(info.name).toBe('Masyu');
      expect(info.nameJa).toBe('ましゅ');
    });

    it('returns unknown for invalid genre', () => {
      const info = getGenreInfo('invalid-genre' as PuzzleGenre);

      expect(info.id).toBe('unknown');
    });
  });
});
