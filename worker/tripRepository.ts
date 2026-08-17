import {
  cellDisplayValue,
  gridCellToHtml,
  safeUrl,
  type GridCell,
} from './richText';
import { todoLinkLabelFromUrl } from '../shared/todoLinkLabel';
import { SheetsClient } from './sheets';
import type {
  ApiResponse,
  ChatHistoryItem,
  ExpenseFormData,
  ExpenseItem,
  ExpenseOverviewCategory,
  ExpenseOverviewData,
  ItineraryFormData,
  ItineraryItem,
  JourneyContent,
  LinkTarget,
  ReferenceLink,
  TicketItem,
  TodoItem,
} from './models';
import { ConflictError } from './models';

export const SHEET_NAMES = {
  itinerary: '行程',
  expenses: '記帳',
  expensePlan: '費用',
  todos: '待辦',
  tickets: '票券',
  attractions: '景點規劃',
  navigation: '導航',
  food: '美食推薦',
  journey: '旅程介紹',
  references: '參考資料',
  chat: 'AI秘書對話',
} as const;

const value = (row: unknown[], index: number): string => String(row[index] ?? '');
const EXPENSE_SHEET_TIME_ZONE_OFFSET_MS = 8 * 60 * 60 * 1000;

function cell(row: GridCell[], index: number): GridCell | undefined {
  return row[index];
}

const RAW_URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_URL_PUNCTUATION = /[),.;:!?，。；：、】【）\]]+$/u;

