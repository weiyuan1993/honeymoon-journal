import type {
  ItineraryItem,
  ItineraryFormData,
  ExpenseItem,
  ExpenseFormData,
  TodoItem,
  TicketItem,
  NavigationData,
  AttractionDetails,
  FoodRecommendations,
  UserPermission,
  ApiResponse,
  AIGenerateResponse,
  JourneyContent,
  JourneyGenerateResponse,
  ChatMessage,
  ChatHistoryItem,
  ChatResponse,
} from '@/types';

// Check if running in Google Apps Script environment
export const isGASEnvironment = typeof google !== 'undefined' && google?.script?.run;

// Mock data for local development
const mockItinerary: ItineraryItem[] = [
  {
    rowNumber: 2,
    day: 'Day 1',
    date: '9/28',
    weekday: 'Mon',
    city: '倫敦',
    content: '抵達倫敦希斯洛機場，辦理 Oyster / contactless 交通設定，傍晚散步到泰晤士河畔。',
    transport: 'Heathrow Express / Elizabeth Line 進市區',
    ticket: '確認 eSIM 與機場交通票',
    link: 'https://tfl.gov.uk/',
    hotel: 'The Clermont London, Charing Cross',
  },
  {
    rowNumber: 3,
    day: 'Day 2',
    date: '9/29',
    weekday: 'Tue',
    city: '倫敦',
    content: '白金漢宮、聖詹姆士公園、西敏寺與大笨鐘；晚上安排 Soho 晚餐。',
    transport: '地鐵 + 步行',
    ticket: '西敏寺可提前預約',
    link: 'https://www.westminster-abbey.org/',
    hotel: 'The Clermont London, Charing Cross',
  },
  {
    rowNumber: 4,
    day: 'Day 3',
    date: '9/30',
    weekday: 'Wed',
    city: '倫敦 → 巴黎',
    content: '搭 Eurostar 前往巴黎，下午入住後到塞納河左岸與聖日耳曼散步。',
    transport: 'Eurostar London St Pancras → Paris Gare du Nord',
    ticket: 'Eurostar 車票需提前購買',
    link: 'https://www.eurostar.com/',
    hotel: 'Hotel Le Six Paris',
  },
  {
    rowNumber: 5,
    day: 'Day 4',
    date: '10/1',
    weekday: 'Thu',
    city: '巴黎',
    content: '羅浮宮、杜樂麗花園、橘園美術館，傍晚到艾菲爾鐵塔拍照。',
    transport: 'Metro / 步行',
    ticket: '羅浮宮與橘園建議預約時段',
    link: 'https://www.louvre.fr/',
    hotel: 'Hotel Le Six Paris',
  },
  {
    rowNumber: 6,
    day: 'Day 5',
    date: '10/2',
    weekday: 'Fri',
    city: '倫敦 → 巴黎',
    content: 'St Pancras 周邊散步後搭 Eurostar 前往巴黎，晚上看艾菲爾鐵塔夜景。',
    transport: 'Eurostar London St Pancras → Paris Gare du Nord',
    ticket: 'Eurostar 已購票；艾菲爾鐵塔外觀免費',
    link: 'https://www.eurostar.com/',
    hotel: 'Hotel Victoria ★★',
  },
  {
    rowNumber: 7,
    day: 'Day 6',
    date: '10/3',
    weekday: 'Sat',
    city: '琉森',
    content: '琉森湖遊船，視天氣安排 Rigi 或 Pilatus；晚上回舊城晚餐。',
    transport: '船班 + 登山鐵道',
    ticket: '天氣佳再決定山區票券',
    link: 'https://www.lakelucerne.ch/',
    hotel: 'Hotel des Balances Lucerne',
  },
  {
    rowNumber: 8,
    day: 'Day 7',
    date: '10/4',
    weekday: 'Sun',
    city: '策馬特',
    content: '前往策馬特，午後走 Gornergrat 周邊或村內散步，保留馬特洪峰天氣彈性。',
    transport: 'Lucerne → Visp → Zermatt',
    ticket: 'SBB SuperSaver 可留意',
    link: 'https://www.sbb.ch/',
    hotel: 'Hotel Daniela Zermatt',
  },
  {
    rowNumber: 9,
    day: 'Day 8',
    date: '10/5',
    weekday: 'Mon',
    city: '巴黎',
    content: '巴黎迪士尼一日雙園遊。',
    transport: 'Paris Gare de Lyon 轉 RER A 線到 Marne-la-Vallée Chessy',
    ticket: '一日雙園門票已購買',
    link: 'https://www.kkday.com/zh-tw/product/20829-disneyland-paris-ticket',
    hotel: 'Hotel Victoria ★★',
  },
  {
    rowNumber: 12,
    day: 'Day 11',
    date: '10/8',
    weekday: 'Thu',
    city: '巴黎 → 琉森',
    content: 'TGV 9203 Paris Gare de Lyon 出發，Basel SBB 轉車後抵達 Luzern。',
    transport: 'Paris Gare de Lyon → Basel SBB → Luzern',
    ticket: '搭車時備妥車票與護照',
    link: 'https://www.sbb.ch/en',
    hotel: 'Hotel Luzernerhof ★★★★',
  },
  {
    rowNumber: 21,
    day: 'Day 20',
    date: '10/17',
    weekday: 'Sat',
    city: '米蘭 → 威尼斯',
    content: 'Italo 07:35 Milano Centrale 出發，10:03 抵達 Venezia S. Lucia。',
    transport: 'Italo Milano Centrale → Venezia S. Lucia',
    ticket: 'Italo 已購票：Prima Business，車廂1，座位41、42',
    link: 'https://www.italotreno.com/',
    hotel: 'Alberghiera Venezia ★★',
  },
  {
    rowNumber: 23,
    day: 'Day 22',
    date: '10/19',
    weekday: 'Mon',
    city: '威尼斯 → 佛羅倫斯',
    content: '早上威尼斯散步後，搭 Italo 前往 Firenze S.M. Novella。',
    transport: 'Italo Venezia S. Lucia → Firenze S.M. Novella',
    ticket: 'Italo 已購票：Prima Business，車廂2，座位6、7',
    link: 'https://www.italotreno.com/',
    hotel: 'Domus Duomo b&b ★★★',
  },
];

