export interface LinkTarget {
  label: string;
  url: string;
}

export type ItineraryReferenceLink = LinkTarget;

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
  referenceLinks: ItineraryReferenceLink[];
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

export interface ExpenseOverviewCategory {
  category: string;
  currency: string;
  amount: number;
  paidAmount: number;
  unpaidAmount: number;
  amountTwd: number | null;
  paidAmountTwd: number | null;
  unpaidAmountTwd: number | null;
}

export interface ExpenseOverviewCurrencyTotal {
  currency: string;
  amount: number;
  amountTwd: number | null;
}

export interface ExpenseOverviewData {
  fetchedAt: string;
  ratesTwdPerUnit: Record<string, number | null>;
  categories: ExpenseOverviewCategory[];
  ledgerByCurrency: ExpenseOverviewCurrencyTotal[];
  components: {
    budgetProjectedTwd: number | null;
    budgetPaidTwd: number | null;
    budgetUnpaidTwd: number | null;
    ledgerTwd: number | null;
  };
  totals: {
    projectedTwd: number | null;
    paidTwd: number | null;
    unpaidTwd: number | null;
  };
  warnings: string[];
  unconvertedCurrencies: string[];
  isComplete: boolean;
}

export type TodoLink = LinkTarget;

export interface TodoItem {
  rowNumber: number;
  section: string;
  item: string;
  detail: string;
  links: TodoLink[];
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

export interface ReferenceLink {
  category: string;
  label: string;
  url: string;
  note?: string;
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
