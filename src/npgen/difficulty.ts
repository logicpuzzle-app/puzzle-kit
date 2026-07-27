export type DifficultyRank =
  | 'intro'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert'
  | 'fiendish';

type DifficultyRankKey = `npgen.rank.${DifficultyRank}`;
type TranslateDifficultyRank = (key: DifficultyRankKey) => string;

export function difficultyRank(points: number): DifficultyRank {
  if (points < 1_500) return 'intro';
  if (points < 4_000) return 'easy';
  if (points < 10_000) return 'medium';
  if (points < 100_000) return 'hard';
  if (points < 1_000_000) return 'expert';
  return 'fiendish';
}

export function formatDifficulty(
  points: number,
  t: TranslateDifficultyRank,
): string {
  const roundedPoints = Math.round(points);
  const rank = difficultyRank(points);
  return `${t(`npgen.rank.${rank}`)}(${roundedPoints})`;
}
