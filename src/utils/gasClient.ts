import type {
  ItineraryItem,
  ItineraryFormData,
  ExpenseItem,
  ExpenseFormData,
  NavigationData,
  AttractionDetails,
  UserPermission,
  ApiResponse,
  AIGenerateResponse,
} from '@/types';

// Check if running in Google Apps Script environment
const isGASEnvironment = typeof google !== 'undefined' && google?.script?.run;

// Mock data for local development
const mockItinerary: ItineraryItem[] = [
  {
    rowNumber: 2,
    day: 'Day 1',
    date: '5/30',
    weekday: 'Fri',
    city: 'Paris',
    content: '抵達巴黎戴高樂機場，搭乘 RER B 前往市區',
    transport: '機場快線 RER B',
    ticket: '',
    link: '',
    hotel: 'Hotel Example',
  },
  {
    rowNumber: 3,
    day: 'Day 2',
    date: '5/31',
    weekday: 'Sat',
    city: 'Paris',
    content: '艾菲爾鐵塔、塞納河遊船',
    transport: '地鐵',
    ticket: '需預約登塔',
    link: 'https://www.toureiffel.paris/',
    hotel: 'Hotel Example',
  },
];

const mockExpenses: ExpenseItem[] = [
  {
    rowNumber: 2,
    timestamp: new Date().toISOString(),
    item: '午餐',
    amount: 25.5,
    currency: 'EUR',
    category: 'Food',
  },
];

const mockNavigation: NavigationData = {
  'Day 1': {
    attractions: [
      { name: '巴黎戴高樂機場', lat: 49.0097, lng: 2.5479 },
    ],
    center: [49.0097, 2.5479],
    zoom: 12,
  },
};

const mockAttractionDetails: AttractionDetails = {
  'Day 1': {
    title: '巴黎初印象',
    content: '巴黎，這座被塞納河溫柔環抱的城市...',
  },
};

const mockPermission: UserPermission = {
  email: 'dev@localhost',
  canEdit: true,
};

// Wrapper function for GAS API calls
function callGAS<T>(
  functionName: string,
  mockResponse: T,
  ...args: unknown[]
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (isGASEnvironment) {
      const runner = google.script.run
        .withSuccessHandler((result: T) => resolve(result))
        .withFailureHandler((error: Error) => reject(error));

      // Call the function with arguments
      (runner as unknown as Record<string, (...args: unknown[]) => void>)[functionName](...args);
    } else {
      // Development mode - return mock data after a small delay
      console.log(`[DEV] Mock call to ${functionName}:`, args);
      setTimeout(() => resolve(mockResponse), 300);
    }
  });
}

// API Client
export const gasClient = {
  // Itinerary
  getItineraryData: (): Promise<ItineraryItem[]> =>
    callGAS('getItineraryData', mockItinerary),

  editItinerary: (form: ItineraryFormData): Promise<ApiResponse> =>
    callGAS('editItinerary', { success: true, message: '行程已更新' }, form),

  // Expenses
  getExpenseData: (): Promise<ExpenseItem[]> =>
    callGAS('getExpenseData', mockExpenses),

  saveExpense: (formData: ExpenseFormData): Promise<ApiResponse> =>
    callGAS('saveExpense', { success: true, message: '記帳成功！' }, formData),

  editExpense: (data: ExpenseItem): Promise<ApiResponse> =>
    callGAS('editExpense', { success: true, message: '修改成功' }, data),

  deleteExpense: (rowNumber: number): Promise<ApiResponse> =>
    callGAS('deleteExpense', { success: true, message: '已刪除' }, rowNumber),

  // Navigation & Details
  getNavigationData: (): Promise<NavigationData> =>
    callGAS('getNavigationData', mockNavigation),

  getAttractionDetails: (): Promise<AttractionDetails> =>
    callGAS('getAttractionDetails', mockAttractionDetails),

  // User Permission
  getUserPermission: (): Promise<UserPermission> =>
    callGAS('getUserPermission', mockPermission),

  // AI Features
  generateAttractionStory: (
    dayKey: string,
    city: string,
    itineraryContent: string
  ): Promise<AIGenerateResponse> =>
    callGAS(
      'generateAttractionStory',
      {
        success: true,
        content:
          '[Mock]\n\n【景點故事】\n踏上這片承載千年風華的土地，你會發現這座城市獨特的魅力。漫步在古老的街道上，歷史的痕跡與現代的活力在此交織，讓每一步都充滿驚喜與感動。\n\n【交通規劃】\n• 09:00 飯店出發 → 步行 → 中央廣場（約10分鐘）\n• 11:00 中央廣場 → 地鐵M1 → 主教堂站（約15分鐘）\n• 14:00 主教堂 → 步行 → 老城區（約5分鐘）\n\n【小提醒】\n• 建議提前在官網購買門票，可省去排隊時間\n• 中午12:00-14:00為午休時間，部分景點不開放',
      },
      dayKey,
      city,
      itineraryContent
    ),

  suggestItinerary: (
    city: string,
    date?: string,
    preferences?: string
  ): Promise<AIGenerateResponse> =>
    callGAS(
      'suggestItinerary',
      {
        success: true,
        content:
          '[Mock] 推薦景點：\n1. 著名地標 - 必訪經典景點\n2. 當地美食街 - 品嚐道地風味\n3. 歷史博物館 - 了解文化背景\n\n推薦餐廳：\n- 當地人氣餐廳\n\n建議路線：早上參觀地標 → 中午用餐 → 下午博物館',
      },
      city,
      date,
      preferences
    ),
};

export default gasClient;
