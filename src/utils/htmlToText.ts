const GENERATED_HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

export function htmlToText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(
      /&(amp|lt|gt|quot|apos|nbsp);|&#39;/gi,
      (entity) => GENERATED_HTML_ENTITIES[entity.toLowerCase()] ?? entity
    )
    .replace(/\s+/g, ' ')
    .trim();
}
