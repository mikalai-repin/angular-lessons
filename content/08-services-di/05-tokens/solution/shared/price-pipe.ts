import {
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  Pipe,
  PipeTransform,
  inject,
} from '@angular/core';
import {
  formatCurrency,
  getCurrencySymbol,
} from '@angular/common';

// Цена без копеек в валюте магазина: 1990 → «1 990 ₽»
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  // Локаль и валюта приложения — те же, по которым работают встроенные пайпы
  private readonly locale = inject(LOCALE_ID);
  private readonly currency = inject(DEFAULT_CURRENCY_CODE);

  transform(value: number): string {
    const symbol = getCurrencySymbol(
      this.currency,
      'narrow',
      this.locale,
    );
    return formatCurrency(
      value,
      this.locale,
      symbol,
      this.currency,
      '1.0-0',
    );
  }
}
