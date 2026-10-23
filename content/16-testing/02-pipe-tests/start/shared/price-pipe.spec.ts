import { PricePipe } from './price-pipe';

describe('PricePipe', () => {
  it('рубли без копеек, разряды через пробел', () => {
    // TODO: создать пайп в контексте внедрения TestBed с локалью ru и валютой RUB
    const pipe = new PricePipe();
    expect(pipe.transform(1990)).toBe('1 990 ₽');
  });
});
