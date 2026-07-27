import type { Currency, Category } from '@/config/trip.config';
import type {
  ChatMessage,
  ExpenseFormData as SharedExpenseFormData,
  ExpenseItem as SharedExpenseItem,
  ItineraryFormData,
  ItineraryItem,
  JourneyContent,
} from '../../shared/apiTypes';

export type {
  ApiResponse,
  ChatHistoryItem,
  ChatMessage,
  ItineraryFormData,
  ItineraryItem,
  JourneyContent,
  TicketItem,
  TodoItem,
  UserPermission,
} from '../../shared/apiTypes';

export type ExpenseItem = SharedExpenseItem<Currency, Category>;
export type ExpenseFormData = SharedExpenseFormData<Currency, Category>;

// Navigation types
export interface Attraction {
  name: string;
  query: string;
}

export interface DayNavigationData {
  attractions: Attraction[];
}

export type NavigationData = Record<string, DayNavigationData>;

// Attraction details types
export interface AttractionDetail {
  title: string;
  content: string;
}

export type AttractionDetails = Record<string, AttractionDetail>;

// Food recommendations types
export type PriceLevel = 'budget' | 'mid' | 'high';
export type FoodRecommendations = Record<string, Partial<Record<PriceLevel, string>>>;

// AI response types
export interface AIGenerateResponse {
  success: boolean;
  content?: string;
  persisted?: boolean;
  message?: string;
}

export interface JourneyGenerateResponse {
  success: boolean;
  content?: JourneyContent;
  persisted?: boolean;
  message?: string;
}

export interface ChatResponse {
  success: boolean;
  answer?: string;
  persisted?: boolean;
  message?: string;
}

// Google Apps Script types
declare global {
  const google: {
    script: {
      run: GoogleScriptRun;
    };
  };
}

interface GoogleScriptRun {
  withSuccessHandler<T>(handler: (result: T) => void): GoogleScriptRun;
  withFailureHandler(handler: (error: Error) => void): GoogleScriptRun;
  getItineraryData(): void;
  editItinerary(form: ItineraryFormData): void;
  getTicketData(): void;
  getTodoData(): void;
  updateTodoStatus(rowNumber: number, done: boolean, expectedItem?: string): void;
  getExpenseData(): void;
  saveExpense(formData: ExpenseFormData): void;
  editExpense(data: ExpenseItem): void;
  deleteExpense(
    rowNumber: number,
    expected?: Pick<ExpenseItem, 'timestamp' | 'item'>
  ): void;
  getNavigationData(): void;
  getAttractionDetails(): void;
  getFoodRecommendations(): void;
  getUserPermission(): void;
  // AI methods
  generateAttractionStory(
    dayKey: string,
    city: string,
    itineraryContent: string
  ): void;
  suggestItinerary(city: string, date?: string, preferences?: string): void;
  generateFoodRecommendations(
    dayKey: string,
    city: string,
    itineraryContent: string,
    priceLevel: 'budget' | 'mid' | 'high'
  ): void;
  // Journey methods
  getJourneyContent(): void;
  generateJourneyIntro(itinerary: ItineraryItem[]): void;
  // Chat methods
  chatWithSecretary(question: string, history: ChatMessage[], useSearch?: boolean): void;
  getChatHistory(): void;
  deleteChatHistory(rowNumber: number): void;
  clearChatHistory(): void;
}

export {};
