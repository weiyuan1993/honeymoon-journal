import { describe, expect, it } from 'vitest';
import { gridCellToHtml } from '../richText';

describe('gridCellToHtml', () => {
  it('preserves separate rich-text links and escapes unsafe text', () => {
    const html = gridCellToHtml({
      formattedValue: 'Museum <entry>\nMap',
      textFormatRuns: [
        { startIndex: 0, format: { link: { uri: 'https://example.com/ticket' } } },
        { startIndex: 6 },
        { startIndex: 15, format: { link: { uri: 'https://maps.google.com/' } } },
      ],
    });

    expect(html).toContain('href="https://example.com/ticket"');
    expect(html).toContain('Museum');
    expect(html).toContain('&lt;entry&gt;<br>');
    expect(html).toContain('href="https://maps.google.com/"');
    expect(html).not.toContain('<entry>');
  });

  it('does not emit links for unsafe protocols', () => {
    expect(gridCellToHtml({
      formattedValue: 'click',
      hyperlink: 'javascript:alert(1)',
    })).toBe('click');
  });
});
