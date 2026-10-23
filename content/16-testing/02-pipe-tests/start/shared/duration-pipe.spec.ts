import { DurationPipe } from './duration-pipe';

describe('DurationPipe', () => {
  // Пайп — обычный класс: его метод transform можно вызвать без Angular
  const pipe = new DurationPipe();

  it('часы и минуты', () => {
    expect(pipe.transform(90)).toBe('1 ч 30 мин');
  });

  // TODO: меньше часа, ровно час, длинный формат ('long')
});
