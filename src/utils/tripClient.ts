import type {
  AIGenerateResponse,
  ApiResponse,
  AttractionDetails,
  ChatHistoryItem,
  ChatMessage,
  ChatResponse,
  ExpenseFormData,
  ExpenseItem,
  FoodRecommendations,
  ItineraryFormData,
  ItineraryItem,
  JourneyContent,
  JourneyGenerateResponse,
  NavigationData,
  PriceLevel,
  ReferenceLink,
  TicketItem,
  TodoItem,
  UserPermission,
} from '@/types';
import { authClient, callWorker } from '@/utils/apiClient';
import type { ExpenseOverviewData } from '../../shared/apiTypes';

export const tripClient = {
  getItineraryData: (): Promise<ItineraryItem[]> =>
    callWorker('getItineraryData', []),

  editItinerary: (form: ItineraryFormData): Promise<ApiResponse> =>
    callWorker('editItinerary', [form]),

  getTicketData: (): Promise<TicketItem[]> =>
    callWorker('getTicketData', []),

  getTodoData: (): Promise<TodoItem[]> =>
    callWorker('getTodoData', []),

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
