import {
  authenticateGoogleCredential,
  buildExpiredSessionCookie,
  readSession,
} from './auth';
import type { AuthBindings, SessionClaims } from './contracts';
import { GeminiClient, GeminiError, type GeminiEnv } from './gemini';
import {
  ApiError,
  errorResponse,
  getRequestId,
  jsonResponse,
  privateJsonResponse,
} from './http';
import type {
  ExpenseFormData,
  ExpenseItem,
  ItineraryFormData,
  ItineraryItem,
} from './models';
import {
  assertSameOriginMutation,
  isAuthorizedEditor,
  requireEditor,
} from './policy';
import { SheetsClient, SheetsError, type SheetsEnv } from './sheets';
import { TripRepository } from './tripRepository';
import { TripService } from './tripService';
import {
  API_OPERATIONS,
  isApiOperation,
  type ApiOperation,
} from '../shared/apiOperations';

interface WorkerEnv extends AuthBindings, SheetsEnv, GeminiEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  APP_ENV?: string;
  PREVIEW_READ_ONLY?: string;
  GOOGLE_TICKET_FOLDER_URL?: string;
}

const PUBLIC_CACHE_SECONDS = 45;

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const requestId = getRequestId(request);
    try {
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
      if (url.pathname === '/api/auth/config') {
        return jsonResponse({
          clientId: env.GOOGLE_CLIENT_ID || null,
          enabled: Boolean(env.GOOGLE_CLIENT_ID),
        });
      }
      if (url.pathname === '/api/auth/session') {
        if (request.method === 'DELETE') {
          assertSameOriginMutation(request, env.APP_ORIGIN);
          return privateJsonResponse(publicPermission(), {
            headers: { 'set-cookie': buildExpiredSessionCookie() },
          });
        }
        if (request.method !== 'GET') throw methodNotAllowed();
        return privateJsonResponse(permissionFor(await readSession(request, env.SESSION_SECRET), env));
      }
      if (url.pathname === '/api/auth/google') {
        if (request.method !== 'POST') throw methodNotAllowed();
        assertSameOriginMutation(request, env.APP_ORIGIN);
        const body = await readJson<{ credential?: string }>(request);
        if (!body.credential) throw new ApiError(400, 'INVALID_REQUEST', 'Google credential is required.');
        const authenticated = await authenticateGoogleCredential(body.credential, env);
        return privateJsonResponse(permissionFor({
          ...authenticated.identity,
          version: 1,
          issuedAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
        }, env), {
          headers: { 'set-cookie': authenticated.cookie },
        });
      }
      if (url.pathname.startsWith('/api/rpc/')) {
        return await handleRpc(
          request,
          env,
          decodeURIComponent(url.pathname.slice('/api/rpc/'.length))
        );
      }
      throw new ApiError(404, 'NOT_FOUND', 'API route not found.');
    } catch (error) {
      return errorResponse(normalizeError(error), requestId);
    }
  },
};

async function handleRpc(
  request: Request,
  env: WorkerEnv,
  operation: string
): Promise<Response> {
  if (!isApiOperation(operation)) {
    throw new ApiError(404, 'UNKNOWN_OPERATION', 'Unknown API operation.');
  }
  const route = API_OPERATIONS[operation];
  if (request.method !== route.method) throw methodNotAllowed();

  const session = await readSession(request, env.SESSION_SECRET);
  if (route.capability !== 'public:read') {
    const editor = requireEditor(session);
    if (!isAuthorizedEditor(editor.email, env.AUTHORIZED_EDITOR_EMAILS)) {
      throw new ApiError(403, 'EDITOR_NOT_AUTHORIZED', 'This account no longer has editor access.');
    }
  }
  if (route.method === 'POST') assertSameOriginMutation(request, env.APP_ORIGIN);
  if (
    env.PREVIEW_READ_ONLY === 'true' &&
    (route.capability === 'private:write' || route.capability === 'private:ai')
  ) {
    throw new ApiError(
      503,
      'PREVIEW_READ_ONLY',
      'This preview is read-only until a staging spreadsheet is configured.'
    );
  }

  const cacheKey = new Request(request.url, { method: 'GET' });
  const publicCache = await caches.open('honeymoon-public-v1');
  if (route.capability === 'public:read') {
    const cached = await publicCache.match(cacheKey);
    if (cached) return cached;
  }

  const args = request.method === 'POST'
    ? (await readJson<{ args?: unknown[] }>(request)).args ?? []
    : [];
  const repository = new TripRepository(new SheetsClient(env));
  const service = new TripService(repository, new GeminiClient(env));
  const result = await executeOperation(service, operation, args);

  if (route.capability === 'public:read') {
    const response = jsonResponse(result, {
      headers: { 'cache-control': `public, max-age=0, s-maxage=${PUBLIC_CACHE_SECONDS}` },
    });
    await publicCache.put(cacheKey, response.clone());
    return response;
  }

  if (route.capability === 'private:write' || route.capability === 'private:ai') {
    await invalidatePublicCache(new URL(request.url).origin);
  }
  return privateJsonResponse(result);
}

