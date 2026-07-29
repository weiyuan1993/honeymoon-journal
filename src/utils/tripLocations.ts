export const extractPrimaryTripCity = (value: string): string => {
  const primaryCity = value.split(/[→↔/]/)[0].trim();
  const chineseName = primaryCity
    .replace(/[a-zA-Z0-9]/g, '')
    .replace(/\s+/g, '')
    .trim();
  return chineseName || primaryCity;
};
