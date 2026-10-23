import { DurationPipe } from './duration-pipe';

describe('DurationPipe', () => {
  // Пайп — обычный класс: его метод transform можно вызвать без Angular
  const pipe = new DurationPipe();

  it('часы и минуты', () => {
    expect(pipe.transform(90)).toBe('1 ч 30 мин');
  });

  it('меньше часа — только минуты', () => {
    expect(pipe.transform(45)).toBe('45 мин');
  });

  it('ровно час — без минут', () => {
    expect(pipe.transform(60)).toBe('1 ч');
  });

  it('длинный формат согласует слова с числом', () => {
    expect(pipe.transform(125, 'long')).toBe('2 часа 5 минут');
  });
});
