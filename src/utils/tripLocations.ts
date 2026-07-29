const CITY_ALIASES: Record<string, string> = {
  盧森: '琉森',
  梵蒂岡: '羅馬',
};

export const extractPrimaryTripCity = (value: string): string => {
  const primaryCity = value.split(/[→↔/]/)[0].trim();
  const chineseName = primaryCity
    .replace(/[a-zA-Z0-9]/g, '')
    .replace(/\s+/g, '')
    .trim();
  return chineseName || primaryCity;
};

export const getPrimaryTripCity = (value: string): string => {
  const city = extractPrimaryTripCity(value);
  return CITY_ALIASES[city] || city;
};

export const getJourneyCityContent = (
  cityContent: Record<string, string> | undefined,
  city: string
): string | undefined => {
  if (!cityContent) return undefined;
  return cityContent[city] ?? Object.entries(cityContent).find(
    ([contentCity]) => getPrimaryTripCity(contentCity) === city
  )?.[1];
};
