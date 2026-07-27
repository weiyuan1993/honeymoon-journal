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
  expectedDay?: string;
  city: string;
  content: string;
  transport: string;
  ticket: string;
  link: string;
}

export interface ExpenseItem<
  TCurrency extends string = string,
  TCategory extends string = string,
> {
  rowNumber: number;
  timestamp: string;
  item: string;
  amount: number;
  currency: TCurrency;
  category: TCategory;
}

export interface ExpenseFormData<
  TCurrency extends string = string,
  TCategory extends string = string,
> {
  item: string;
  amount: string;
  currency: TCurrency;
  category: TCategory;
}

export interface TodoItem {
  rowNumber: number;
  section: string;
  item: string;
  detail: string;
  deadline: string;
  done: boolean;
}

export interface TicketItem {
  rowNumber: number;
  day: string;
  date: string;
  city: string;
  item: string;
  type: string;
  provider: string;
  fileUrl: string;
  notes: string;
}

export interface UserPermission {
  email: string | null;
  canEdit: boolean;
  privateLinks?: {
    googleSheet: string;
    ticketFolder: string;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface JourneyContent {
  intro: string;
  cities: Record<string, string>;
  closing: string;
}

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
