import type { PuzzleState } from '../types';

function rgba(color: string): number[] | null {
  let value = color.trim().toLowerCase();
  if (value === 'black') value = '#000000';
  if (value === 'white') value = '#ffffff';
  if (value === 'transparent') return [0, 0, 0, 0];
  if (/^#[\da-f]{3,4}$/.test(value)) value = '#' + [...value.slice(1)].map(c => c + c).join('');
  if (/^#[\da-f]{6}([\da-f]{2})?$/.test(value)) return [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16), value.length === 9 ? parseInt(value.slice(7, 9), 16) / 255 : 1];
  const match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])] : null;
}

/** Black/white text follows visible cell shading. Explicit chromatic colors remain literal. */
export function createTextColorResolver(puzzle: PuzzleState, showProblem: boolean, showAnswer: boolean) {
  const backgrounds = new Map<string, number[]>();
  for (const layer of ['problem', 'answer'] as const) {
    if (!(layer === 'problem' ? showProblem : showAnswer)) continue;
    for (const surface of Object.values(puzzle[layer].surfaces)) {
      if (surface.displayMode === 'dot') continue;
      const foreground = rgba(surface.color);
      if (!foreground) continue;
      const background = backgrounds.get(surface.cellId) ?? [255, 255, 255];
      backgrounds.set(surface.cellId, background.map((v, i) => foreground[i] * foreground[3] + v * (1 - foreground[3])));
    }
  }
  return (cellId: string, savedColor: string): string => {
    const color = rgba(savedColor);
    if (!color || color[3] !== 1 || !([0, 255].includes(color[0]) && color[0] === color[1] && color[1] === color[2])) return savedColor;
    const channels = (backgrounds.get(cellId) ?? [255, 255, 255]).map(v => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    return 1.05 / (luminance + 0.05) > (luminance + 0.05) / 0.05 ? '#ffffff' : '#000000';
  };
}
