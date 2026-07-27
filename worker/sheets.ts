import { getGoogleAccessToken, type GoogleServiceAccountEnv } from './googleServiceAccount';
import { fetchWithRetry } from './retry';
import type { GridCell } from './richText';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SheetsEnv extends GoogleServiceAccountEnv {
  GOOGLE_SHEET_ID: string;
}

interface ValueRangeResponse {
  values?: unknown[][];
}

interface GridResponse {
  sheets?: Array<{
    data?: Array<{
      startRow?: number;
      rowData?: Array<{ values?: GridCell[] }>;
    }>;
  }>;
}

export class SheetsError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable = status === 429 || status >= 500
  ) {
    super(message);
  }
}

export class SheetsClient {
  constructor(private readonly env: SheetsEnv) {}

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const accessToken = await getGoogleAccessToken(this.env);
    const response = await fetchWithRetry(`${SHEETS_API}/${this.env.GOOGLE_SHEET_ID}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        ...init?.headers,
      },
    });
    if (!response.ok) {
      throw new SheetsError(`Google Sheets request failed (${response.status})`, response.status);
    }
    return response;
  }

  async getValues(range: string, formatted = true): Promise<unknown[][]> {
    const query = new URLSearchParams({
      valueRenderOption: formatted ? 'FORMATTED_VALUE' : 'UNFORMATTED_VALUE',
      dateTimeRenderOption: formatted ? 'FORMATTED_STRING' : 'SERIAL_NUMBER',
    });
    const response = await this.request(`/values/${encodeURIComponent(range)}?${query}`);
    return ((await response.json()) as ValueRangeResponse).values ?? [];
  }

  async batchGetValues(ranges: string[], formatted = true): Promise<unknown[][][]> {
    const query = new URLSearchParams({
      valueRenderOption: formatted ? 'FORMATTED_VALUE' : 'UNFORMATTED_VALUE',
      dateTimeRenderOption: formatted ? 'FORMATTED_STRING' : 'SERIAL_NUMBER',
    });
    for (const range of ranges) query.append('ranges', range);
    const response = await this.request(`/values:batchGet?${query}`);
    const payload = await response.json() as { valueRanges?: ValueRangeResponse[] };
    return (payload.valueRanges ?? []).map((valueRange) => valueRange.values ?? []);
  }

  async getGrid(range: string): Promise<Array<{ rowNumber: number; cells: GridCell[] }>> {
    const query = new URLSearchParams();
    query.append('ranges', range);
    query.set('includeGridData', 'true');
    query.set(
      'fields',
      'sheets(data(startRow,rowData(values(formattedValue,effectiveValue,hyperlink,textFormatRuns))))'
    );
    const response = await this.request(`?${query}`);
    const payload = await response.json() as GridResponse;
    const result: Array<{ rowNumber: number; cells: GridCell[] }> = [];
    for (const sheet of payload.sheets ?? []) {
      for (const block of sheet.data ?? []) {
        const startRow = block.startRow ?? 0;
        (block.rowData ?? []).forEach((row, index) => {
          result.push({ rowNumber: startRow + index + 1, cells: row.values ?? [] });
        });
      }
    }
    return result;
  }

  async updateValues(range: string, values: unknown[][]): Promise<void> {
    const query = new URLSearchParams({ valueInputOption: 'USER_ENTERED' });
    await this.request(`/values/${encodeURIComponent(range)}?${query}`, {
      method: 'PUT',
      body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
    });
  }

  async appendValues(range: string, values: unknown[][]): Promise<void> {
    const query = new URLSearchParams({
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
    });
    await this.request(`/values/${encodeURIComponent(range)}:append?${query}`, {
      method: 'POST',
      body: JSON.stringify({ majorDimension: 'ROWS', values }),
    });
  }

  async clearValues(range: string): Promise<void> {
    await this.request(`/values/${encodeURIComponent(range)}:clear`, {
      method: 'POST',
      body: '{}',
    });
  }

  async deleteRow(sheetId: number, rowNumber: number): Promise<void> {
    await this.request(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        }],
      }),
    });
  }

  async getSheetId(title: string): Promise<number> {
    const response = await this.request(
      `?${new URLSearchParams({ fields: 'sheets.properties(sheetId,title)' })}`
    );
    const payload = await response.json() as {
      sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
    };
    const sheet = payload.sheets?.find((candidate) => candidate.properties?.title === title);
    const sheetId = sheet?.properties?.sheetId;
    if (sheetId === undefined) throw new SheetsError(`Sheet not found: ${title}`, 404, false);
    return sheetId;
  }

  async replaceRows(
    sheetTitle: string,
    startRowNumber: number,
    columnCount: number,
    values: unknown[][]
  ): Promise<void> {
    const sheetId = await this.getSheetId(sheetTitle);
    const toExtendedValue = (entry: unknown) => {
      if (typeof entry === 'boolean') return { boolValue: entry };
      if (typeof entry === 'number') return { numberValue: entry };
      return { stringValue: String(entry ?? '') };
    };
    const requests: unknown[] = [{
      updateCells: {
        range: {
          sheetId,
          startRowIndex: startRowNumber - 1,
          startColumnIndex: 0,
          endColumnIndex: columnCount,
        },
        fields: 'userEnteredValue',
      },
    }];
    if (values.length > 0) {
      requests.push({
        updateCells: {
          start: {
            sheetId,
            rowIndex: startRowNumber - 1,
            columnIndex: 0,
          },
          rows: values.map((row) => ({
            values: row.map((entry) => ({ userEnteredValue: toExtendedValue(entry) })),
          })),
          fields: 'userEnteredValue',
        },
      });
    }
    await this.request(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }
}
