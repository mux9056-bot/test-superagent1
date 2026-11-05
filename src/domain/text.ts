const graphemeSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('zh-Hans', { granularity: 'grapheme' })
    : null;

/**
 * Count user-visible characters (grapheme clusters) so emoji and combined
 * characters count as one character, as the product rules require.
 */
export function countVisibleChars(text: string): number {
  if (graphemeSegmenter) {
    let count = 0;
    for (const _ of graphemeSegmenter.segment(text)) count += 1;
    return count;
  }
  return Array.from(text).length;
}

/** Collapse line breaks in a title; titles are single-line by design. */
export function normalizeTitle(value: string): string {
  return value.replace(/[\r\n]+/g, ' ');
}

export function normalizeName(value: string): string {
  return value.trim();
}

/** Case-insensitive comparison used for list names (English case only). */
export function nameKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Case-insensitive, trimmed substring match used by search. */
export function matchesKeyword(haystack: string, keyword: string): boolean {
  return haystack.toLowerCase().includes(keyword.toLowerCase());
}