const mockExpenseTimestamp = (daysAgo: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const mockExpenses: ExpenseItem[] = [
  {
    rowNumber: 2,
    timestamp: mockExpenseTimestamp(0, 12, 35),
    item: '倫敦 Borough Market 午餐',
    amount: 25.5,
    currency: 'EUR',
    category: 'Food',
  },
  {
    rowNumber: 3,
    timestamp: mockExpenseTimestamp(0, 15, 20),
    item: '巴黎地鐵 Navigo 加值',
    amount: 11.3,
    currency: 'EUR',
    category: 'Transport',
  },
  {
    rowNumber: 4,
    timestamp: mockExpenseTimestamp(0, 19, 45),
    item: '晚餐訂位訂金',
    amount: 40,
    currency: 'EUR',
    category: 'Food',
  },
  {
    rowNumber: 5,
    timestamp: mockExpenseTimestamp(1, 9, 10),
    item: '大英博物館捐款',
    amount: 10,
    currency: 'GBP',
    category: 'Ticket',
  },
  {
    rowNumber: 6,
    timestamp: mockExpenseTimestamp(1, 14, 5),
    item: '下午茶',
    amount: 32.8,
    currency: 'GBP',
    category: 'Food',
  },
  {
    rowNumber: 7,
    timestamp: mockExpenseTimestamp(2, 10, 30),
    item: '瑞士火車置物櫃',
    amount: 7,
    currency: 'CHF',
    category: 'Transport',
  },
  {
    rowNumber: 8,
    timestamp: mockExpenseTimestamp(2, 16, 55),
    item: '山景明信片',
    amount: 18.5,
    currency: 'CHF',
    category: 'Shopping',
  },
  {
    rowNumber: 9,
    timestamp: mockExpenseTimestamp(3, 11, 25),
    item: '車站廁所',
    amount: 1.5,
    currency: 'EUR',
    category: 'Toilet',
  },
  {
    rowNumber: 10,
    timestamp: mockExpenseTimestamp(3, 18, 40),
    item: '佛羅倫斯美術館門票',
    amount: 44,
    currency: 'EUR',
    category: 'Ticket',
  },
  {
    rowNumber: 11,
    timestamp: mockExpenseTimestamp(4, 8, 50),
    item: '機場到市區接駁',
    amount: 1450,
    currency: 'TWD',
    category: 'Transport',
  },
  {
    rowNumber: 12,
    timestamp: mockExpenseTimestamp(4, 21, 15),
    item: '旅平險加購',
    amount: 980,
    currency: 'TWD',
    category: 'Other',
  },
];

const mockTodos: TodoItem[] = [
  {
    rowNumber: 3,
    section: '最優先（出發前 6-9 個月)',
    item: '機票',
    detail: 'TPE 23:50 (09/27) → LHR; FCO 14:55 (10/27) → TPE',
    deadline: '越早越好',
    done: true,
  },
  {
    rowNumber: 4,
    section: '最優先（出發前 6-9 個月)',
    item: '英國eETA',
    detail: 'https://apps.apple.com/us/app/uk-eta/id6444912481',
    deadline: '',
    done: false,
  },
  {
    rowNumber: 17,
    section: '高優先（出發前 3-6 個月)',
    item: '策馬特米蘭車票',
    detail: 'Zermatt → Milano (10/15)',
    deadline: '早鳥較便宜',
    done: false,
  },
];

const mockTickets: TicketItem[] = [
  {
    rowNumber: 2,
    day: 'Day 5',
    date: '2026-10-02',
    city: '倫敦 → 巴黎',
    item: 'Eurostar London St Pancras → Paris Gare du Nord',
    type: '交通',
    provider: 'Eurostar',
    fileUrl: 'https://drive.google.com/file/d/1W8CVYtX0WwrbEBwYNlk3SSTP4tv7Nirh/view?usp=drivesdk',
    notes: 'Tingyun Yang',
  },
  {
    rowNumber: 3,
    day: 'Day 5',
    date: '2026-10-02',
    city: '倫敦 → 巴黎',
    item: 'Eurostar London St Pancras → Paris Gare du Nord',
    type: '交通',
    provider: 'Eurostar',
    fileUrl: 'https://drive.google.com/file/d/1BZXbLrin2cfwpi_cQOB0yRokvVhnPBh7/view?usp=drivesdk',
    notes: 'Weiyuan Lo',
  },
  {
    rowNumber: 4,
    day: 'Day 8',
    date: '2026-10-05',
    city: '巴黎',
    item: '巴黎迪士尼一日雙園',
    type: '門票',
    provider: 'KKday',
    fileUrl: 'https://drive.google.com/file/d/1PYzDIXNh0Z8_WNWjdMQFxlNzlfC5HTX7/view?usp=drivesdk',
    notes: '兩張 NTD 6947',
  },
  {
    rowNumber: 5,
    day: 'Day 11',
    date: '2026-10-08',
    city: '巴黎 → 琉森',
    item: 'TGV 9203 Paris Gare de Lyon → Luzern',
    type: '交通',
    provider: 'TGV Lyria / SBB',
    fileUrl: 'https://drive.google.com/file/d/1qLBURZcCkg0mGN2J2eTU4xXBgJJHxf_N/view?usp=drivesdk',
    notes: '07:22 → 12:05；Basel SBB 轉車',
  },
  {
    rowNumber: 6,
    day: 'Day 20',
    date: '2026-10-17',
    city: '米蘭 → 威尼斯',
    item: 'Italo Milano Centrale → Venezia S. Lucia',
    type: '交通',
    provider: 'Italo',
    fileUrl: 'https://drive.google.com/file/d/1yQ2WttBoa40m0NOGnJXqAEhONuRYGRn1/view?usp=drivesdk',
    notes: 'Prima Business，車廂1，座位41、42',
  },
  {
    rowNumber: 7,
    day: 'Day 22',
    date: '2026-10-19',
    city: '威尼斯 → 佛羅倫斯',
    item: 'Italo Venezia S. Lucia → Firenze S.M. Novella',
    type: '交通',
    provider: 'Italo',
    fileUrl: 'https://drive.google.com/file/d/1xVSI-pTqTb6SxFJV8g3HHuSfU1XMb3WD/view?usp=drivesdk',
    notes: 'Prima Business，車廂2，座位6、7',
  },
];

const mockNavigation: NavigationData = {
  'Day 1': {
    attractions: [
      { name: 'Heathrow Airport', query: 'Heathrow Airport, London' },
      { name: 'Charing Cross', query: 'Charing Cross Station, London' },
    ],
  },
  'Day 2': {
    attractions: [
      { name: 'Buckingham Palace', query: 'Buckingham Palace, London' },
      { name: 'Westminster Abbey', query: 'Westminster Abbey, London' },
      { name: 'Big Ben', query: 'Big Ben, London' },
    ],
  },
  'Day 4': {
    attractions: [
      { name: 'Louvre Museum', query: 'Musée du Louvre, Paris' },
      {
        name: 'Musee de l Orangerie',
        query: "Musée de l'Orangerie, Paris",
      },
      { name: 'Eiffel Tower', query: 'Eiffel Tower, Paris' },
    ],
  },
  'Day 6': {
    attractions: [
      { name: 'Chapel Bridge', query: 'Chapel Bridge, Lucerne' },
      { name: 'Lake Lucerne Pier', query: 'Pier 1, Lucerne' },
      { name: 'Mount Rigi', query: 'Mount Rigi, Switzerland' },
    ],
  },
  'Day 8': {
    attractions: [
      { name: 'Milano Centrale', query: 'Milano Centrale' },
      { name: 'Duomo di Milano', query: 'Duomo di Milano' },
      {
        name: 'Galleria Vittorio Emanuele II',
        query: 'Galleria Vittorio Emanuele II, Milano',
      },
    ],
  },
};

const mockAttractionDetails: AttractionDetails = {
  'Day 1': {
    title: '倫敦初印象',
    content: '第一天以抵達與調整時差為主，沿著泰晤士河慢慢進入旅程節奏。',
  },
  'Day 4': {
    title: '巴黎經典一日',
    content: '從羅浮宮到艾菲爾鐵塔，用藝術與城市散步串起巴黎最經典的蜜月畫面。',
  },
  'Day 6': {
    title: '琉森湖與山景',
    content: '琉森適合保留天氣彈性，湖船與山區路線可依能見度調整。',
  },
};

const mockFoodRecommendations: FoodRecommendations = {};

const mockJourneyContent: JourneyContent = {
  intro: '這是一趟橫跨歐陸的浪漫蜜月之旅。從倫敦啟程，穿越巴黎的浪漫、瑞士的壯麗山巒，最終在義大利的陽光下畫下完美句點。三十天的旅程，將帶領我們穿梭於中世紀古城與現代都會之間。',
  cities: {
    '倫敦': '踏上這座霧都，我們將在泰晤士河畔開啟這段蜜月之旅。從白金漢宮的皇家氣派，到大英博物館的千年瑰寶，倫敦以她的優雅與深厚文化底蘊，為我們的旅程揭開序幕。',
    '巴黎': '塞納河畔的浪漫，艾菲爾鐵塔的璀璨，羅浮宮的藝術殿堂。在這座光之城，每一個轉角都是一幅畫，每一刻都值得被永遠珍藏。',
    '琉森': '琉森把瑞士的湖光山色濃縮在步行可及的尺度裡。卡貝爾橋、舊城與湖船，讓旅程從城市節奏切換到阿爾卑斯山腳下的從容。',
    '策馬特': '策馬特是留給馬特洪峰的等待。天氣好的時候追逐山景，雲霧來時就在村裡慢慢散步，把瑞士的寧靜收進旅程。',
    '米蘭': '米蘭是從山城進入義大利的第一站。大教堂、拱廊與咖啡館讓旅程轉向陽光、設計與義式生活感。',
  },
  closing: '讓我們攜手踏上這段旅程，在歐洲的土地上，寫下屬於我們的永恆篇章。',
};

const mockChatHistory: ChatHistoryItem[] = [];

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

  // Tickets
  getTicketData: (): Promise<TicketItem[]> =>
    callGAS('getTicketData', mockTickets),

  // Todos
  getTodoData: (): Promise<TodoItem[]> =>
    callGAS('getTodoData', mockTodos),

  updateTodoStatus: (rowNumber: number, done: boolean): Promise<ApiResponse> =>
    callGAS(
      'updateTodoStatus',
      { success: true, message: '待辦狀態已更新' },
      rowNumber,
      done
    ),

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

  getFoodRecommendations: (): Promise<FoodRecommendations> =>
    callGAS('getFoodRecommendations', mockFoodRecommendations),

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

  generateFoodRecommendations: (
    dayKey: string,
    city: string,
    itineraryContent: string,
    priceLevel: 'budget' | 'mid' | 'high'
  ): Promise<AIGenerateResponse> =>
    callGAS(
      'generateFoodRecommendations',
      {
        success: true,
        content:
          '[Mock]\n\n【早餐推薦】\n• Café Central - 經典維也納咖啡館，推薦維也納早餐套餐（約€15）\n\n【午餐推薦】\n• Figlmüller - 維也納炸豬排名店，招牌炸豬排（約€20）\n• Plachutta - 傳統牛肉湯專門店（約€25）\n\n【晚餐推薦】\n• Steirereck - 米其林二星，蜜月首選（約€150/人，需提前訂位）\n• Zum Schwarzen Kameel - 百年老店，氣氛浪漫（約€60/人）\n\n【當地必吃】\n• Sacher Torte 薩赫蛋糕\n• Apfelstrudel 蘋果卷\n\n【美食小提醒】\n• 高級餐廳建議提前 1-2 週訂位\n• 午餐時段通常有較優惠的套餐價格',
      },
      dayKey,
      city,
      itineraryContent,
      priceLevel
    ),

  // Journey
  getJourneyContent: (): Promise<JourneyContent | null> =>
    callGAS('getJourneyContent', null),

  generateJourneyIntro: (itinerary: ItineraryItem[]): Promise<JourneyGenerateResponse> =>
    callGAS(
      'generateJourneyIntro',
      {
        success: true,
        content: mockJourneyContent,
      },
      itinerary
    ),

  // Chat methods
  chatWithSecretary: (question: string, history: ChatMessage[], useSearch = false): Promise<ChatResponse> =>
    callGAS(
      'chatWithSecretary',
      {
        success: true,
        answer: `[Mock] 感謝您的提問！關於「${question}」，${useSearch ? '我會參考即時搜尋結果，並' : ''}根據您的行程安排，我建議您可以參考當日的景點規劃。如果需要更詳細的資訊，請告訴我您想了解哪一天的行程。`,
      },
      question,
      history,
      useSearch
    ),

  getChatHistory: (): Promise<ChatHistoryItem[]> =>
    callGAS('getChatHistory', mockChatHistory),

  deleteChatHistory: (rowNumber: number): Promise<ApiResponse> =>
    callGAS('deleteChatHistory', { success: true, message: '已刪除' }, rowNumber),

  clearChatHistory: (): Promise<ApiResponse> =>
    callGAS('clearChatHistory', { success: true, message: '已清除所有對話記錄' }),
};

export default gasClient;
