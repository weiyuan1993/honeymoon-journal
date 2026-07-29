import type { ReferenceLink } from '@/types';

export interface ReferenceLinkGroup {
  category: string;
  links: ReferenceLink[];
}

export const groupReferenceLinks = (
  links: ReferenceLink[],
  limitPerCategory?: number
): ReferenceLinkGroup[] => {
  const groups = new Map<string, ReferenceLink[]>();

  links.forEach((link) => {
    const categoryLinks = groups.get(link.category) ?? [];
    if (
      limitPerCategory === undefined ||
      categoryLinks.length < limitPerCategory
    ) {
      categoryLinks.push(link);
    }
    groups.set(link.category, categoryLinks);
  });

  return Array.from(groups, ([category, categoryLinks]) => ({
    category,
    links: categoryLinks,
  }));
};

export const filterReferenceLinks = (
  links: ReferenceLink[],
  category: string | null,
  query: string
): ReferenceLink[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-TW');

  return links.filter((link) => {
    if (category && link.category !== category) return false;
    if (!normalizedQuery) return true;

    return [link.category, link.label, link.note, link.url]
      .filter((value): value is string => Boolean(value))
      .some((value) =>
        value.toLocaleLowerCase('zh-TW').includes(normalizedQuery)
      );
  });
};

export const getReferenceHostname = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