function cleanLinkLabel(value: string): string {
  return value
    .replace(RAW_URL_PATTERN, '')
    .replace(/^[\s:：\-–—|]+|[\s:：\-–—|]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function addLink(
  links: LinkTarget[],
  seenUrls: Set<string>,
  value: string | undefined,
  label: string,
  trimTrailingPunctuation = false
): void {
  const url = safeUrl(
    trimTrailingPunctuation ? value?.replace(TRAILING_URL_PUNCTUATION, '') : value
  );
  if (!url || seenUrls.has(url)) return;

  seenUrls.add(url);
  links.push({
    label:
      cleanLinkLabel(label) ||
      todoLinkLabelFromUrl(url) ||
      `連結 ${links.length + 1}`,
    url,
  });
}

function sheetLinks(cell: GridCell | undefined): LinkTarget[] {
  if (!cell) return [];

  const text = cellDisplayValue(cell);
  const links: LinkTarget[] = [];
  const seenUrls = new Set<string>();
  addLink(links, seenUrls, cell.hyperlink, text);

  const runs = (cell.textFormatRuns ?? [])
    .map((run, index) => ({
      ...run,
      startIndex: run.startIndex ?? (index === 0 ? 0 : undefined),
    }))
    .filter((run) => Number.isInteger(run.startIndex) && (run.startIndex ?? -1) >= 0)
    .sort((left, right) => (left.startIndex ?? 0) - (right.startIndex ?? 0));
  runs.forEach((run, index) => {
    const start = run.startIndex ?? 0;
    const end = runs[index + 1]?.startIndex ?? text.length;
    addLink(links, seenUrls, run.format?.link?.uri, text.slice(start, end));
  });

  text.split(/\r?\n/).forEach((line) => {
    for (const match of line.matchAll(RAW_URL_PATTERN)) {
      addLink(links, seenUrls, match[0], line, true);
    }
  });

  return links;
}

interface TodoSchema {
  deadlineColumn?: number;
  doneColumn: number;
  linkColumn: number;
}

function normalizedTodoHeader(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

function findTodoColumn(headers: string[], names: string[]): number {
  return headers.findIndex((header) =>
    names.some((name) => header === name || header.startsWith(name))
  );
}

function todoSchema(headers: string[]): TodoSchema {
  const normalizedHeaders = headers.map(normalizedTodoHeader);
  const deadlineColumn = findTodoColumn(normalizedHeaders, ['截止建議', 'deadline']);
  const doneColumn = findTodoColumn(normalizedHeaders, ['狀態', '完成', 'done', 'status']);
  const linkColumn = findTodoColumn(normalizedHeaders, ['連結', 'links', 'link']);

  return {
    deadlineColumn: deadlineColumn >= 0 ? deadlineColumn : undefined,
    // Older sheets may still use the legacy D=deadline / E=status / F=link layout.
    doneColumn: doneColumn >= 0 ? doneColumn : 4,
    linkColumn: linkColumn >= 0 ? linkColumn : 5,
  };
}

function todoDetail(detailCell: GridCell | undefined, deadlineCell: GridCell | undefined): string {
  const detail = gridCellToHtml(detailCell);
  const deadline = gridCellToHtml(deadlineCell);
  return deadline
    ? [detail, `期限／狀態：${deadline}`].filter(Boolean).join('<br>')
    : detail;
}

function sheetColumnName(index: number): string {
  let name = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function timestampFromCell(timestampCell: GridCell | undefined): string {
  const serial = timestampCell?.effectiveValue?.numberValue;
  return serial !== undefined
    ? new Date(
        (serial - 25569) * 86_400_000 - EXPENSE_SHEET_TIME_ZONE_OFFSET_MS
      ).toISOString()
    : cellDisplayValue(timestampCell);
}

export function parseItineraryGrid(
  rows: Array<{ rowNumber: number; cells: GridCell[] }>
): ItineraryItem[] {
  return rows
    .filter(({ cells }) => cellDisplayValue(cell(cells, 0)))
    .map(({ rowNumber, cells }) => {
      const referenceLinkCell = cell(cells, 7);
      return {
        rowNumber,
        day: cellDisplayValue(cell(cells, 0)),
        date: cellDisplayValue(cell(cells, 1)),
        weekday: cellDisplayValue(cell(cells, 2)),
        city: cellDisplayValue(cell(cells, 3)),
        content: gridCellToHtml(cell(cells, 4)),
        transport: gridCellToHtml(cell(cells, 5)),
        ticket: gridCellToHtml(cell(cells, 6)),
        link: cellDisplayValue(referenceLinkCell),
        referenceLinks: sheetLinks(referenceLinkCell),
        hotel: gridCellToHtml(cell(cells, 8)),
      };
    });
}

export function parseTodosGrid(
  rows: Array<{ rowNumber: number; cells: GridCell[] }>
): TodoItem[] {
  let section = '未分類';
  const result: TodoItem[] = [];
  const headers = rows.find(({ rowNumber }) => rowNumber === 1)?.cells ?? [];
  const schema = todoSchema(headers.map(cellDisplayValue));

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

    const doneCell = cell(cells, schema.doneColumn);
    const linkCell = cell(cells, schema.linkColumn);
    result.push({
      rowNumber,
      section,
      item: gridCellToHtml(cell(cells, 1)),
      detail: todoDetail(cell(cells, 2), cell(cells, schema.deadlineColumn ?? -1)),
      links: sheetLinks(linkCell),
      done:
        doneCell?.effectiveValue?.boolValue === true ||
        cellDisplayValue(doneCell).toUpperCase() === 'TRUE',
    });
  }
  return result;
}

export function parseExpensesGrid(
  rows: Array<{ rowNumber: number; cells: GridCell[] }>,
  options: { strictAmounts?: boolean } = {}
): ExpenseItem[] {
  return rows
    .filter(({ cells }) => cellDisplayValue(cell(cells, 1)))
    .map(({ rowNumber, cells }) => {
      const amountCell = cell(cells, 2);
      const effectiveAmount = amountCell?.effectiveValue?.numberValue;
      const displayAmount = cellDisplayValue(amountCell);
      return {
        rowNumber,
        timestamp: timestampFromCell(cell(cells, 0)),
        item: cellDisplayValue(cell(cells, 1)),
        amount:
          effectiveAmount ??
          (options.strictAmounts
            ? displayAmount.trim()
              ? Number(displayAmount)
              : Number.NaN
            : Number(displayAmount) || 0),
        currency: cellDisplayValue(cell(cells, 3)),
        category: cellDisplayValue(cell(cells, 4)),
      };
    })
    .reverse();
}

interface ParsedExpensePlan {
  ratesTwdPerUnit: Record<string, number | null>;
  categories: ExpenseOverviewCategory[];
  projectedTwd: number | null;
  paidTwd: number | null;
  unpaidTwd: number | null;
  warnings: string[];
  unconvertedCurrencies: string[];
  isComplete: boolean;
}

const EXPENSE_PLAN_CATEGORY_ROWS = [
  { row: 4, category: '住宿' },
  { row: 5, category: '交通' },
  { row: 6, category: '交通', expectedCategory: '簽證' },
  { row: 7, category: '交通' },
  { row: 8, category: '交通' },
  { row: 9, category: '門票' },
  { row: 10, category: '門票' },
  { row: 11, category: '門票' },
  { row: 12, category: '門票' },
  { row: 13, category: '飲食' },
] as const;

const EXPENSE_PLAN_PAID_ROWS = [
  {
    category: '住宿',
    rows: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    itemColumn: 5,
    amountColumn: 11,
    paidColumn: 12,
    multiplier: 1,
  },
  {
    category: '交通',
    rows: [18],
    itemColumn: 5,
    amountColumn: 6,
    paidColumn: 7,
    multiplier: 2,
  },
  {
    category: '交通',
    rows: [
      17, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
      32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
    ],
    itemColumn: 5,
    amountColumn: 6,
    paidColumn: 7,
    multiplier: 2,
  },
  {
    category: '門票',
    rows: [
      5, 6, 9, 10, 11, 12, 15, 16, 17, 18,
      19, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    ],
    itemColumn: 15,
    amountColumn: 16,
    paidColumn: 17,
    multiplier: 2,
  },
  {
    category: '飲食',
    rows: [17, 18, 19],
    itemColumn: 9,
    amountColumn: 12,
    paidColumn: 13,
    multiplier: 2,
  },
] as const;

const EXPENSE_PLAN_ANCHORS = [
  { row: 3, column: 0, text: '費用估算' },
  { row: 3, column: 2, text: '費用 EUR' },
  { row: 3, column: 5, text: '城市' },
  { row: 3, column: 12, text: '已付款' },
  { row: 3, column: 15, text: '景點門票' },
  { row: 3, column: 17, text: '已付款' },
  { row: 16, column: 5, text: '交通' },
  { row: 16, column: 7, text: '已付款' },
  { row: 16, column: 9, text: '飲食' },
  { row: 16, column: 13, text: '已付款' },
  { row: 23, column: 0, text: '貨幣' },
  { row: 23, column: 1, text: '兌台幣匯率' },
] as const;

const roundMoney = (amount: number): number =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

function numericCell(cellValue: GridCell | undefined): number | null {
  const effective = cellValue?.effectiveValue?.numberValue;
  if (effective !== undefined) return Number.isFinite(effective) ? effective : null;
  const display = cellDisplayValue(cellValue)
    .replace(/[^\d.,+\-]/g, '')
    .replace(/,/g, '');
  if (!display) return null;
  const parsed = Number(display);
  return Number.isFinite(parsed) ? parsed : null;
}

function paidCell(cellValue: GridCell | undefined): boolean | null {
  const effective = cellValue?.effectiveValue?.boolValue;
  if (effective !== undefined) return effective;
  const display = cellDisplayValue(cellValue).trim().toUpperCase();
  if (display === 'TRUE') return true;
  if (display === 'FALSE') return false;
  return null;
}

function isExpensePlanHeadingOrSummaryRow(
  item: string,
  amount: number | null,
  paid: boolean | null
): boolean {
  return (
    Boolean(item) &&
    (/(?:小計|總計)$/.test(item) || (amount === null && paid === null))
  );
}

export function parseExpensePlanGrid(
  rows: Array<{ rowNumber: number; cells: GridCell[] }>
): ParsedExpensePlan {
  const rowsByNumber = new Map(rows.map((row) => [row.rowNumber, row.cells]));
  const planCell = (row: number, column: number) =>
    cell(rowsByNumber.get(row) ?? [], column);

  for (const anchor of EXPENSE_PLAN_ANCHORS) {
    const actual = cellDisplayValue(planCell(anchor.row, anchor.column));
    if (!actual.includes(anchor.text)) {
      throw new Error(
        `費用版面不符預期：${anchor.row} 列第 ${anchor.column + 1} 欄缺少「${anchor.text}」`
      );
    }
  }

  const warnings: string[] = [];
  const invalidCurrencies = new Set<string>();
  const ratesTwdPerUnit: Record<string, number | null> = { TWD: 1 };
  for (const [row, expectedCurrency] of [
    [24, 'CHF'],
    [25, 'EUR'],
    [26, 'GBP'],
  ] as const) {
    const actualCurrency = cellDisplayValue(planCell(row, 0)).trim().toUpperCase();
    if (actualCurrency !== expectedCurrency) {
      throw new Error(
        `費用版面不符預期：${row} 列匯率幣別應為 ${expectedCurrency}`
      );
    }
    const rate = numericCell(planCell(row, 1));
    if (rate === null || rate <= 0) {
      ratesTwdPerUnit[expectedCurrency] = null;
      invalidCurrencies.add(expectedCurrency);
      warnings.push(`${expectedCurrency} 匯率無效，無法換算台幣`);
    } else {
      ratesTwdPerUnit[expectedCurrency] = rate;
    }
  }

  const categoryAmounts = new Map<string, number>();
  let isComplete = invalidCurrencies.size === 0;
  for (const definition of EXPENSE_PLAN_CATEGORY_ROWS) {
    const actualCategory = cellDisplayValue(planCell(definition.row, 0)).trim();
    const expectedCategory =
      'expectedCategory' in definition
        ? definition.expectedCategory
        : definition.category;
    if (actualCategory !== expectedCategory) {
      throw new Error(
        `費用版面不符預期：${definition.row} 列分類應為 ${expectedCategory}`
      );
    }
    const amount = numericCell(planCell(definition.row, 2));
    if (amount === null) {
      throw new Error(
        `費用版面不符預期：${definition.row} 列缺少有效的費用金額`
      );
    }
    categoryAmounts.set(
      definition.category,
      (categoryAmounts.get(definition.category) ?? 0) + amount * 2
    );
  }

  const paidAmounts = new Map<string, number>();
  for (const section of EXPENSE_PLAN_PAID_ROWS) {
    for (const row of section.rows) {
      const item = cellDisplayValue(planCell(row, section.itemColumn)).trim();
      const amount = numericCell(planCell(row, section.amountColumn));
      const paid = paidCell(planCell(row, section.paidColumn));
      if (isExpensePlanHeadingOrSummaryRow(item, amount, paid)) continue;
      if (!item || amount === null) {
        warnings.push(`${section.category}第 ${row} 列缺少可判讀的付款明細`);
        isComplete = false;
        continue;
      }
      if (paid === null) {
        warnings.push(`${section.category}第 ${row} 列未設定已付款，暫列為未付款`);
        isComplete = false;
        continue;
      }
      if (paid) {
        paidAmounts.set(
          section.category,
          (paidAmounts.get(section.category) ?? 0) + amount * section.multiplier
        );
      }
    }
  }
  const eurRate = ratesTwdPerUnit.EUR;
  const categoryOrder = [
    ...new Set(EXPENSE_PLAN_CATEGORY_ROWS.map(({ category }) => category)),
  ];
  const categories = categoryOrder.map((category): ExpenseOverviewCategory => {
    const amount = categoryAmounts.get(category) ?? 0;
    const paidAmount = paidAmounts.get(category) ?? 0;
    const roundedAmount = roundMoney(amount);
    const roundedPaidAmount = roundMoney(paidAmount);
    const roundedUnpaidAmount = roundMoney(
      roundedAmount - roundedPaidAmount
    );
    const amountTwd =
      eurRate === null ? null : roundMoney(amount * eurRate);
    const paidAmountTwd =
      eurRate === null ? null : roundMoney(paidAmount * eurRate);
    if (paidAmount - amount > 0.01) {
      warnings.push(`${category}已付款金額高於分類總額，請檢查費用表`);
      isComplete = false;
    }
    return {
      category,
      currency: 'EUR',
      amount: roundedAmount,
      paidAmount: roundedPaidAmount,
      unpaidAmount: roundedUnpaidAmount,
      amountTwd,
      paidAmountTwd,
      unpaidAmountTwd:
        amountTwd === null || paidAmountTwd === null
          ? null
          : roundMoney(amountTwd - paidAmountTwd),
    };
  });

  const projected = [...categoryAmounts.values()].reduce(
    (sum, amount) => sum + amount,
    0
  );
  const paid = [...paidAmounts.values()].reduce(
    (sum, amount) => sum + amount,
    0
  );
  const unpaid = projected - paid;
  if (Math.abs(projected - paid - unpaid) > 0.01) {
    warnings.push('費用預計、已付款與未付款金額無法對帳');
    isComplete = false;
  }
  const projectedTwd =
    eurRate === null ? null : roundMoney(projected * eurRate);
  const paidTwd = eurRate === null ? null : roundMoney(paid * eurRate);

  return {
    ratesTwdPerUnit,
    categories,
    projectedTwd,
    paidTwd,
    unpaidTwd:
      projectedTwd === null || paidTwd === null
        ? null
        : roundMoney(projectedTwd - paidTwd),
    warnings,
    unconvertedCurrencies: [...invalidCurrencies].sort(),
    isComplete,
  };
}

function addAmounts(left: number | null, right: number | null): number | null {
  return left === null || right === null ? null : roundMoney(left + right);
}

export function buildExpenseOverview(
  plan: ParsedExpensePlan,
  expenses: ExpenseItem[],
  fetchedAt = new Date().toISOString()
): ExpenseOverviewData {
  const ledgerAmounts = new Map<string, number>();
  const warnings = [...plan.warnings];
  let isComplete = plan.isComplete;
  for (const expense of expenses) {
    const currency = expense.currency.trim().toUpperCase();
    if (!currency || !Number.isFinite(expense.amount)) {
      warnings.push(`記帳第 ${expense.rowNumber} 列的幣別或金額無效`);
      isComplete = false;
      continue;
    }
    ledgerAmounts.set(currency, (ledgerAmounts.get(currency) ?? 0) + expense.amount);
  }

  const unconvertedCurrencies = new Set(plan.unconvertedCurrencies);
  const ledgerByCurrency = [...ledgerAmounts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => {
      const rate = plan.ratesTwdPerUnit[currency] ?? null;
      if (rate === null || rate <= 0) {
        unconvertedCurrencies.add(currency);
        warnings.push(`${currency} 沒有有效匯率，記帳金額無法換算台幣`);
        isComplete = false;
      }
      return {
        currency,
        amount: roundMoney(amount),
        amountTwd: rate === null || rate <= 0 ? null : roundMoney(amount * rate),
      };
    });

  const ledgerTwd = ledgerByCurrency.every(({ amountTwd }) => amountTwd !== null)
    ? roundMoney(
        ledgerByCurrency.reduce((sum, { amountTwd }) => sum + (amountTwd ?? 0), 0)
      )
    : null;
  const projectedTwd = addAmounts(plan.projectedTwd, ledgerTwd);
  const paidTwd = addAmounts(plan.paidTwd, ledgerTwd);
  const unpaidTwd = plan.unpaidTwd;
  if (
    projectedTwd !== null &&
    paidTwd !== null &&
    unpaidTwd !== null &&
    Math.abs(projectedTwd - paidTwd - unpaidTwd) > 0.01
  ) {
    warnings.push('總預計、總支出與待付款金額無法對帳');
    isComplete = false;
  }

  return {
    fetchedAt,
    ratesTwdPerUnit: plan.ratesTwdPerUnit,
    categories: plan.categories,
    ledgerByCurrency,
    components: {
      budgetProjectedTwd: plan.projectedTwd,
      budgetPaidTwd: plan.paidTwd,
      budgetUnpaidTwd: plan.unpaidTwd,
      ledgerTwd,
    },
    totals: { projectedTwd, paidTwd, unpaidTwd },
    warnings: [...new Set(warnings)],
    unconvertedCurrencies: [...unconvertedCurrencies].sort(),
    isComplete: isComplete && unconvertedCurrencies.size === 0,
  };
}

export function parseReferenceLinks(rows: unknown[][]): ReferenceLink[] {
  let category = '其他';
  const seenUrls = new Set<string>();
  const links: ReferenceLink[] = [];

  for (const [rowIndex, row] of rows.entries()) {
    const entries = row.map((entry) => String(entry ?? '').trim());
    const first = entries[0] ?? '';
    const nextRow = rows[rowIndex + 1] ?? [];
    const nextRowStartsLinkTable =
      String(nextRow[0] ?? '').trim() === '項目' &&
      String(nextRow[1] ?? '').trim() === '連結';
    if (
      first &&
      !safeUrl(first) &&
      entries.slice(1).every((entry) => !entry) &&
      nextRowStartsLinkTable
    ) {
      category = first;
      continue;
    }

    for (let urlIndex = 1; urlIndex < entries.length; urlIndex += 1) {
      const label = entries[urlIndex - 1];
      const url = entries[urlIndex];
      if (!label || !safeUrl(url) || seenUrls.has(url)) continue;
      const noteCandidate = entries[urlIndex + 1];
      const nextValueIsAnotherLabel =
        Boolean(noteCandidate) && safeUrl(entries[urlIndex + 2]);
      const note =
        noteCandidate && !safeUrl(noteCandidate) && !nextValueIsAnotherLabel
          ? noteCandidate
          : undefined;
      links.push(note ? { category, label, url, note } : { category, label, url });
      seenUrls.add(url);
    }
  }

  return links;
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
    return parseTodosGrid(await this.sheets.getGrid(`${SHEET_NAMES.todos}!A:F`));
  }

  async getReferenceLinks(): Promise<ReferenceLink[]> {
    return parseReferenceLinks(
      await this.sheets.getValues(`${SHEET_NAMES.references}!A:H`)
    );
  }

  async updateTodoStatus(
    rowNumber: number,
    done: boolean,
    expectedItem?: string
  ): Promise<ApiResponse> {
    if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error('無效的行號');
    const [headerRows, currentRows] = await this.sheets.batchGetValues([
      `${SHEET_NAMES.todos}!A1:F1`,
      `${SHEET_NAMES.todos}!B${rowNumber}:B${rowNumber}`,
    ]);
    const [headers] = headerRows ?? [];
    const schema = todoSchema((headers ?? []).map((header) => String(header ?? '')));
    const currentItem = value(currentRows?.[0] ?? [], 0);
    if (!currentItem) throw new ConflictError('找不到待辦項目');
    if (expectedItem && currentItem !== generatedHtmlToText(expectedItem)) {
      throw new ConflictError('待辦資料已變更，請重新整理');
    }
    const doneColumn = sheetColumnName(schema.doneColumn);
    await this.sheets.updateValues(
      `${SHEET_NAMES.todos}!${doneColumn}${rowNumber}:${doneColumn}${rowNumber}`,
      [[done]]
    );
    return { success: true, message: '待辦狀態已更新' };
  }

  async getExpenses(): Promise<ExpenseItem[]> {
    return parseExpensesGrid(
      await this.sheets.getGrid(`${SHEET_NAMES.expenses}!A2:E`)
    );
  }

  async getExpenseOverview(): Promise<ExpenseOverviewData> {
    const [planRows, expenseRows] = await Promise.all([
      this.sheets.getGrid(`${SHEET_NAMES.expensePlan}!A3:R42`),
      this.sheets.getGrid(`${SHEET_NAMES.expenses}!A2:E`),
    ]);
    return buildExpenseOverview(
      parseExpensePlanGrid(planRows),
      parseExpensesGrid(expenseRows, { strictAmounts: true })
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
