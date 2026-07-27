export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

const defaultSleep = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 150;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(input, init);
    if (response.status !== 429 && response.status < 500) return response;
    if (attempt === attempts - 1) return response;

    const retryAfter = Number(response.headers.get('retry-after'));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : baseDelayMs * 2 ** attempt;
    await sleep(delay);
  }

  throw new Error('Retry loop ended unexpectedly');
}
