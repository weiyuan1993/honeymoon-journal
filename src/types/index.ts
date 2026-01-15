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

// Expense types
export interface ExpenseItem {
  rowNumber: number;
  timestamp: string;
  item: string;
  amount: number;
  currency: 'EUR' | 'CHF' | 'GBP' | 'TWD';
  category: 'Food' | 'Transport' | 'Shopping' | 'Ticket' | 'Toilet' | 'Other';
}

export interface ExpenseFormData {
  item: string;
  amount: string;
  currency: 'EUR' | 'CHF' | 'GBP' | 'TWD';
  category: 'Food' | 'Transport' | 'Shopping' | 'Ticket' | 'Toilet' | 'Other';
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
  getUserPermission(): void;
}

export {};
