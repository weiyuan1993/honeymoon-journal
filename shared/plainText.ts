export function normalizeAiPlainText(value: string): string {
  return value
    .replace(/^\s*\*+\s+/gm, '• ')
    .replace(/\*+/g, '');
}
