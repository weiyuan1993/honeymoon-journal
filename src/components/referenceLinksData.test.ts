import { describe, expect, it } from 'vitest';
import type { ReferenceLink } from '@/types';
import {
  filterReferenceLinks,
  groupReferenceLinks,
} from './referenceLinksData';

const links: ReferenceLink[] = [
  {
    category: '英國',
    label: '倫敦地鐵地圖',
    url: 'https://tfl.gov.uk/maps',
    note: '官方路線圖',
  },
  {
    category: '法國',
    label: '巴黎博物館通行證',
    url: 'https://parismuseumpass.fr',
    note: '官方預約',
  },
];

describe('reference link filtering', () => {
  it('filters by country while preserving link order', () => {
    expect(filterReferenceLinks(links, '法國', '')).toEqual([links[1]]);
  });

  it('matches labels, notes, and URLs case-insensitively', () => {
    expect(filterReferenceLinks(links, null, '官方')).toEqual(links);
    expect(filterReferenceLinks(links, null, 'PARISMUSEUMPASS')).toEqual([
      links[1],
    ]);
  });

  it('groups countries in source order and supports preview limits', () => {
    expect(groupReferenceLinks([...links, { ...links[0], label: '倫敦交通' }], 1))
      .toEqual([
        { category: '英國', links: [links[0]] },
        { category: '法國', links: [links[1]] },
      ]);
  });
});
