import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
} from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CartStore } from '../core/cart-store';
import { FieldAria } from '../shared/field-aria';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PricePipe } from '../shared/price-pipe';
import {
  CheckoutData,
  MAX_POSTCARDS,
  POSTCARD_TEXT_MAX,
  checkoutSchema,
} from './checkout-schema';

// Ключ черновика комментария в localStorage
const DRAFT_KEY = 'hod-konem:checkout-comment';
// Пауза в наборе, после которой черновик сохраняется, мс
const SAVE_DELAY = 500;

// Оформление заказа: контакты покупателя, доставка, открытки и комментарий
@Component({
  selector: 'app-checkout',
  imports: [
    FieldAria,
    FieldErrors,
    FormField,
    PricePipe,
    RouterLink,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  protected readonly cart = inject(CartStore);

  // Модель формы. Комментарий начинаем с черновика, если покупатель уже что-то писал
  private readonly model = signal<CheckoutData>({
    contacts: { name: '', phone: '', email: '' },
    delivery: {
      method: 'pickup',
      address: '',
      callBefore: false,
    },
    postcards: [],
    comment: localStorage.getItem(DRAFT_KEY) ?? '',
  });
  // Правила формы — в схеме: компоненту остаются данные и действия
  protected readonly checkoutForm = form(
    this.model,
    checkoutSchema,
  );

  protected readonly maxPostcards = MAX_POSTCARDS;
  protected readonly postcardTextMax = POSTCARD_TEXT_MAX;

  // Список полей растёт и сокращается вместе с массивом в модели
  protected addPostcard() {
    this.model.update((order) => ({
      ...order,
      postcards: [...order.postcards, { to: '', text: '' }],
    }));
  }

  protected removePostcard(index: number) {
    this.model.update((order) => ({
      ...order,
      postcards: order.postcards.filter((_, i) => i !== index),
    }));
  }

  // К оплате. Самовывоз — без платы за доставку
  protected readonly toPay = computed(
    () =>
      this.cart.total() -
      (this.checkoutForm.delivery.method().value() === 'pickup'
        ? this.cart.delivery()
        : 0),
  );

  // Комментарий — поле формы, а значение поля — сигнал. Черновик сохраняем, как в главе 12
  private readonly comment = this.checkoutForm.comment().value;
  // Последний сохранённый текст
  private readonly savedComment = signal(this.comment());
  // Всё ли сохранено: пока покупатель печатает — нет
  protected readonly saved = computed(
    () => this.comment() === this.savedComment(),
  );

  constructor() {
    // Каждое изменение комментария — значение потока. Сохраняем, когда покупатель сделал паузу
    toObservable(this.comment)
      .pipe(
        debounceTime(SAVE_DELAY),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((comment) => {
        localStorage.setItem(DRAFT_KEY, comment);
        this.savedComment.set(comment);
      });
  }
}
