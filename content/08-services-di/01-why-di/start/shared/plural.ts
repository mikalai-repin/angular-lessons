// Форма слова после числа по правилам русского языка: 1 игрок, 2 игрока, 5 игроков.
// Intl.PluralRules — стандартный API JavaScript: для целых чисел в русском он отвечает 'one', 'few' или 'many'
const rules = new Intl.PluralRules('ru');

export interface WordForms {
  one: string; // 1, 21, 31 …
  few: string; // 2–4, 22–24 …
  many: string; // 0, 5–20, 25–30 …
}

export function plural(count: number, forms: WordForms): string {
  const category = rules.select(count);
  return category === 'one' ? forms.one : category === 'few' ? forms.few : forms.many;
}
