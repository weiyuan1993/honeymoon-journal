import type { Currency, Category } from '@/config/trip.config';

// Itinerary types
export interface ItineraryItem {
  rowNumber: number;
  day: string;
  date: string;
  weekday: string;
  city: string;
  content: string;
  transport: string;
  ticket: string;
  link: string;
  hotel: string;
}

export interface ItineraryFormData {
  rowNumber: number;
  city: string;
  content: string;
  transport: string;
  ticket: string;
  link: string;
}

// Expense types - using config-derived types
export interface ExpenseItem {
  rowNumber: number;
  timestamp: string;
  item: string;
  amount: number;
  currency: Currency;
  category: Category;
}

export interface ExpenseFormData {
  item: string;
  amount: string;
  currency: Currency;
  category: Category;
}

// Navigation types
export interface Attraction {
  name: string;
  lat: number;
  lng: number;
}

export interface DayNavigationData {
  attractions: Attraction[];
  center?: [number, number];
  zoom?: number;
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

// User permission types
export interface UserPermission {
  email: string | null;
  canEdit: boolean;
}

// API response types
export interface ApiResponse {
  success: boolean;
  message: string;
}

// Journey content types
export interface JourneyContent {
  intro: string;
  cities: Record<string, string>; // cityName -> content
  closing: string;
}

// AI response types
export interface AIGenerateResponse {
  success: boolean;
  content?: string;
  message?: string;
}

export interface JourneyGenerateResponse {
  success: boolean;
  content?: JourneyContent;
  message?: string;
}

// Chat types for Trip Secretary
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatHistoryItem {
  rowNumber: number;
  timestamp: string;
  question: string;
  answer: string;
}

export interface ChatResponse {
  success: boolean;
  answer?: string;
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
  getExpenseData(): void;
  saveExpense(formData: ExpenseFormData): void;
  editExpense(data: ExpenseItem): void;
  deleteExpense(rowNumber: number): void;
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
  chatWithSecretary(question: string, history: ChatMessage[]): void;
  getChatHistory(): void;
  deleteChatHistory(rowNumber: number): void;
  clearChatHistory(): void;
}

export {};
