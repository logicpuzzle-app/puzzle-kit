/**
 * Penpa Elements Tests
 *
 * Tests for Penpa-compatible element type definitions
 */

import { describe, it, expect } from 'vitest';
import {
  PenpaLineStyle,
  getLineStyleProps,
  parseEdgeKey,
  createEdgeKey,
  parseWallKey,
  createWallKey,
  getPenpaColor,
  parseLineE,
  parseWalls,
  parseThermos,
  parseArrows,
  PENPA_COLORS,
  PENPA_SYMBOLS,
  PenpaNumberSize,
  PenpaNumberPosition,
} from '../types/penpaElements';

describe('Penpa Elements', () => {
  describe('PenpaLineStyle', () => {
    it('has correct enum values', () => {
      expect(PenpaLineStyle.NORMAL).toBe(1);
      expect(PenpaLineStyle.DOTTED).toBe(2);
      expect(PenpaLineStyle.DASHED).toBe(3);
      expect(PenpaLineStyle.BOLD).toBe(4);
      expect(PenpaLineStyle.VERY_BOLD).toBe(5);
      expect(PenpaLineStyle.X_MARK).toBe(6);
      expect(PenpaLineStyle.DOUBLE).toBe(7);
      expect(PenpaLineStyle.DELETE).toBe(8);
    });
  });

  describe('getLineStyleProps', () => {
    it('returns correct props for normal style', () => {
      const props = getLineStyleProps(PenpaLineStyle.NORMAL);
      expect(props.strokeWidth).toBe(2);
      expect(props.strokeDasharray).toBeUndefined();
    });

    it('returns correct props for dotted style', () => {
      const props = getLineStyleProps(PenpaLineStyle.DOTTED);
      expect(props.strokeWidth).toBe(2);
      expect(props.strokeDasharray).toBe('2,2');
    });

    it('returns correct props for dashed style', () => {
      const props = getLineStyleProps(PenpaLineStyle.DASHED);
      expect(props.strokeWidth).toBe(2);
      expect(props.strokeDasharray).toBe('6,3');
    });

    it('returns correct props for bold style', () => {
      const props = getLineStyleProps(PenpaLineStyle.BOLD);
      expect(props.strokeWidth).toBe(4);
    });

    it('returns correct props for very bold style', () => {
      const props = getLineStyleProps(PenpaLineStyle.VERY_BOLD);
      expect(props.strokeWidth).toBe(6);
    });

    it('returns transparent stroke for delete style', () => {
      const props = getLineStyleProps(PenpaLineStyle.DELETE);
      expect(props.stroke).toBe('transparent');
    });
  });

  describe('parseEdgeKey', () => {
    it('parses valid edge key', () => {
      const result = parseEdgeKey('10,20');
      expect(result).toEqual({ from: 10, to: 20 });
    });

    it('parses edge key with large numbers', () => {
      const result = parseEdgeKey('1000,2000');
      expect(result).toEqual({ from: 1000, to: 2000 });
    });

    it('returns null for invalid key', () => {
      expect(parseEdgeKey('invalid')).toBeNull();
      expect(parseEdgeKey('10')).toBeNull();
      expect(parseEdgeKey('a,b')).toBeNull();
      expect(parseEdgeKey('')).toBeNull();
    });
  });

  describe('createEdgeKey', () => {
    it('creates consistent key regardless of order', () => {
      const key1 = createEdgeKey(10, 20);
      const key2 = createEdgeKey(20, 10);
      expect(key1).toBe(key2);
      expect(key1).toBe('10,20');
    });

    it('handles equal indices', () => {
      const key = createEdgeKey(10, 10);
      expect(key).toBe('10,10');
    });
  });

  describe('parseWallKey', () => {
    it('parses valid wall key', () => {
      const result = parseWallKey('5,6');
      expect(result).toEqual({ cell1: 5, cell2: 6 });
    });

    it('returns null for invalid key', () => {
      expect(parseWallKey('invalid')).toBeNull();
      expect(parseWallKey('5')).toBeNull();
    });
  });

  describe('createWallKey', () => {
    it('creates consistent key', () => {
      const key1 = createWallKey(5, 6);
      const key2 = createWallKey(6, 5);
      expect(key1).toBe(key2);
      expect(key1).toBe('5,6');
    });
  });

  describe('getPenpaColor', () => {
    it('returns correct color for index', () => {
      expect(getPenpaColor(0)).toBe('transparent');
      expect(getPenpaColor(1)).toBe('#cfcfcf');
      expect(getPenpaColor(3)).toBe('#000000');
      expect(getPenpaColor(4)).toBe('#ff0000');
      expect(getPenpaColor(5)).toBe('#0000ff');
    });

    it('returns default black for unknown index', () => {
      expect(getPenpaColor(999)).toBe('#000000');
    });

    it('passes through string colors', () => {
      expect(getPenpaColor('#ff00ff')).toBe('#ff00ff');
      expect(getPenpaColor('red')).toBe('red');
    });
  });

  describe('PENPA_COLORS', () => {
    it('has all required colors', () => {
      expect(Object.keys(PENPA_COLORS).length).toBeGreaterThanOrEqual(13);
      expect(PENPA_COLORS[0]).toBe('transparent');
      expect(PENPA_COLORS[3]).toBe('#000000');
      expect(PENPA_COLORS[12]).toBe('#ffffff');
    });
  });

  describe('PENPA_SYMBOLS', () => {
    it('has basic shapes', () => {
      expect(PENPA_SYMBOLS.circle_L).toBeDefined();
      expect(PENPA_SYMBOLS.circle_L.category).toBe('shape');
      expect(PENPA_SYMBOLS.square_L).toBeDefined();
      expect(PENPA_SYMBOLS.diamond_L).toBeDefined();
      expect(PENPA_SYMBOLS.triangle_L).toBeDefined();
    });

    it('has battleship symbols', () => {
      expect(PENPA_SYMBOLS.ship_top).toBeDefined();
      expect(PENPA_SYMBOLS.ship_top.category).toBe('battleship');
      expect(PENPA_SYMBOLS.water).toBeDefined();
    });

    it('has arrow symbols', () => {
      expect(PENPA_SYMBOLS.arrow_N).toBeDefined();
      expect(PENPA_SYMBOLS.arrow_N.category).toBe('arrow');
      expect(PENPA_SYMBOLS.arrow_E).toBeDefined();
      expect(PENPA_SYMBOLS.arrow_S).toBeDefined();
      expect(PENPA_SYMBOLS.arrow_W).toBeDefined();
    });

    it('has dice symbols', () => {
      expect(PENPA_SYMBOLS.dice_1).toBeDefined();
      expect(PENPA_SYMBOLS.dice_6).toBeDefined();
    });

    it('has special symbols', () => {
      expect(PENPA_SYMBOLS.star).toBeDefined();
      expect(PENPA_SYMBOLS.heart).toBeDefined();
      expect(PENPA_SYMBOLS.mine).toBeDefined();
      expect(PENPA_SYMBOLS.tent).toBeDefined();
    });
  });

  describe('PenpaNumberSize', () => {
    it('has correct enum values', () => {
      expect(PenpaNumberSize.LARGE).toBe(1);
      expect(PenpaNumberSize.MEDIUM).toBe(2);
      expect(PenpaNumberSize.SMALL).toBe(3);
      expect(PenpaNumberSize.EXTRA_SMALL).toBe(4);
    });
  });

  describe('PenpaNumberPosition', () => {
    it('has all position values', () => {
      expect(PenpaNumberPosition.CENTER).toBe('center');
      expect(PenpaNumberPosition.CORNER_TL).toBe('corner_tl');
      expect(PenpaNumberPosition.CORNER_TR).toBe('corner_tr');
      expect(PenpaNumberPosition.CORNER_BL).toBe('corner_bl');
      expect(PenpaNumberPosition.CORNER_BR).toBe('corner_br');
      expect(PenpaNumberPosition.SIDE_TOP).toBe('side_top');
      expect(PenpaNumberPosition.SIDE_RIGHT).toBe('side_right');
      expect(PenpaNumberPosition.SIDE_BOTTOM).toBe('side_bottom');
      expect(PenpaNumberPosition.SIDE_LEFT).toBe('side_left');
      expect(PenpaNumberPosition.TAPA).toBe('tapa');
    });
  });

  describe('parseLineE', () => {
    it('parses line edge data', () => {
      const lineE = {
        '10,20': 1,
        '20,30': 2,
        '30,40': 3,
      };

      const edges = parseLineE(lineE, 'problem');

      expect(edges.length).toBe(3);
      expect(edges[0]).toEqual({
        from: 10,
        to: 20,
        style: 1,
        layer: 'problem',
      });
      expect(edges[1]).toEqual({
        from: 20,
        to: 30,
        style: 2,
        layer: 'problem',
      });
    });

    it('handles empty input', () => {
      const edges = parseLineE({}, 'answer');
      expect(edges.length).toBe(0);
    });

    it('skips invalid keys', () => {
      const lineE = {
        '10,20': 1,
        'invalid': 2,
        '30': 3,
      };

      const edges = parseLineE(lineE, 'problem');
      expect(edges.length).toBe(1);
    });
  });

  describe('parseWalls', () => {
    it('parses wall data', () => {
      const walls = {
        '5,6': 1,
        '10,11': 4,
      };

      const result = parseWalls(walls, 'problem');

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        cell1: 5,
        cell2: 6,
        style: 1,
        layer: 'problem',
      });
    });

    it('handles empty input', () => {
      const result = parseWalls({}, 'answer');
      expect(result.length).toBe(0);
    });
  });

  describe('parseThermos', () => {
    it('parses thermo data', () => {
      const thermos = [
        [10, 11, 12],
        [20, 21, 22, 23],
      ];

      const result = parseThermos(thermos, 'problem');

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        cells: [10, 11, 12],
        hasBulb: true,
        layer: 'problem',
      });
      expect(result[1].cells.length).toBe(4);
    });

    it('can create no-bulb thermos', () => {
      const result = parseThermos([[10, 11]], 'problem', false);
      expect(result[0].hasBulb).toBe(false);
    });
  });

  describe('parseArrows', () => {
    it('parses arrow data', () => {
      const arrows = [
        [10, 11, 12],
        [20, 21],
      ];

      const result = parseArrows(arrows, 'answer');

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        cells: [10, 11, 12],
        layer: 'answer',
      });
    });
  });
});
