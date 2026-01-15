import type {
  ItineraryItem,
  ItineraryFormData,
  ExpenseItem,
  ExpenseFormData,
  NavigationData,
  AttractionDetails,
  UserPermission,
  ApiResponse,
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
};

export default gasClient;
