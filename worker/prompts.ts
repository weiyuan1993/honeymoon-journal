import type { ItineraryItem } from './models';

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').trim();

export function attractionPrompt(day: string, city: string, content: string): string {
  return `你是一位專業的蜜月旅遊規劃師。請根據以下行程資訊，生成一份完整的當日景點規劃。

重要：請使用純文字格式，不要使用 markdown 語法。

請按以下格式輸出：
【景點故事】
用優雅的文學風格介紹當日景點，約200-300字。使用第二人稱「你」，融入歷史典故和文化背景。

【交通規劃】
• HH:MM 地點A → 交通方式 → 地點B（約X分鐘）

【小提醒】
2-3點實用建議。

Day: ${day}
城市: ${city}
行程內容: ${stripHtml(content)}`;
}

export function foodPrompt(
  day: string,
  city: string,
  content: string,
  priceLevel: string
): string {
  const descriptions: Record<string, string> = {
    budget: '平價美食（每人約 €10-20 或當地等值貨幣）',
    mid: '中價位餐廳（每人約 €25-50 或當地等值貨幣）',
    high: '高級餐廳（每人約 €60+ 或當地等值貨幣，適合特別的蜜月晚餐）',
  };
  return `你是一位專業的蜜月旅遊美食顧問。請根據行程推薦當日用餐選擇。
使用純文字，不要使用 markdown。每間餐廳附 Google Maps 搜尋連結。
價位需求：${descriptions[priceLevel] ?? descriptions.mid}

依序輸出【早餐推薦】【午餐推薦】【晚餐推薦】【當地必吃】【美食小提醒】。
Day: ${day}
城市: ${city}
當日行程: ${stripHtml(content)}`;
}

export function itinerarySuggestionPrompt(
  city: string,
  date?: string,
  preferences?: string
): string {
  return `你是一位專業的旅遊規劃師。請為以下條件提供一日行程建議：
城市: ${city}
日期: ${date || '不限'}
偏好: ${preferences || '一般觀光、美食、拍照打卡'}

請用繁體中文提供 3-5 個景點、1-2 間餐廳、路線順序與交通建議。`;
}

export function journeyPrompt(itinerary: ItineraryItem[]): {
  prompt: string;
  cities: string[];
  responseSchema: Record<string, unknown>;
} {
  const cities: string[] = [];
  for (const item of itinerary) {
    if (!item.city || item.city.includes('→')) continue;
    const city = item.city.trim().split(' ')[0];
    if (city && !cities.includes(city)) cities.push(city);
  }
  const details = itinerary
    .map((item) => `${item.day} ${item.city}: ${stripHtml(item.content).slice(0, 160)}`)
    .join('\n');

  return {
    cities,
    prompt: `你是一位文筆優美的旅遊作家，請以第一人稱複數「我們」撰寫蜜月旅程介紹。
intro 請寫約 100-150 字旅程序章。
cities 請依序為以下每個城市各寫一段約 80-120 字的城市體驗：${cities.join('、')}。
closing 請寫約 40-60 字結語。

行程：
${details}`,
    responseSchema: {
      type: 'OBJECT',
      properties: {
        intro: {
          type: 'STRING',
          description: '約 100-150 字的蜜月旅程序章',
        },
        cities: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: {
                type: 'STRING',
                enum: cities,
              },
              content: {
                type: 'STRING',
                description: '約 80-120 字的城市體驗',
              },
            },
            required: ['name', 'content'],
          },
        },
        closing: {
          type: 'STRING',
          description: '約 40-60 字的旅程結語',
        },
      },
      required: ['intro', 'cities', 'closing'],
    },
  };
}

export function chatSystemPrompt(tripContext: string, search: boolean): string {
  return `你是一位專業且貼心的蜜月旅程秘書，名叫「旅程秘書」。
以下是完整行程資料：
${tripContext}

使用繁體中文、純文字，回答控制在 200 字內。不要編造不存在的內容。
不要使用任何 Markdown 語法；不要使用星號（*）、雙星號、底線或井字號標示粗體、斜體、標題或清單。需要列點時請直接使用「•」。
${search ? '已啟用網路搜尋，可查詢即時資訊。' : '未啟用搜尋；即時資訊請提醒使用者開啟搜尋模式。'}`;
}
