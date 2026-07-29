import { describe, expect, it } from 'vitest';
import { parseJourney } from '../tripService';

describe('parseJourney', () => {
  it('parses structured journey output into the page content shape', () => {
    const generated = JSON.stringify({
      intro: '我們從倫敦展開旅程。',
      cities: [
        { name: '倫敦', content: '在泰晤士河畔寫下第一頁。' },
        { name: '巴黎', content: '沿著塞納河感受浪漫。' },
      ],
      closing: '這段旅程會成為我們共同的珍藏。',
    });

    expect(parseJourney(generated, ['倫敦', '巴黎'])).toEqual({
      intro: '我們從倫敦展開旅程。',
      cities: {
        '倫敦': '在泰晤士河畔寫下第一頁。',
        '巴黎': '沿著塞納河感受浪漫。',
      },
      closing: '這段旅程會成為我們共同的珍藏。',
    });
  });
});
