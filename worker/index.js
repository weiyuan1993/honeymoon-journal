const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const tokenCache = new Map();

const encoder = new TextEncoder();

const base64Url = (value) =>
  btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\n/g, '<br>');

const toArrayBuffer = (base64) => {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
};

async function getAccessToken(env) {
  const cached = tokenCache.get(env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = base64Url(encoder.encode(JSON.stringify({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: GOOGLE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })));
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    toArrayBuffer(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(`${header}.${claim}`)
  );
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${base64Url(signature)}`,
    }),
  });
  if (!response.ok) throw new Error('Google 授權失敗');

  const payload = await response.json();
  tokenCache.set(env.GOOGLE_SERVICE_ACCOUNT_EMAIL, {
    token: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  });
  return payload.access_token;
}

async function getValues(env, range) {
  if (!env.GOOGLE_SHEET_ID || !env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error('網站尚未完成 Google Sheet 連線設定');
  }
  const token = await getAccessToken(env);
  const url = new URL(`${GOOGLE_SHEETS_API}/${env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(range)}`);
  url.searchParams.set('valueRenderOption', 'FORMATTED_VALUE');
  url.searchParams.set('dateTimeRenderOption', 'FORMATTED_STRING');
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('無法讀取 Google Sheet');
  const payload = await response.json();
  return payload.values ?? [];
}

const itinerary = (rows) => rows.slice(1).filter((row) => row[0]).map((row, index) => ({
  rowNumber: index + 2,
  day: row[0] ?? '', date: row[1] ?? '', weekday: row[2] ?? '', city: row[3] ?? '',
  content: escapeHtml(row[4]), transport: escapeHtml(row[5]), ticket: escapeHtml(row[6]),
  link: row[7] ?? '', hotel: escapeHtml(row[8]),
}));

const tickets = (rows) => rows.slice(1).filter((row) => row[0] && row[3]).map((row, index) => ({
  rowNumber: index + 2,
  day: row[0] ?? '', date: row[1] ?? '', city: row[2] ?? '', item: row[3] ?? '',
  type: row[4] ?? '', provider: row[5] ?? '', fileUrl: row[6] ?? '', notes: row[7] ?? '',
}));

const expenses = (rows) => rows.slice(1).filter((row) => row[1]).map((row, index) => ({
  rowNumber: index + 2,
  timestamp: row[0] ?? '', item: row[1] ?? '', amount: Number(row[2]) || 0,
  currency: row[3] ?? 'EUR', category: row[4] ?? 'Other',
})).reverse();

const routes = {
  '/api/itinerary': async (env) => itinerary(await getValues(env, '行程!A1:I')),
  '/api/tickets': async (env) => tickets(await getValues(env, '票券!A1:H')),
  '/api/expenses': async (env) => expenses(await getValues(env, '記帳!A1:E')),
  '/api/permission': async () => ({ email: null, canEdit: false }),
  '/api/navigation': async () => ({}),
  '/api/attractions': async () => ({}),
  '/api/food': async () => ({}),
  '/api/todos': async () => [],
  '/api/journey': async () => null,
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (routes[url.pathname]) {
      if (request.method !== 'GET') return json({ message: '此版本為唯讀' }, 405);
      try {
        return json(await routes[url.pathname](env));
      } catch (error) {
        return json({ message: error instanceof Error ? error.message : '讀取資料失敗' }, 502);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
