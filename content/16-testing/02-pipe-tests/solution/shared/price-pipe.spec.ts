import {
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import { TestBed } from '@angular/core/testing';
import { PricePipe } from './price-pipe';

describe('PricePipe', () => {
  let pipe: PricePipe;

  beforeEach(() => {
    // Правила русского языка — как в app.config.ts
    registerLocaleData(localeRu);
    // У теста нет app.config.ts: всё, что пайп внедряет, тест даёт сам
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'ru' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },
      ],
    });
    // inject() в полях пайпа работает только в контексте внедрения
    pipe = TestBed.runInInjectionContext(() => new PricePipe());
  });

  it('рубли без копеек, разряды через пробел', () => {
    // Пайпы форматирования ставят неразрывные пробелы: \u00a0
    expect(pipe.transform(1990)).toBe('1\u00a0990\u00a0₽');
  });

  it('округляет до рубля', () => {
    expect(pipe.transform(999.6)).toBe('1\u00a0000\u00a0₽');
  });
});
