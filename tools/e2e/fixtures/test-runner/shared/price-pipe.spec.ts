import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import { TestBed } from '@angular/core/testing';
import { PricePipe } from './price-pipe';

describe('PricePipe', () => {
  let pipe: PricePipe;

  beforeAll(() => {
    registerLocaleData(localeRu);
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'ru' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },
      ],
    });
    // inject() в поле пайпа работает только в контексте внедрения
    pipe = TestBed.runInInjectionContext(() => new PricePipe());
  });

  it('1990 → «1 990 ₽»', () => {
    expect(pipe.transform(1990)).toBe('1 990 ₽');
  });

  it('НАМЕРЕННО: без неразрывных пробелов', () => {
    expect(pipe.transform(1990)).toBe('1 990 ₽');
  });

  it('без контекста внедрения — NG0203', () => {
    expect(() => new PricePipe()).toThrow(/NG0203/);
  });
});
