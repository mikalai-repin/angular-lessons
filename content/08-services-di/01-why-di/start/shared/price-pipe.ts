import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { formatCurrency } from '@angular/common';

// Цена в рублях без копеек: 1990 → «1 990 ₽»
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  // Локаль приложения — та же, по которой форматируют встроенные пайпы
  private readonly locale = inject(LOCALE_ID);

  transform(value: number): string {
    return formatCurrency(value, this.locale, '₽', 'RUB', '1.0-0');
  }
}
