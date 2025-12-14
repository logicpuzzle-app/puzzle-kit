import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { COMPRESS_SUBSTITUTIONS } from '../utils/penpaSerializer';

function decodeJsStringLiteral(inner: string): string {
  return JSON.parse(`"${inner}"`) as string;
}

function extractPenpaEditCompressSubPairs(source: string): [string, string][] {
  const start = source.indexOf('COMPRESS_SUB = [');
  if (start === -1) throw new Error('COMPRESS_SUB block not found');
  const end = source.indexOf('];', start);
  if (end === -1) throw new Error('COMPRESS_SUB block end not found');

  const block = source.slice(start, end);
  const pairs: [string, string][] = [];
  const re =
    /\[\s*"((?:\\.|[^"\\])*)"\s*,\s*"((?:\\.|[^"\\])*)"\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    pairs.push([decodeJsStringLiteral(m[1]), decodeJsStringLiteral(m[2])]);
  }
  if (pairs.length === 0) throw new Error('No COMPRESS_SUB pairs extracted');
  return pairs;
}

describe('penpa-edit parity', () => {
  it('keeps COMPRESS_SUB table identical to penpa-edit', () => {
    const classP = resolve(process.cwd(), '..', 'penpa-edit', 'docs', 'js', 'class_p.js');
    const src = readFileSync(classP, 'utf8');
    const penpaEditPairs = extractPenpaEditCompressSubPairs(src);

    expect(COMPRESS_SUBSTITUTIONS).toEqual(penpaEditPairs);
  });
});
