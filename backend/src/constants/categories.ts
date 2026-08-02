export const CATEGORIES = ['FOOD', 'TRANSPORT', 'BILLS', 'SHOPPING', 'ENTERTAINMENT', 'HEALTH', 'INCOME', 'OTHER'] as const;
export type Category = typeof CATEGORIES[number];

export const KEYWORD_MAP: Record<Category, string[]> = {
  FOOD: ['food', 'lunch', 'dinner', 'breakfast', 'grab', 'eat', 'restaurant', 'coffee', 'groceries', 'meal'],
  TRANSPORT: ['transport', 'uber', 'taxi', 'mrt', 'bus', 'train', 'fare', 'fuel', 'petrol', 'parking'],
  BILLS: ['bill', 'rent', 'utility', 'utilities', 'subscription', 'phone', 'internet', 'insurance'],
  SHOPPING: ['shopping', 'shop', 'clothes', 'clothing', 'amazon', 'purchase', 'mall'],
  ENTERTAINMENT: ['entertainment', 'movie', 'cinema', 'concert', 'game', 'games', 'music', 'netflix'],
  HEALTH: ['health', 'doctor', 'medical', 'medicine', 'pharmacy', 'clinic', 'gym'],
  INCOME: ['salary', 'bonus', 'income', 'payout', 'refund', 'paycheck', 'freelance'],
  OTHER: [],
};
