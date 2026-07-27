import {
  cellDisplayValue,
  gridCellToHtml,
  type GridCell,
} from './richText';
import { SheetsClient } from './sheets';
import type {
  ApiResponse,
  ChatHistoryItem,
  ExpenseFormData,
  ExpenseItem,
  ItineraryFormData,
  ItineraryItem,
  JourneyContent,
  TicketItem,
  TodoItem,
} from './models';
import { ConflictError } from './models';

export const SHEET_NAMES = {
  itinerary: '行程',
  expenses: '記帳',
  todos: '待辦',
  tickets: '票券',
  attractions: '景點規劃',
  navigation: '導航',
  food: '美食推薦',
  journey: '旅程介紹',
  chat: 'AI秘書對話',
} as const;

const value = (row: unknown[], index: number): string => String(row[index] ?? '');

function cell(row: GridCell[], index: number): GridCell | undefined {
  return row[index];
}

function timestampFromCell(timestampCell: GridCell | undefined): string {
  const serial = timestampCell?.effectiveValue?.numberValue;
  return serial !== undefined
    ? new Date((serial - 25569) * 86_400_000).toISOString()
    : cellDisplayValue(timestampCell);
}

export function parseItineraryGrid(
  rows: Array<{ rowNumber: number; cells: GridCell[] }>
): ItineraryItem[] {
  return rows
    .filter(({ cells }) => cellDisplayValue(cell(cells, 0)))
    .map(({ rowNumber, cells }) => ({
      rowNumber,
      day: cellDisplayValue(cell(cells, 0)),
      date: cellDisplayValue(cell(cells, 1)),
      weekday: cellDisplayValue(cell(cells, 2)),
      city: cellDisplayValue(cell(cells, 3)),
      content: gridCellToHtml(cell(cells, 4)),
      transport: gridCellToHtml(cell(cells, 5)),
      ticket: gridCellToHtml(cell(cells, 6)),
      link: cellDisplayValue(cell(cells, 7)),
      hotel: gridCellToHtml(cell(cells, 8)),
    }));
}

export function parseTodosGrid(
  rows: Array<{ rowNumber: number; cells: GridCell[] }>
): TodoItem[] {
  let section = '未分類';
  const result: TodoItem[] = [];

  for (const { rowNumber, cells } of rows) {
    if (rowNumber === 1) continue;
    const first = cellDisplayValue(cell(cells, 0)).trim();
    const item = cellDisplayValue(cell(cells, 1)).trim();
    if (first === '【重要連結彙整】') break;
    if (first && !item) {
      section = first;
      continue;
    }
    if (!item) continue;

    const doneCell = cell(cells, 4);
    result.push({
      rowNumber,
      section,
      item: gridCellToHtml(cell(cells, 1)),
      detail: gridCellToHtml(cell(cells, 2)),
      deadline: gridCellToHtml(cell(cells, 3)),
      done:
        doneCell?.effectiveValue?.boolValue === true ||
        cellDisplayValue(doneCell).toUpperCase() === 'TRUE',
    });
  }
  return result;
}

export function parseExpensesGrid(
  rows: Array<{ rowNumber: number; cells: GridCell[] }>
): ExpenseItem[] {
  return rows
    .filter(({ cells }) => cellDisplayValue(cell(cells, 1)))
    .map(({ rowNumber, cells }) => {
      return {
        rowNumber,
        timestamp: timestampFromCell(cell(cells, 0)),
        item: cellDisplayValue(cell(cells, 1)),
        amount:
          cell(cells, 2)?.effectiveValue?.numberValue ??
          (Number(cellDisplayValue(cell(cells, 2))) || 0),
        currency: cellDisplayValue(cell(cells, 3)),
        category: cellDisplayValue(cell(cells, 4)),
      };
    })
    .reverse();
}

