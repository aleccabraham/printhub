// Mirrors server/src/services/pageParser.js resolvePageSelection() for live,
// no-round-trip price estimates as the student types. The server always
// re-validates authoritatively before a job is created.

export function parsePageRangeString(rangeString) {
  const pageNumbers = new Set();
  const invalidTokens = [];

  const segments = rangeString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = segment.match(/^(\d+)$/);

    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start > end) {
        invalidTokens.push(segment);
        continue;
      }
      for (let p = start; p <= end; p++) pageNumbers.add(p);
    } else if (singleMatch) {
      pageNumbers.add(parseInt(singleMatch[1], 10));
    } else {
      invalidTokens.push(segment);
    }
  }

  return { pageNumbers: [...pageNumbers].sort((a, b) => a - b), invalidTokens };
}

export function resolvePageSelection({ rangeType, rangeString, totalPages }) {
  if (rangeType === 'all') {
    return { pagesToPrint: totalPages, resolvedPageNumbers: null, error: null };
  }

  if (!rangeString || !rangeString.trim()) {
    return { pagesToPrint: null, resolvedPageNumbers: null, error: 'Enter a page range' };
  }

  const { pageNumbers, invalidTokens } = parsePageRangeString(rangeString);

  if (invalidTokens.length > 0) {
    return { pagesToPrint: null, resolvedPageNumbers: null, error: `Could not parse: ${invalidTokens.join(', ')}` };
  }
  if (pageNumbers.length === 0) {
    return { pagesToPrint: null, resolvedPageNumbers: null, error: 'No pages specified' };
  }

  const outOfRange = pageNumbers.filter((p) => p < 1 || p > totalPages);
  if (outOfRange.length > 0) {
    return {
      pagesToPrint: null,
      resolvedPageNumbers: null,
      error: `Page(s) ${outOfRange.join(', ')} do not exist in this ${totalPages}-page document`,
    };
  }

  return { pagesToPrint: pageNumbers.length, resolvedPageNumbers: pageNumbers, error: null };
}
