/** Only the first colon separates the symbol kind from its literal content. */
export function getTextSymbolValue(type: string): string {
  const separator = type.indexOf(':');
  return type.startsWith('text-') && separator >= 0 ? type.slice(separator + 1) : '';
}
