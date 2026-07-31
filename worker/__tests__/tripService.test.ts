import { describe, expect, it, vi } from 'vitest';
import { TripService, parseJourney } from '../tripService';
import type { TripRepository } from '../tripRepository';
import type { GeminiClient } from '../gemini';

describe('parseJourney', () => {
  it('parses structured journey output into the page content shape', () => {
    const generated = JSON.stringify({
      intro: '我們從倫敦展開旅程。',
      cities: [
        { name: '倫敦', content: '在泰晤士河畔寫下第一頁。' },
        { name: '巴黎', content: '沿著塞納河感受浪漫。' },
      ],
      closing: '這段旅程會成為我們共同的珍藏。',
    });

    expect(parseJourney(generated, ['倫敦', '巴黎'])).toEqual({
      intro: '我們從倫敦展開旅程。',
      cities: {
        '倫敦': '在泰晤士河畔寫下第一頁。',
        '巴黎': '沿著塞納河感受浪漫。',
      },
      closing: '這段旅程會成為我們共同的珍藏。',
    });
  });
});

describe('TripService chat', () => {
  it('normalizes unsupported Markdown before returning and saving an answer', async () => {
    const repository = {
      buildTripContext: vi.fn().mockResolvedValue('trip context'),
      saveChat: vi.fn().mockResolvedValue(undefined),
    };
    const gemini = {
      generate: vi.fn().mockResolvedValue('**巴黎**\n* 景點'),
    };
    const service = new TripService(
      repository as unknown as TripRepository,
      gemini as unknown as GeminiClient
    );

    const result = await service.chatWithSecretary('巴黎怎麼玩？', []);

    expect(result).toMatchObject({
      success: true,
      answer: '巴黎\n• 景點',
      persisted: true,
    });
    expect(repository.saveChat).toHaveBeenCalledWith(
      '巴黎怎麼玩？',
      '巴黎\n• 景點'
    );
  });
});

describe('TripService expense overview', () => {
  it('delegates the combined financial snapshot to the repository', async () => {
    const overview = {
      fetchedAt: '2026-07-31T03:00:00.000Z',
      ratesTwdPerUnit: { TWD: 1, EUR: 35, CHF: 40, GBP: 43 },
      categories: [],
      ledgerByCurrency: [],
      components: {
        budgetProjectedTwd: 100,
        budgetPaidTwd: 40,
        budgetUnpaidTwd: 60,
        ledgerTwd: 10,
      },
      totals: {
        projectedTwd: 110,
        paidTwd: 50,
        unpaidTwd: 60,
      },
      warnings: [],
      unconvertedCurrencies: [],
      isComplete: true,
    };
    const repository = {
      getExpenseOverview: vi.fn().mockResolvedValue(overview),
    };
    const service = new TripService(
      repository as unknown as TripRepository,
      {} as GeminiClient
    );

    await expect(service.getExpenseOverviewData()).resolves.toBe(overview);
    expect(repository.getExpenseOverview).toHaveBeenCalledOnce();
  });
});
