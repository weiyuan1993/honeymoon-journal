import type { Currency, Category } from '@/config/trip.config';
import type {
  ExpenseFormData as SharedExpenseFormData,
  ExpenseItem as SharedExpenseItem,
  JourneyContent,
} from '../../shared/apiTypes';

export type {
  ApiResponse,
  ChatHistoryItem,
  ChatMessage,
  ExpenseOverviewCategory,
  ExpenseOverviewCurrencyTotal,
  ExpenseOverviewData,
  ItineraryFormData,
  ItineraryItem,
  ItineraryReferenceLink,
  JourneyContent,
  ReferenceLink,
  TicketItem,
  TodoLink,
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
