export type RouteCapability =
  | 'public:read'
  | 'private:read'
  | 'private:write'
  | 'private:ai';

export const API_OPERATIONS = {
  getItineraryData: { capability: 'public:read', method: 'GET' },
  getTodoData: { capability: 'public:read', method: 'GET' },
  getExpenseData: { capability: 'public:read', method: 'GET' },
  getNavigationData: { capability: 'public:read', method: 'GET' },
  getAttractionDetails: { capability: 'public:read', method: 'GET' },
  getFoodRecommendations: { capability: 'public:read', method: 'GET' },
  getJourneyContent: { capability: 'public:read', method: 'GET' },
  getReferenceLinks: { capability: 'public:read', method: 'GET' },
  getTicketData: { capability: 'private:read', method: 'GET' },
  getChatHistory: { capability: 'private:read', method: 'GET' },
  editItinerary: { capability: 'private:write', method: 'POST' },
  updateTodoStatus: { capability: 'private:write', method: 'POST' },
  saveExpense: { capability: 'private:write', method: 'POST' },
  editExpense: { capability: 'private:write', method: 'POST' },
  deleteExpense: { capability: 'private:write', method: 'POST' },
  deleteChatHistory: { capability: 'private:write', method: 'POST' },
  clearChatHistory: { capability: 'private:write', method: 'POST' },
  generateAttractionStory: { capability: 'private:ai', method: 'POST' },
  generateFoodRecommendations: { capability: 'private:ai', method: 'POST' },
  suggestItinerary: { capability: 'private:ai', method: 'POST' },
  generateJourneyIntro: { capability: 'private:ai', method: 'POST' },
  chatWithSecretary: { capability: 'private:ai', method: 'POST' },
} as const satisfies Record<
  string,
  { capability: RouteCapability; method: 'GET' | 'POST' }
>;

export type ApiOperation = keyof typeof API_OPERATIONS;

export function isApiOperation(value: string): value is ApiOperation {
  return Object.prototype.hasOwnProperty.call(API_OPERATIONS, value);
}

export function isReadOperation(operation: ApiOperation): boolean {
  return API_OPERATIONS[operation].method === 'GET';
}
