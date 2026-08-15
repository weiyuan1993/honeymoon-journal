import type {
  AIGenerateResponse,
  ApiResponse,
  AttractionDetails,
  ChatHistoryItem,
  ChatMessage,
  ChatResponse,
  ExpenseFormData,
  ExpenseItem,
  ExpenseOverviewData,
  FoodRecommendations,
  ItineraryFormData,
  ItineraryItem,
  JourneyContent,
  JourneyGenerateResponse,
  NavigationData,
  PriceLevel,
  ReferenceLink,
  TicketItem,
  TodoLink,
  TodoItem,
  UserPermission,
} from '@/types';
import { safeUrl } from '../../shared/safeUrl';
import { authClient, callWorker } from '@/utils/apiClient';

type TodoApiItem = Omit<TodoItem, 'links'> & {
  links?: TodoLink[];
  deadline?: string;
  link?: string;
};

const PLAIN_URL_PATTERN =
  /https?:\/\/[^\s<>"'，。！？、；：）】》〉」』〕］}]+/gi;

function removeTodoUrls(value: string): string {
  return value
    .replace(PLAIN_URL_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function removeLinkedTodoUrls(value: string, links: TodoLink[]): string {
  const linkedUrls = new Set(links.map((link) => link.url));
  if (linkedUrls.size === 0) return value;

  return value
    .replace(PLAIN_URL_PATTERN, (url) =>
      linkedUrls.has(safeUrl(url) ?? '') ? '' : url
    )
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizeTodoLinks(links: TodoLink[] | undefined, legacyLink?: string): TodoLink[] {
  const source = Array.isArray(links)
    ? links
    : legacyLink
      ? [{ label: '訂票連結', url: legacyLink }]
      : [];

  return source.flatMap((link, index) => {
    const url = safeUrl(link.url);
    if (!url) return [];
    const label = typeof link.label === 'string' ? link.label.trim() : '';
    return [{
      label: label || `訂票連結 ${index + 1}`,
      url,
    }];
  });
}

function normalizeTodoItem(
  { deadline, link, links, ...todo }: TodoApiItem,
  canViewLinks: boolean
): TodoItem {
  const normalizedLinks = normalizeTodoLinks(links, link);
  const cleanUrls = canViewLinks
    ? (value: string) => removeLinkedTodoUrls(value, normalizedLinks)
    : removeTodoUrls;
  const detail = cleanUrls(todo.detail);
  const visibleDeadline = deadline
    ? cleanUrls(deadline)
    : '';
  return {
    ...todo,
    detail: visibleDeadline && !detail.includes('期限／狀態：')
      ? [detail, `期限／狀態：${visibleDeadline}`].filter(Boolean).join('<br>')
      : detail,
    links: canViewLinks ? normalizedLinks : [],
  };
}

export const tripClient = {
  getItineraryData: (): Promise<ItineraryItem[]> =>
    callWorker('getItineraryData', []),

  editItinerary: (form: ItineraryFormData): Promise<ApiResponse> =>
    callWorker('editItinerary', [form]),

  getTicketData: (): Promise<TicketItem[]> =>
    callWorker('getTicketData', []),

  getTodoData: async (canViewLinks = false): Promise<TodoItem[]> =>
    (await callWorker<TodoApiItem[]>('getTodoData', [])).map((todo) =>
      normalizeTodoItem(todo, canViewLinks)
    ),

  updateTodoStatus: (
    rowNumber: number,
    done: boolean,
    expectedItem?: string,
  ): Promise<ApiResponse> =>
    callWorker('updateTodoStatus', [rowNumber, done, expectedItem]),

  getExpenseData: (): Promise<ExpenseItem[]> =>
    callWorker('getExpenseData', []),

  getExpenseOverviewData: (): Promise<ExpenseOverviewData> =>
    callWorker('getExpenseOverviewData', []),

  saveExpense: (formData: ExpenseFormData): Promise<ApiResponse> =>
    callWorker('saveExpense', [formData]),

  editExpense: (data: ExpenseItem): Promise<ApiResponse> =>
    callWorker('editExpense', [data]),

  deleteExpense: (
    rowNumber: number,
    expected?: Pick<ExpenseItem, 'timestamp' | 'item'>,
  ): Promise<ApiResponse> =>
    callWorker('deleteExpense', [rowNumber, expected]),

  getNavigationData: (): Promise<NavigationData> =>
    callWorker('getNavigationData', []),

  getAttractionDetails: (): Promise<AttractionDetails> =>
    callWorker('getAttractionDetails', []),

  getFoodRecommendations: (): Promise<FoodRecommendations> =>
    callWorker('getFoodRecommendations', []),

  getUserPermission: (): Promise<UserPermission> =>
    authClient.session(),

  generateAttractionStory: (
    dayKey: string,
    city: string,
    itineraryContent: string,
  ): Promise<AIGenerateResponse> =>
    callWorker('generateAttractionStory', [dayKey, city, itineraryContent]),

  suggestItinerary: (
    city: string,
    date?: string,
    preferences?: string,
  ): Promise<AIGenerateResponse> =>
    callWorker('suggestItinerary', [city, date, preferences]),

  generateFoodRecommendations: (
    dayKey: string,
    city: string,
    itineraryContent: string,
    priceLevel: PriceLevel,
  ): Promise<AIGenerateResponse> =>
    callWorker('generateFoodRecommendations', [
      dayKey,
      city,
      itineraryContent,
      priceLevel,
    ]),

  getJourneyContent: (): Promise<JourneyContent | null> =>
    callWorker('getJourneyContent', []),

  getReferenceLinks: (): Promise<ReferenceLink[]> =>
    callWorker('getReferenceLinks', []),

  generateJourneyIntro: (
    itinerary: ItineraryItem[],
  ): Promise<JourneyGenerateResponse> =>
    callWorker('generateJourneyIntro', [itinerary]),

  chatWithSecretary: (
    question: string,
    history: ChatMessage[],
    useSearch = false,
  ): Promise<ChatResponse> =>
    callWorker('chatWithSecretary', [question, history, useSearch]),

  getChatHistory: (): Promise<ChatHistoryItem[]> =>
    callWorker('getChatHistory', []),

  deleteChatHistory: (rowNumber: number): Promise<ApiResponse> =>
    callWorker('deleteChatHistory', [rowNumber]),

  clearChatHistory: (): Promise<ApiResponse> =>
    callWorker('clearChatHistory', []),
};

export default tripClient;
