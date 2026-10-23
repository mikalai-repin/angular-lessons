import { WordForms, plural } from './plural';

// Формы слова «игрок» — те же, что у пайпа players
const PLAYER: WordForms = {
  one: 'игрок',
  few: 'игрока',
  many: 'игроков',
};

// describe — набор тестов: всё, что мы проверяем у функции plural
describe('plural', () => {
  // it — один тест. Название — что должно быть верно
  it('1 — «игрок»', () => {
    // expect(что получилось).toBe(что должно получиться)
    expect(plural(1, PLAYER)).toBe('игрок');
  });

  it('3 — «игрока»', () => {
    expect(plural(3, PLAYER)).toBe('игрока');
  });

  // TODO: тесты для 5, 11 и 21
});
