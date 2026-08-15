export type {
  ApiResponse,
  ChatHistoryItem,
  ChatMessage,
  ExpenseFormData,
  ExpenseItem,
  ExpenseOverviewCategory,
  ExpenseOverviewCurrencyTotal,
  ExpenseOverviewData,
  ItineraryFormData,
  ItineraryItem,
  JourneyContent,
  ReferenceLink,
  TicketItem,
  TodoLink,
  TodoItem,
} from '../shared/apiTypes';

export class ConflictError extends Error {
  readonly status = 409;
}