async function executeOperation(
  service: TripService,
  operation: ApiOperation,
  args: unknown[]
): Promise<unknown> {
  switch (operation) {
    case 'getItineraryData': return service.getItineraryData();
    case 'editItinerary': return service.editItinerary(requireObject<ItineraryFormData>(args[0]));
    case 'getTicketData': return service.getTicketData();
    case 'getTodoData': return service.getTodoData();
    case 'updateTodoStatus':
      return service.updateTodoStatus(requireNumber(args[0]), Boolean(args[1]), optionalString(args[2]));
    case 'getExpenseData': return service.getExpenseData();
    case 'saveExpense': return service.saveExpense(requireObject<ExpenseFormData>(args[0]));
    case 'editExpense': return service.editExpense(requireObject<ExpenseItem>(args[0]));
    case 'deleteExpense':
      return service.deleteExpense(
        requireNumber(args[0]),
        args[1] ? requireObject<Pick<ExpenseItem, 'timestamp' | 'item'>>(args[1]) : undefined
      );
    case 'getNavigationData': return service.getNavigationData();
    case 'getAttractionDetails': return service.getAttractionDetails();
    case 'getFoodRecommendations': return service.getFoodRecommendations();
    case 'generateAttractionStory':
      return service.generateAttractionStory(
        requireString(args[0]),
        requireString(args[1]),
        requireString(args[2])
      );
    case 'generateFoodRecommendations':
      return service.generateFoodRecommendations(
        requireString(args[0]),
        requireString(args[1]),
        requireString(args[2]),
        requireString(args[3])
      );
    case 'suggestItinerary':
      return service.suggestItinerary(
        requireString(args[0]),
        optionalString(args[1]),
        optionalString(args[2])
      );
    case 'getJourneyContent': return service.getJourneyContent();
    case 'generateJourneyIntro':
      return service.generateJourneyIntro(requireArray<ItineraryItem>(args[0]));
    case 'chatWithSecretary':
      return service.chatWithSecretary(
        requireString(args[0]),
        requireArray(args[1]),
        Boolean(args[2])
      );
    case 'getChatHistory': return service.getChatHistory();
    case 'deleteChatHistory': return service.deleteChatHistory(requireNumber(args[0]));
    case 'clearChatHistory': return service.clearChatHistory();
    default: throw new ApiError(404, 'UNKNOWN_OPERATION', 'Unknown API operation.');
  }
}

function permissionFor(session: SessionClaims | null, env: WorkerEnv) {
  if (
    !session ||
    !isAuthorizedEditor(session.email, env.AUTHORIZED_EDITOR_EMAILS)
  ) {
    return publicPermission();
  }
  return {
    email: session.email,
    canEdit: true,
    privateLinks: {
      googleSheet: `https://docs.google.com/spreadsheets/d/${encodeURIComponent(env.GOOGLE_SHEET_ID)}/edit`,
      ticketFolder: env.GOOGLE_TICKET_FOLDER_URL || '',
    },
  };
}

function publicPermission() {
  return { email: null, canEdit: false };
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}

function requireString(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError(400, 'INVALID_REQUEST', 'Expected a string value.');
  return value;
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : requireString(value);
}

function requireNumber(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new ApiError(400, 'INVALID_REQUEST', 'Expected a number value.');
  return number;
}

function requireObject<T>(value: unknown): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'INVALID_REQUEST', 'Expected an object value.');
  }
  return value as T;
}

function requireArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) throw new ApiError(400, 'INVALID_REQUEST', 'Expected an array value.');
  return value as T[];
}

function methodNotAllowed() {
  return new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof SheetsError) {
    return new ApiError(error.status, 'SHEETS_ERROR', error.message, { retryable: error.retryable });
  }
  if (error instanceof GeminiError) {
    return new ApiError(error.status, 'GEMINI_ERROR', error.message, { retryable: error.retryable });
  }
  if (error instanceof Error && 'status' in error && error.status === 409) {
    return new ApiError(409, 'STALE_ROW', error.message);
  }
  return new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
}

async function invalidatePublicCache(origin: string): Promise<void> {
  const publicCache = await caches.open('honeymoon-public-v1');
  await Promise.all(
    Object.entries(API_OPERATIONS)
      .filter(([, route]) => route.capability === 'public:read')
      .map(([operation]) => publicCache.delete(`${origin}/api/rpc/${operation}`))
  );
}
