import type { PuzzleState, PuzzleElements } from '../types';
import { getPenpaColor } from '../types/penpaElements';

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
export function createTextColorResolver(puzzle: PuzzleState, showProblem: boolean, showAnswer: boolean, options: { backgroundColor?: string; trialStack?: PuzzleElements[]; trialStage?: number } = {}) {
  const backgrounds = new Map<string, number[]>();
  const ambiguous = new Set<string>();
  const base = rgba(options.backgroundColor ?? '#ffffff') ?? [255, 255, 255, 1];
  const baseRGB = base.slice(0, 3).map(v => v * base[3] + 255 * (1 - base[3]));
  const composite = (id: string, color: string, opacity: number) => {
    const foreground = rgba(color);
    if (!foreground) return;
    const alpha = foreground[3] * opacity;
    const background = backgrounds.get(id) ?? baseRGB;
    backgrounds.set(id, background.map((v, i) => foreground[i] * alpha + v * (1 - alpha)));
  };
  const applySurfaces = (elements: PuzzleElements, opacity: number) => {
    for (const surface of Object.values(elements.surfaces)) {
      if (surface.displayMode !== 'dot') composite(surface.cellId, surface.color, opacity);
    }
  };
  const answerOpacity = options.trialStage ? 0.5 : 1;
  if (showProblem) applySurfaces(puzzle.problem, 1);
  if (showAnswer) {
    if (options.trialStage) options.trialStack?.forEach((elements, i) => applySurfaces(elements, i === 0 ? 1 : 0.75));
    applySurfaces(puzzle.answer, answerOpacity);
  }
  // Uniform multicolor cells cover ordinary surfaces in the same order as the SVG.
  // Mixed cells have no single background color; preserve their explicit text color.
  for (const layer of ['problem', 'answer'] as const) {
    if (!(layer === 'problem' ? showProblem : showAnswer)) continue;
    for (const surface of Object.values(puzzle.multicolorSurfaces ?? {})) {
      if (surface.layer !== layer || !surface.colors.length) continue;
      if (new Set(surface.colors).size !== 1) { ambiguous.add(surface.cellId); continue; }
      const index = surface.colors[0];
      if (!index) continue;
      const color = index >= 9 ? surface.customColors?.[index - 9] ?? getPenpaColor(index) : getPenpaColor(index);
      composite(surface.cellId, color, layer === 'answer' ? answerOpacity : 1);
      ambiguous.delete(surface.cellId);
    }
  }
  return (cellId: string, savedColor: string): string => {
    if (ambiguous.has(cellId)) return savedColor;
    const color = rgba(savedColor);
    if (!color || color[3] !== 1 || !([0, 255].includes(color[0]) && color[0] === color[1] && color[1] === color[2])) return savedColor;
    const channels = (backgrounds.get(cellId) ?? baseRGB).map(v => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    return 1.05 / (luminance + 0.05) > (luminance + 0.05) / 0.05 ? '#ffffff' : '#000000';
  };
}
