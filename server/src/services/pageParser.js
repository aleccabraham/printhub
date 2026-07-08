const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const AdmZip = require('adm-zip');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

async function countPdfPages(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.numpages || 1;
}

// DOCX is a zip archive; docProps/app.xml holds a <Pages> element Word writes on save.
// This is best-effort: if the file was never opened/saved in Word (e.g. exported straight
// from Google Docs), the field may be missing or 0, so we fall back to a word-count estimate.
function countDocxPages(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const appXmlEntry = zip.getEntry('docProps/app.xml');
    if (appXmlEntry) {
      const xml = appXmlEntry.getData().toString('utf8');
      const match = xml.match(/<Pages>(\d+)<\/Pages>/);
      if (match) {
        const pages = parseInt(match[1], 10);
        if (pages > 0) return pages;
      }
    }
  } catch (err) {
    console.warn('[pageParser] Failed to read docx app.xml, falling back to estimate:', err.message);
  }

  // Fallback: estimate from word count in document.xml (~500 words/page).
  try {
    const zip = new AdmZip(filePath);
    const docEntry = zip.getEntry('word/document.xml');
    if (docEntry) {
      const xml = docEntry.getData().toString('utf8');
      const text = xml.replace(/<[^>]+>/g, ' ');
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      return Math.max(1, Math.ceil(wordCount / 500));
    }
  } catch (err) {
    console.warn('[pageParser] DOCX word-count fallback failed:', err.message);
  }

  return 1;
}

// Legacy .doc (binary format) has no reliable free parser. Known limitation:
// we fall back to a fixed estimate of 1 page.
function countDocPages() {
  return 1;
}

async function countPages(filePath, originalFileName) {
  const ext = path.extname(originalFileName).toLowerCase();

  if (ext === '.pdf') return countPdfPages(filePath);
  if (ext === '.docx') return countDocxPages(filePath);
  if (ext === '.doc') return countDocPages();
  if (IMAGE_EXTENSIONS.has(ext)) return 1;

  throw new Error(`Unsupported file extension for page counting: ${ext}`);
}

// Parses page range strings like "1, 5, 6, 7" / "1-10" / "1-5, 8, 10-12".
// Returns { pageNumbers: number[] (deduped, sorted), invalidPages: number[] }.
function parsePageRangeString(rangeString) {
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

// Resolves the final page selection for a job.
// rangeType: 'all' | 'custom'
function resolvePageSelection({ rangeType, rangeString, totalPages }) {
  if (rangeType === 'all') {
    return { pagesToPrint: totalPages, resolvedPageNumbers: null, error: null };
  }

  if (rangeType !== 'custom') {
    return { pagesToPrint: null, resolvedPageNumbers: null, error: 'Invalid page_range_type' };
  }

  if (!rangeString || !rangeString.trim()) {
    return { pagesToPrint: null, resolvedPageNumbers: null, error: 'Custom page range is empty' };
  }

  const { pageNumbers, invalidTokens } = parsePageRangeString(rangeString);

  if (invalidTokens.length > 0) {
    return {
      pagesToPrint: null,
      resolvedPageNumbers: null,
      error: `Could not parse: ${invalidTokens.join(', ')}`,
    };
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

module.exports = { countPages, parsePageRangeString, resolvePageSelection };
