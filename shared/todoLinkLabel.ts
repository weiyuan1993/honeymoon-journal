const DOMAIN_LABELS = [
  ['drive.google.com', 'Google Drive'],
  ['docs.google.com', 'Google Docs'],
  ['eurostar.com', 'Eurostar'],
  ['sbb.ch', 'SBB'],
  ['trip.com', 'Trip.com'],
  ['discoverasr.com', 'Citadines'],
  ['agoda.com', 'Agoda'],
  ['booking.com', 'Booking.com'],
  ['parismuseumpass.fr', 'Paris Museum Pass'],
  ['klook.com', 'Klook'],
  ['skygarden.london', 'Sky Garden'],
  ['hrp.org.uk', 'Historic Royal Palaces'],
  ['thamesclippers.com', 'Uber Boat'],
] as const;

export function todoLinkLabelFromUrl(value: string): string {
  try {
    const hostname = new URL(value)
      .hostname
      .toLowerCase()
      .replace(/^www\./, '');
    const knownDomain = DOMAIN_LABELS.find(([domain]) =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    return knownDomain?.[1] ?? hostname;
  } catch {
    return '';
  }
}

export function isGenericTodoLinkLabel(value: string): boolean {
  return /^(?:訂票連結|連結)(?:\s*\d+)?$/u.test(value.trim());
}
