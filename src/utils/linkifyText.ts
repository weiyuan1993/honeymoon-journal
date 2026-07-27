export type LinkedTextPart =
  | { kind: 'text'; value: string }
  | { kind: 'link'; value: string };

const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"'\]]+/g;

export function tokenizeLinkedText(text: string): LinkedTextPart[] {
  const parts: LinkedTextPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(HTTP_URL_PATTERN)) {
    const index = match.index;
    if (index > cursor) {
      parts.push({ kind: 'text', value: text.slice(cursor, index) });
    }
    parts.push({ kind: 'link', value: match[0] });
    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    parts.push({ kind: 'text', value: text.slice(cursor) });
  }

  return parts;
}
