import { describe, expect, it } from 'vitest';
import type { ConstraintSchema } from '../constraints/types';
import * as schemaExports from '../constraints/schemas';
import i18n from '../i18n';
import { en } from '../i18n/locales/en';
import { ja } from '../i18n/locales/ja';

const schemas = Object.values(schemaExports).filter(
  (value): value is ConstraintSchema =>
    typeof value === 'object' &&
    value !== null &&
    'pid' in value &&
    'nameKey' in value
);

function getConstraintTranslationKeys(schema: ConstraintSchema): string[] {
  const rules = [
    ...schema.problem,
    ...schema.answer,
    ...schema.validation,
    ...(schema.highlight ?? []),
  ];
  const keys = [schema.nameKey];

  for (const rule of rules) {
    keys.push(rule.title, rule.description);
    if ('pzpr' in rule) {
      for (const failcode of rule.pzpr?.failcodes ?? []) {
        keys.push(`validation.${rule.pzpr?.pid}.${failcode}`);
      }
    }
  }

  return keys;
}

describe('translations', () => {
  it('resolves flat dotted keys in each supported language', async () => {
    await i18n.changeLanguage('ja');
    expect(i18n.t('constraint.sudoku.boxUnique.title')).toBe('ブロック内の数字を一意にする');

    await i18n.changeLanguage('en');
    expect(i18n.t('constraint.sudoku.boxUnique.title')).toBe('Unique numbers in boxes');
  });

  it('keeps locale keys in sync and required UI translations nonempty', () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
    // Optional subtitles may intentionally be empty; schema and generator labels may not.
    const keys = new Set([
      ...Object.keys(en).filter(key => key.startsWith('npgen.')),
      ...schemas.flatMap(getConstraintTranslationKeys),
    ]);
    for (const [language, catalog] of [['en', en], ['ja', ja]] as const) {
      for (const key of keys) {
        expect(catalog[key as keyof typeof catalog], language + ': ' + key).toEqual(expect.stringMatching(/\S/));
      }
    }
  });
});
