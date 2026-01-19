// Trip Configuration
// Edit this file to customize for your trip

export const tripConfig = {
  // App title displayed in header
  tripName: 'Our Honeymoon Journey',

  // Subtitle displayed above the main title
  tripSubtitle: 'Europe 2026',

  // External links for menu
  links: {
    googleSheet: 'https://docs.google.com/spreadsheets/d/1sd5CVy0qd4QSuOUUDnQH6I1Mx2F2W1NvgWVbujcePiU/edit?usp=sharing',
    github: 'https://github.com/weiyuan1993/honeymoon-journal',
  },

  // Currencies available for expense tracking
  currencies: [
    { code: 'EUR', symbol: '€', label: '歐元' },
    { code: 'CHF', symbol: 'CHF', label: '瑞法' },
    { code: 'GBP', symbol: '£', label: '英鎊' },
    { code: 'TWD', symbol: 'NT$', label: '台幣' },
  ] as const,

  // Default currency for new expenses
  defaultCurrency: 'EUR' as const,

  // Expense categories
  categories: [
    { code: 'Food', label: '餐飲' },
    { code: 'Transport', label: '交通' },
    { code: 'Shopping', label: '購物' },
    { code: 'Ticket', label: '門票' },
    { code: 'Toilet', label: '廁所' },
    { code: 'Other', label: '其他' },
  ] as const,

  // Google Sheet tab names (must match your spreadsheet)
  sheetNames: {
    itinerary: '行程',
    expenses: '記帳',
    attractions: '景點介紹',
    navigation: '導航',
  },
};

// Type exports derived from config
export type Currency = (typeof tripConfig.currencies)[number]['code'];
export type Category = (typeof tripConfig.categories)[number]['code'];

// Helper function to get currency symbol
export const getCurrencySymbol = (code: string): string => {
  const currency = tripConfig.currencies.find((c) => c.code === code);
  return currency?.symbol || code;
};
