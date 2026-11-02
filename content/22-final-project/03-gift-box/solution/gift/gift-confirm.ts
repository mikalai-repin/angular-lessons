import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormField,
  FormRoot,
  submit,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { FieldAria } from '../shared/field-aria';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PricePipe } from '../shared/price-pipe';
import { GiftStore } from './gift-store';

// Шаг 3, /gift/confirm: что в наборе, контакты покупателя и оформление
@Component({
  selector: 'app-gift-confirm',
  imports: [
    FieldAria,
    FieldErrors,
    FormField,
    FormRoot,
    PricePipe,
    RouterLink,
  ],
  templateUrl: './gift-confirm.html',
})
export class GiftConfirm {
  protected readonly gift = inject(GiftStore);
  // Номер оформленного заказа. Пока заказа нет — null
  protected readonly orderId = signal<number | null>(null);

  // Отправляем всю форму: submit ещё раз проверит все шаги, а не только контакты.
  // Ошибку, которую вернёт функция, форма покажет у себя
  protected send() {
    submit(this.gift.form, async () => {
      try {
        this.orderId.set(await this.gift.placeOrder());
        return undefined;
      } catch (error) {
        // 409 — какой-то игры не хватило на складе: сервер пишет какой
        return {
          kind: 'server',
          message:
            error instanceof HttpErrorResponse &&
            error.status === 409
              ? error.error.message
              : 'Не удалось оформить набор. Попробуйте ещё раз',
        };
      }
    });
  }
}
