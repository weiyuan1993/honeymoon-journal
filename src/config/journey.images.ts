/**
 * Journey Page Image Configuration
 * Using Pexels free images - all URLs verified as valid
 */

// Helper to build Pexels URL
const pexels = (photoId: string, width: number = 1600) =>
  `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

// City hero images
export const cityHeroImages: Record<string, string> = {
  '封面': pexels('2676557'),
  '倫敦': pexels('672532'), // Big Ben and London skyline
  '巴黎': pexels('5005305'), // Eiffel Tower
  '琉森': pexels('5210630'), // Swiss lake and mountains
  '因特拉肯': pexels('12301006'), // Swiss Alps
  '策馬特': pexels('6344695'), // Matterhorn
  '米蘭': pexels('6274557'), // Milan Cathedral
  '威尼斯': pexels('804954'), // Venice Grand Canal
  '佛羅倫斯': pexels('4179480'), // Florence Duomo
  '羅馬': pexels('1797161'), // Colosseum
};