function generatedHtmlToText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export class TripRepository {
  constructor(private readonly sheets: SheetsClient) {}

  async getItinerary(): Promise<ItineraryItem[]> {
    return parseItineraryGrid(await this.sheets.getGrid(`${SHEET_NAMES.itinerary}!A2:I`));
  }

  async editItinerary(form: ItineraryFormData): Promise<ApiResponse> {
    if (!Number.isInteger(form.rowNumber) || form.rowNumber < 2) {
      throw new Error('無效的行號');
    }
    if (form.expectedDay) {
      const current = await this.sheets.getValues(
        `${SHEET_NAMES.itinerary}!A${form.rowNumber}:A${form.rowNumber}`
      );
      if (value(current[0] ?? [], 0) !== form.expectedDay) {
        throw new ConflictError('行程資料已變更，請重新整理');
      }
    }
    await this.sheets.updateValues(
      `${SHEET_NAMES.itinerary}!D${form.rowNumber}:H${form.rowNumber}`,
      [[form.city, form.content, form.transport, form.ticket, form.link]]
    );
    return { success: true, message: '行程已更新' };
  }

  async getTickets(): Promise<TicketItem[]> {
    const rows = await this.sheets.getValues(`${SHEET_NAMES.tickets}!A2:H`);
    return rows
      .map((row, index) => ({
        rowNumber: index + 2,
        day: value(row, 0),
        date: value(row, 1),
        city: value(row, 2),
        item: value(row, 3),
        type: value(row, 4),
        provider: value(row, 5),
        fileUrl: value(row, 6),
        notes: value(row, 7),
      }))
      .filter((ticket) => ticket.day && ticket.item && ticket.fileUrl);
  }

  async getTodos(): Promise<TodoItem[]> {
    return parseTodosGrid(await this.sheets.getGrid(`${SHEET_NAMES.todos}!A:E`));
  }

  async updateTodoStatus(
    rowNumber: number,
    done: boolean,
    expectedItem?: string
  ): Promise<ApiResponse> {
    if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error('無效的行號');
    const current = await this.sheets.getValues(
      `${SHEET_NAMES.todos}!B${rowNumber}:B${rowNumber}`
    );
    const currentItem = value(current[0] ?? [], 0);
    if (!currentItem) throw new ConflictError('找不到待辦項目');
    if (expectedItem && currentItem !== generatedHtmlToText(expectedItem)) {
      throw new ConflictError('待辦資料已變更，請重新整理');
    }
    await this.sheets.updateValues(
      `${SHEET_NAMES.todos}!E${rowNumber}:E${rowNumber}`,
      [[done]]
    );
    return { success: true, message: '待辦狀態已更新' };
  }

  async getExpenses(): Promise<ExpenseItem[]> {
    return parseExpensesGrid(
      await this.sheets.getGrid(`${SHEET_NAMES.expenses}!A2:E`)
    );
  }

  async saveExpense(form: ExpenseFormData): Promise<ApiResponse> {
    if (!form.item.trim()) throw new Error('請輸入項目名稱');
    const amount = Number(form.amount);
    if (!Number.isFinite(amount)) throw new Error('請輸入有效金額');
    await this.sheets.appendValues(`${SHEET_NAMES.expenses}!A:E`, [
      [new Date().toISOString(), form.item.trim(), amount, form.currency, form.category],
    ]);
    return { success: true, message: '記帳成功！' };
  }

  async editExpense(data: ExpenseItem): Promise<ApiResponse> {
    await this.assertExpenseIdentity(data.rowNumber, data.timestamp, data.item);
    await this.sheets.updateValues(
      `${SHEET_NAMES.expenses}!B${data.rowNumber}:E${data.rowNumber}`,
      [[data.item, Number(data.amount), data.currency, data.category]]
    );
    return { success: true, message: '修改成功' };
  }

  async deleteExpense(
    rowNumber: number,
    expected?: Pick<ExpenseItem, 'timestamp' | 'item'>
  ): Promise<ApiResponse> {
    if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error('無效的行號');
    if (expected) await this.assertExpenseIdentity(rowNumber, expected.timestamp, expected.item);
    const sheetId = await this.sheets.getSheetId(SHEET_NAMES.expenses);
    await this.sheets.deleteRow(sheetId, rowNumber);
    return { success: true, message: '已刪除' };
  }

  private async assertExpenseIdentity(
    rowNumber: number,
    expectedTimestamp: string,
    expectedItem: string
  ): Promise<void> {
    if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error('無效的行號');
    const current = await this.sheets.getGrid(
      `${SHEET_NAMES.expenses}!A${rowNumber}:B${rowNumber}`
    );
    const row = current[0]?.cells ?? [];
    const currentItem = cellDisplayValue(cell(row, 1));
    const currentTimestamp = timestampFromCell(cell(row, 0));
    if (!currentItem) throw new ConflictError('找不到花費項目');
    if (
      currentItem !== expectedItem ||
      (expectedTimestamp && currentTimestamp !== expectedTimestamp)
    ) {
      throw new ConflictError('花費資料已變更，請重新整理');
    }
  }

  async getAttractionDetails(): Promise<Record<string, { title: string; content: string }>> {
    const rows = await this.sheets.getValues(`${SHEET_NAMES.attractions}!A2:C`);
    return Object.fromEntries(
      rows
        .filter((row) => value(row, 0) && value(row, 1))
        .map((row) => [value(row, 0), { title: value(row, 1), content: value(row, 2) }])
    );
  }

  async getNavigation(): Promise<Record<string, { attractions: Array<{ name: string; query: string }> }>> {
    const rows = await this.sheets.getValues(`${SHEET_NAMES.navigation}!A2:C`);
    const result: Record<string, { attractions: Array<{ name: string; query: string }> }> = {};
    for (const row of rows) {
      const day = value(row, 0);
      const name = value(row, 1);
      const query = value(row, 2);
      if (!day || !name || !query) continue;
      result[day] ??= { attractions: [] };
      result[day].attractions.push({ name, query });
    }
    return result;
  }

  async getFoodRecommendations(): Promise<Record<string, Record<string, string>>> {
    const rows = await this.sheets.getValues(`${SHEET_NAMES.food}!A2:D`);
    const result: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      const day = value(row, 0);
      const priceLevel = value(row, 2);
      const content = value(row, 3);
      if (!day || !priceLevel || !content) continue;
      result[day] ??= {};
      result[day][priceLevel] = content;
    }
    return result;
  }

  async saveAttraction(day: string, title: string, content: string): Promise<void> {
    const rows = await this.sheets.getValues(`${SHEET_NAMES.attractions}!A2:A`);
    const index = rows.findIndex((row) => value(row, 0) === day);
    if (index >= 0) {
      const rowNumber = index + 2;
      await this.sheets.updateValues(
        `${SHEET_NAMES.attractions}!B${rowNumber}:C${rowNumber}`,
        [[title, content]]
      );
      return;
    }
    await this.sheets.appendValues(`${SHEET_NAMES.attractions}!A:C`, [[day, title, content]]);
  }

  async saveFood(day: string, city: string, priceLevel: string, content: string): Promise<void> {
    const rows = await this.sheets.getValues(`${SHEET_NAMES.food}!A2:C`);
    const index = rows.findIndex(
      (row) => value(row, 0) === day && value(row, 2) === priceLevel
    );
    const now = new Date().toISOString();
    if (index >= 0) {
      const rowNumber = index + 2;
      await this.sheets.updateValues(
        `${SHEET_NAMES.food}!B${rowNumber}:E${rowNumber}`,
        [[city, priceLevel, content, now]]
      );
      return;
    }
    await this.sheets.appendValues(
      `${SHEET_NAMES.food}!A:E`,
      [[day, city, priceLevel, content, now]]
    );
  }

  async getJourney(): Promise<JourneyContent | null> {
    const rows = await this.sheets.getValues(`${SHEET_NAMES.journey}!A2:B`);
    if (rows.length === 0) return null;
    const result: JourneyContent = { intro: '', cities: {}, closing: '' };
    for (const row of rows) {
      const type = value(row, 0);
      const content = value(row, 1);
      if (type === 'intro') result.intro = content;
      else if (type === 'closing') result.closing = content;
      else if (type.startsWith('city:')) result.cities[type.slice(5)] = content;
    }
    return result;
  }

  async saveJourney(content: JourneyContent): Promise<void> {
    const timestamp = new Date().toISOString();
    const values: unknown[][] = [];
    if (content.intro) values.push(['intro', content.intro, timestamp]);
    for (const [city, cityContent] of Object.entries(content.cities)) {
      values.push([`city:${city}`, cityContent, timestamp]);
    }
    if (content.closing) values.push(['closing', content.closing, timestamp]);

    await this.sheets.replaceRows(SHEET_NAMES.journey, 2, 3, values);
  }

  async getChatHistory(): Promise<ChatHistoryItem[]> {
    const rows = await this.sheets.getValues(`${SHEET_NAMES.chat}!A2:C`, true);
    return rows
      .map((row, index) => ({
        rowNumber: index + 2,
        timestamp: value(row, 0),
        question: value(row, 1),
        answer: value(row, 2),
      }))
      .filter((item) => item.question);
  }

  async saveChat(question: string, answer: string): Promise<void> {
    await this.sheets.appendValues(`${SHEET_NAMES.chat}!A:C`, [
      [new Date().toISOString(), question, answer],
    ]);
  }

  async deleteChat(rowNumber: number): Promise<ApiResponse> {
    if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error('無效的行號');
    const sheetId = await this.sheets.getSheetId(SHEET_NAMES.chat);
    await this.sheets.deleteRow(sheetId, rowNumber);
    return { success: true, message: '已刪除' };
  }

  async clearChat(): Promise<ApiResponse> {
    await this.sheets.clearValues(`${SHEET_NAMES.chat}!A2:C`);
    return { success: true, message: '已清除所有對話記錄' };
  }

  async buildTripContext(): Promise<string> {
    const rows = await this.sheets.getValues(`${SHEET_NAMES.itinerary}!A2:I`);
    const lines = ['這是一趟蜜月旅行的完整行程資料：\n'];
    for (const row of rows) {
      const day = value(row, 0);
      if (!day) continue;
      lines.push(`${day} (${value(row, 1)} ${value(row, 2)})`);
      const labels: Array<[string, string]> = [
        ['城市', value(row, 3)],
        ['行程', value(row, 4)],
        ['交通', value(row, 5)],
        ['票務', value(row, 6)],
        ['住宿', value(row, 8)],
      ];
      for (const [label, text] of labels) {
        if (text) lines.push(`  ${label}: ${text.replace(/<[^>]*>/g, '').slice(0, 200)}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }
}
