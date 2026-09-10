import florenceImage from '../../assets/images/dashboard-cities/florence.jpg';
import grindelwaldImage from '../../assets/images/dashboard-cities/grindelwald.jpg';
import londonImage from '../../assets/images/dashboard-cities/london.jpg';
import lucerneImage from '../../assets/images/dashboard-cities/lucerne.jpg';
import milanImage from '../../assets/images/dashboard-cities/milan.jpg';
import parisImage from '../../assets/images/dashboard-cities/paris.jpg';
import romeImage from '../../assets/images/dashboard-cities/rome.jpg';
import veniceImage from '../../assets/images/dashboard-cities/venice.jpg';
import zermattImage from '../../assets/images/dashboard-cities/zermatt.jpg';

const cityIllustrations: Record<string, string> = {
  倫敦: londonImage,
  巴黎: parisImage,
  琉森: lucerneImage,
  格林德瓦: grindelwaldImage,
  策馬特: zermattImage,
  米蘭: milanImage,
  威尼斯: veniceImage,
  佛羅倫斯: florenceImage,
  羅馬: romeImage,
};

export const getCityIllustration = (city: string): string | undefined =>
  cityIllustrations[city];

export const getDashboardCityIllustration = getCityIllustration;
