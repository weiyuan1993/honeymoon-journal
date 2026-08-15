import { safeUrl } from '../shared/safeUrl';

export interface TextFormatRun {
  startIndex?: number;
  format?: {
    link?: {
      uri?: string;
    };
  };
}

export interface GridCell {
  formattedValue?: string;
  effectiveValue?: {
    stringValue?: string;
    numberValue?: number;
    boolValue?: boolean;
  };
  hyperlink?: string;
  textFormatRuns?: TextFormatRun[];
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

export { safeUrl };

function linked(text: string, url: string | null): string {
  if (!url) return escapeHtml(text);
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color: #c5a059; text-decoration: underline; font-weight: bold;">${escapeHtml(text)}</a>`;
}

export function gridCellToHtml(cell: GridCell | undefined): string {
  if (!cell) return '';
  const text = cell.formattedValue ?? cell.effectiveValue?.stringValue ?? '';
  if (!text) return '';

  const runs = [...(cell.textFormatRuns ?? [])]
    .filter((run) => Number.isInteger(run.startIndex) && (run.startIndex ?? -1) >= 0)
    .sort((left, right) => (left.startIndex ?? 0) - (right.startIndex ?? 0));

  if (runs.length === 0) return linked(text, safeUrl(cell.hyperlink));

  const boundaries = runs.map((run) => run.startIndex ?? 0);
  if (boundaries[0] !== 0) boundaries.unshift(0);

  let html = '';
  for (let index = 0; index < boundaries.length; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1] ?? text.length;
    const run = runs.find((candidate) => candidate.startIndex === start);
    const url = safeUrl(run?.format?.link?.uri ?? cell.hyperlink);
    html += linked(text.slice(start, end), url);
  }
  return html;
}

export function cellDisplayValue(cell: GridCell | undefined): string {
  if (!cell) return '';
  if (cell.formattedValue !== undefined) return cell.formattedValue;
  if (cell.effectiveValue?.stringValue !== undefined) return cell.effectiveValue.stringValue;
  if (cell.effectiveValue?.numberValue !== undefined) return String(cell.effectiveValue.numberValue);
  if (cell.effectiveValue?.boolValue !== undefined) return String(cell.effectiveValue.boolValue);
  return '';
}
