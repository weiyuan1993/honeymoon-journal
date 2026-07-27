import { describe, expect, it } from 'vitest';

import { assertSameOriginMutation } from '../policy';

describe('same-origin mutation policy', () => {
  it('allows safe reads without an Origin header', () => {
    const request = new Request(
      'https://trip.example/api/itinerary',
    );

    expect(() => assertSameOriginMutation(request)).not.toThrow();
  });

  it('allows a same-origin mutation', () => {
    const request = new Request(
      'https://trip.example/api/expenses',
      {
        method: 'POST',
        headers: { origin: 'https://trip.example' },
      },
    );

    expect(() => assertSameOriginMutation(request)).not.toThrow();
  });

  it.each([null, 'https://attacker.example', 'not-an-origin'])(
    'rejects an absent or cross-origin mutation (%s)',
    (origin) => {
      const headers = new Headers();
      if (origin) {
        headers.set('origin', origin);
      }
      const request = new Request(
        'https://trip.example/api/expenses',
        { method: 'DELETE', headers },
      );

      expect(() => assertSameOriginMutation(request)).toThrowError(
        expect.objectContaining({
          status: 403,
          code: 'CROSS_ORIGIN_REQUEST',
        }),
      );
    },
  );

  it('uses the configured application origin when supplied', () => {
    const request = new Request(
      'https://preview-worker.workers.dev/api/expenses',
      {
        method: 'PATCH',
        headers: { origin: 'https://trip.example' },
      },
    );

    expect(() =>
      assertSameOriginMutation(
        request,
        'https://trip.example/app/path',
      ),
    ).not.toThrow();
  });
});
