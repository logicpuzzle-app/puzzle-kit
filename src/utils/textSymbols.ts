/** Only the first colon separates the symbol kind from its literal content. */
export function getTextSymbolValue(type: string): string {
  const separator = type.indexOf(':');
  return type.startsWith('text-') && separator >= 0 ? type.slice(separator + 1) : '';
}

/** Wrap by grapheme so combining marks and emoji sequences remain intact. */
export function layoutCellText(text: string, size: number) {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const lines: string[] = [];
  const widths: number[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '', width = 0;
    for (const { segment } of segmenter.segment(paragraph)) {
      const units = /^[\x20-\x7e]$/.test(segment) ? 0.7 : 1;
      if (width + units > 4.2 && line) { lines.push(line); widths.push(width); line = ''; width = 0; }
      line += segment; width += units;
    }
    lines.push(line); widths.push(width);
  }
  const fontSize = Math.min(size * 0.7, size * 0.9 / Math.max(1, ...widths), size * 0.9 / (lines.length * 1.2));
  return { lines, fontSize, lineHeight: fontSize * 1.2 };
}
