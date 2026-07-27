import { describe, expect, it } from 'vitest';
import {
  difficultyRank,
  formatDifficulty,
  type DifficultyRank,
} from '../npgen/difficulty';

describe('NPGenerator difficulty', () => {
  it.each([
    [1_499, 'intro'],
    [1_500, 'easy'],
    [3_999, 'easy'],
    [4_000, 'medium'],
    [9_999, 'medium'],
    [10_000, 'hard'],
    [99_999, 'hard'],
    [100_000, 'expert'],
    [999_999, 'expert'],
    [1_000_000, 'fiendish'],
  ] satisfies Array<[number, DifficultyRank]>)(
    'ranks %d points as %s',
    (points, expected) => {
      expect(difficultyRank(points)).toBe(expected);
    },
  );

  it('formats a translated rank with rounded points', () => {
    const labels: Record<`npgen.rank.${DifficultyRank}`, string> = {
      'npgen.rank.intro': '入門',
      'npgen.rank.easy': '初級',
      'npgen.rank.medium': '中級',
      'npgen.rank.hard': '上級',
      'npgen.rank.expert': '難問',
      'npgen.rank.fiendish': '超難問',
    };

    expect(formatDifficulty(23_456.6, (key) => labels[key])).toBe(
      '上級(23457)',
    );
  });
});
