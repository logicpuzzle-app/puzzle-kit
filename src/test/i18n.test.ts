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

  it('keeps the English and Japanese key sets in sync', () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
  });

  it('defines every constraint schema translation in both languages', () => {
    const keys = new Set(schemas.flatMap(getConstraintTranslationKeys));

    for (const key of keys) {
      expect(
        Object.prototype.hasOwnProperty.call(en, key),
        `missing English translation: ${key}`
      ).toBe(true);
      expect(
        Object.prototype.hasOwnProperty.call(ja, key),
        `missing Japanese translation: ${key}`
      ).toBe(true);
      expect(en[key as keyof typeof en], `empty English translation: ${key}`).not.toBe('');
      expect(ja[key as keyof typeof ja], `empty Japanese translation: ${key}`).not.toBe('');
    }
  });

  it('defines every NPGenerator label in both languages', () => {
    const npgenKeys = Object.keys(en).filter((key) => key.startsWith('npgen.'));

    expect(npgenKeys.length).toBeGreaterThan(0);
    for (const key of npgenKeys) {
      expect(en[key as keyof typeof en]).not.toBe('');
      expect(ja[key as keyof typeof ja]).not.toBe('');
    }
  });
});
