const log: string[] = [];

describe('порядок хуков', () => {
  beforeAll(() => {
    log.push('beforeAll');
    return () => log.push('beforeAll cleanup');
  });
  afterAll(() => {
    log.push('afterAll 1');
  });
  afterAll(() => {
    log.push('afterAll 2');
  });
  beforeEach(() => {
    log.push('outer beforeEach');
    return () => log.push('outer beforeEach cleanup');
  });
  afterEach(() => {
    log.push('outer afterEach 1');
  });
  afterEach(() => {
    log.push('outer afterEach 2');
  });

  describe('вложенный', () => {
    beforeEach(() => {
      log.push('inner beforeEach');
    });
    afterEach(() => {
      log.push('inner afterEach');
    });
    it('тест', ({ task }) => {
      log.push(`test ${task.name}`);
      onTestFinished(() => {
        log.push('onTestFinished');
      });
    });
  });
});

describe('итог порядка', () => {
  it('порядок как в Vitest', () => {
    expect(log).toEqual([
      'beforeAll',
      'outer beforeEach',
      'inner beforeEach',
      'test тест',
      'inner afterEach',
      'outer afterEach 2',
      'outer afterEach 1',
      'outer beforeEach cleanup',
      'onTestFinished',
      'afterAll 2',
      'afterAll 1',
      'beforeAll cleanup',
    ]);
  });
});

describe('each и имена', () => {
  it.each([
    { a: 1, b: 2, sum: 3 },
    { a: 2, b: 2, sum: 4 },
  ])('$a + $b = $sum', ({ a, b, sum }) => {
    expect(a + b).toBe(sum);
  });
  it.each(['x', 'y'])('строка %s (номер %#)', (value) => {
    expect(typeof value).toBe('string');
  });
  it.for([[1, 1]])('for %i', ([a, b]) => {
    expect(a).toBe(b);
  });
});

describe('особые тесты', () => {
  it.fails('fails: упавший считается прошедшим', () => {
    expect(1).toBe(2);
  });
  it('context.skip', (context) => {
    context.skip();
    expect(1).toBe(2);
  });
  it('НАМЕРЕННО: тайм-аут 50 мс', async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }, 50);
  it('НАМЕРЕННО: ошибка в afterEach', () => {
    expect(1).toBe(1);
  });
  afterEach(({ task }) => {
    if (task.name.includes('afterEach')) throw new Error('afterEach упал');
  });
});

describe('НАМЕРЕННО: упавший beforeAll', () => {
  beforeAll(() => {
    throw new Error('beforeAll упал');
  });
  it('не выполнится', () => {
    expect(1).toBe(1);
  });
});
