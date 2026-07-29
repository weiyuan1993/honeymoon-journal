import { describe, expect, it } from 'vitest';
import { htmlToText } from './htmlToText';

describe('htmlToText', () => {
  it('decodes escaped apostrophes in itinerary text', () => {
    expect(
      htmlToText(
        'Eurostar 14:31→17:59，抵達巴黎北站後，搭乘地鐵 5 號線直達 Place d&#39;Italie 飯店'
      )
    ).toBe(
      "Eurostar 14:31→17:59，抵達巴黎北站後，搭乘地鐵 5 號線直達 Place d'Italie 飯店"
    );
  });

  it('removes markup, decodes generated entities, and normalizes whitespace', () => {
    expect(
      htmlToText(
        '<strong>Vic &amp; Dora</strong><br>Paris &lt; London &quot;trip&quot;'
      )
    ).toBe('Vic & Dora Paris < London "trip"');
  });
});
