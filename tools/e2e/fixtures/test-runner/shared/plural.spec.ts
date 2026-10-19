import { plural } from './plural';

const players = { one: 'игрок', few: 'игрока', many: 'игроков' };

describe('plural', () => {
  it.each([
    [1, 'игрок'],
    [2, 'игрока'],
    [5, 'игроков'],
    [21, 'игрок'],
  ])('%i → %s', (count, word) => {
    expect(plural(count, players)).toBe(word);
  });

  it('НАМЕРЕННО: toBe со строкой', () => {
    expect(plural(11, players)).toBe('игрока');
  });

  it('НАМЕРЕННО: toEqual с объектом', () => {
    expect({ a: 1, b: [1, 2] }).toEqual({ a: 1, b: [1, 3] });
  });

  it.todo('дробные числа');
  it.skip('пропущенный', () => {
    expect(true).toBe(false);
  });

  it('toThrow и resolves', async () => {
    expect(() => JSON.parse('{')).toThrow(SyntaxError);
    await expect(Promise.resolve(2)).resolves.toBe(2);
    await expect(Promise.reject(new Error('нет'))).rejects.toThrow('нет');
  });

  it('expect.assertions', async () => {
    expect.assertions(2);
    expect(1).toBe(1);
  });
});

describe('vi.fn и vi.spyOn', () => {
  it('считает вызовы', () => {
    const fn = vi.fn((x: number) => x * 2);
    fn(2);
    fn(3);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
    expect(fn.mock.results[0].value).toBe(4);
  });

  it('НАМЕРЕННО: toHaveBeenCalledWith', () => {
    const fn = vi.fn();
    fn('a', 1);
    expect(fn).toHaveBeenCalledWith('a', 2);
  });

  it('spyOn и mockReturnValue', () => {
    const obj = { now: () => 1 };
    const spy = vi.spyOn(obj, 'now').mockReturnValue(42);
    expect(obj.now()).toBe(42);
    spy.mockRestore();
    expect(obj.now()).toBe(1);
  });
});

describe('фейковые таймеры', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('setTimeout по advanceTimersByTime', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    setTimeout(fn, 1000);
    vi.advanceTimersByTime(999);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('setSystemTime', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
    expect(new Date().toISOString()).toBe('2026-10-18T12:00:00.000Z');
  });
});
