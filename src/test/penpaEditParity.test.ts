import { describe, it, expect } from 'vitest';
import upstreamDeclaration from './fixtures/penpa-edit/compress-sub.txt?raw';

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
    const penpaEditPairs = extractPenpaEditCompressSubPairs(upstreamDeclaration);

    expect(COMPRESS_SUBSTITUTIONS).toEqual(penpaEditPairs);
  });
});
