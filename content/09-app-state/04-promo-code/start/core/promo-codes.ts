// Промокоды магазина. В главе 13 их будет проверять сервер (GET /api/promo/:code), пока список — в коде
export type Promo =
  | { code: string; percent: number } // скидка в процентах от суммы товаров
  | { code: string; amount: number; minTotal: number }; // скидка в рублях при сумме товаров от minTotal

export const PROMO_CODES: readonly Promo[] = [
  { code: 'KNIGHT10', percent: 10 },
  { code: 'CHESS500', amount: 500, minTotal: 3000 },
];

// Чем закончилась попытка применить промокод: применён, нет такого, мала сумма товаров
export type PromoResult = 'applied' | 'unknown' | 'min-total';

// Промокод по тексту, который ввёл покупатель: регистр и пробелы по краям не важны
export function findPromo(text: string): Promo | undefined {
  const code = text.trim().toUpperCase();
  return PROMO_CODES.find((promo) => promo.code === code);
}
