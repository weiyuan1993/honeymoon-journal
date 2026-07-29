import { GeminiClient } from './gemini';
import type {
  ChatMessage,
  ExpenseFormData,
  ExpenseItem,
  ItineraryFormData,
  ItineraryItem,
  JourneyContent,
} from './models';
import {
  attractionPrompt,
  chatSystemPrompt,
  foodPrompt,
  itinerarySuggestionPrompt,
  journeyPrompt,
} from './prompts';
import { TripRepository } from './tripRepository';

export interface PersistedGenerateResponse<T = string> {
  success: boolean;
  content?: T;
  answer?: string;
  persisted?: boolean;
  message?: string;
}

export class TripService {
  constructor(
    private readonly repository: TripRepository,
    private readonly gemini: GeminiClient
  ) {}

  getItineraryData = () => this.repository.getItinerary();
  editItinerary = (form: ItineraryFormData) => this.repository.editItinerary(form);
  getTicketData = () => this.repository.getTickets();
  getTodoData = () => this.repository.getTodos();
  updateTodoStatus = (row: number, done: boolean, expectedItem?: string) =>
    this.repository.updateTodoStatus(row, done, expectedItem);
  getExpenseData = () => this.repository.getExpenses();
  saveExpense = (form: ExpenseFormData) => this.repository.saveExpense(form);
  editExpense = (expense: ExpenseItem) => this.repository.editExpense(expense);
  deleteExpense = (
    row: number,
    expected?: Pick<ExpenseItem, 'timestamp' | 'item'>
  ) => this.repository.deleteExpense(row, expected);
  getNavigationData = () => this.repository.getNavigation();
  getAttractionDetails = () => this.repository.getAttractionDetails();
  getFoodRecommendations = () => this.repository.getFoodRecommendations();
  getJourneyContent = () => this.repository.getJourney();
  getReferenceLinks = () => this.repository.getReferenceLinks();
  getChatHistory = () => this.repository.getChatHistory();
  deleteChatHistory = (row: number) => this.repository.deleteChat(row);
  clearChatHistory = () => this.repository.clearChat();

  async generateAttractionStory(
    day: string,
    city: string,
    itineraryContent: string
  ): Promise<PersistedGenerateResponse> {
    const content = await this.gemini.generate({
      prompt: attractionPrompt(day, city, itineraryContent),
      temperature: 0.8,
    });
    try {
      await this.repository.saveAttraction(day, city, content);
      return { success: true, content, persisted: true };
    } catch {
      return { success: true, content, persisted: false, message: '內容已生成，但尚未儲存' };
    }
  }

  async generateFoodRecommendations(
    day: string,
    city: string,
    itineraryContent: string,
    priceLevel: string
  ): Promise<PersistedGenerateResponse> {
    const content = await this.gemini.generate({
      prompt: foodPrompt(day, city, itineraryContent, priceLevel),
      temperature: 0.8,
    });
    try {
      await this.repository.saveFood(day, city, priceLevel, content);
      return { success: true, content, persisted: true };
    } catch {
      return { success: true, content, persisted: false, message: '內容已生成，但尚未儲存' };
    }
  }

  async suggestItinerary(
    city: string,
    date?: string,
    preferences?: string
  ): Promise<PersistedGenerateResponse> {
    const content = await this.gemini.generate({
      prompt: itinerarySuggestionPrompt(city, date, preferences),
      temperature: 0.7,
    });
    return { success: true, content };
  }

  async generateJourneyIntro(
    itinerary: ItineraryItem[]
  ): Promise<PersistedGenerateResponse<JourneyContent>> {
    const { prompt, cities, responseSchema } = journeyPrompt(itinerary);
    const generated = await this.gemini.generate({
      prompt,
      temperature: 0.9,
      responseMimeType: 'application/json',
      responseSchema,
    });
    const content = parseJourney(generated, cities);
    try {
      await this.repository.saveJourney(content);
      return { success: true, content, persisted: true };
    } catch {
      return { success: true, content, persisted: false, message: '內容已生成，但尚未儲存' };
    }
  }

  async chatWithSecretary(
    question: string,
    history: ChatMessage[],
    useSearch = false
  ): Promise<PersistedGenerateResponse> {
    const context = await this.repository.buildTripContext();
    const answer = await this.gemini.generate({
      systemPrompt: chatSystemPrompt(context, useSearch),
      history: history.map((message) => ({
        role: message.role === 'user' ? 'user' : 'model',
        text: message.content,
      })),
      question,
      search: useSearch,
      temperature: 0.7,
      maxOutputTokens: 2048,
    });
    try {
      await this.repository.saveChat(question, answer);
      return { success: true, answer, persisted: true };
    } catch {
      return { success: true, answer, persisted: false, message: '回答已生成，但尚未儲存' };
    }
  }
}

export function parseJourney(text: string, cities: string[]): JourneyContent {
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Gemini 回傳格式無法解析');
  }

  const value = parsed as Record<string, unknown>;
  const intro = typeof value.intro === 'string' ? value.intro.trim() : '';
  const closing = typeof value.closing === 'string' ? value.closing.trim() : '';
  if (!intro || !closing || !Array.isArray(value.cities)) {
    throw new Error('Gemini 回傳格式無法解析');
  }

  const cityContent: Record<string, string> = {};
  for (const item of value.cities) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const city = item as Record<string, unknown>;
    const name = typeof city.name === 'string' ? city.name.trim() : '';
    const content = typeof city.content === 'string' ? city.content.trim() : '';
    if (cities.includes(name) && content) cityContent[name] = content;
  }

  return { intro, cities: cityContent, closing };
}
