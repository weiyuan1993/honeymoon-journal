/**
 * Journey Page Image Configuration
 * Images hosted via GitHub raw URLs to keep the bundle small.
 */

const BASE_URL =
  'https://raw.githubusercontent.com/weiyuan1993/honeymoon-journal/main/assets/images';

// City hero images
export const coverMobileImage = `${BASE_URL}/cover-mobile.png`;

export const cityHeroImages: Record<string, string> = {
  '封面': `${BASE_URL}/cover.png`,
  '倫敦': `${BASE_URL}/london.jpg`,
  '巴黎': `${BASE_URL}/paris.jpg`,
  '琉森': `${BASE_URL}/lucerne.jpg`,
  '格林德瓦': `${BASE_URL}/grindelwald.jpg`,
  '策馬特': `${BASE_URL}/zermatt.jpg`,
  '米蘭': `${BASE_URL}/milan.jpg`,
  '威尼斯': `${BASE_URL}/venice.jpg`,
  '佛羅倫斯': `${BASE_URL}/florence.jpg`,
  '羅馬': `${BASE_URL}/rome.jpg`,
};
