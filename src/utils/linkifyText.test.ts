import { describe, expect, it } from 'vitest';
import { tokenizeLinkedText } from './linkifyText';

describe('tokenizeLinkedText', () => {
  it('keeps hostile HTML as inert text while linking http URLs', () => {
    expect(
      tokenizeLinkedText('<img src=x onerror=alert(1)> https://maps.google.com/place')
    ).toEqual([
      { kind: 'text', value: '<img src=x onerror=alert(1)> ' },
      { kind: 'link', value: 'https://maps.google.com/place' },
    ]);
  });

  it('does not link non-http schemes', () => {
    expect(tokenizeLinkedText('javascript:alert(1)')).toEqual([
      { kind: 'text', value: 'javascript:alert(1)' },
    ]);
  });
});
