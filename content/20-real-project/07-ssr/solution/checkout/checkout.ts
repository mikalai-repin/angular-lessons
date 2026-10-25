import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  takeUntilDestroyed,
  toObservable,
} from '@angular/core/rxjs-interop';
import {
  FormField,
  FormRoot,
  form,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { injectDispatch } from '@ngrx/signals/events';
import {
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
} from 'rxjs';
import { AuthStore } from '../core/auth-store';
import { BROWSER_STORAGE } from '../core/browser-storage';
import { CartStore } from '../core/cart-store';
import { FieldAria } from '../shared/field-aria';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PricePipe } from '../shared/price-pipe';
import { checkoutEvents } from './checkout-events';
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
    FormRoot,
    PricePipe,
    RouterLink,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  protected readonly cart = inject(CartStore);
  protected readonly auth = inject(AuthStore);
  private readonly http = inject(HttpClient);
  private readonly storage = inject(BROWSER_STORAGE);
  // Отправка событий оформления: dispatch.orderPlaced(…) создаёт событие и отправляет его
  private readonly dispatch = injectDispatch(checkoutEvents);
  // Номер оформленного заказа. Пока заказа нет — null
  protected readonly orderId = signal<number | null>(null);

  // Модель формы. Комментарий начинаем с черновика, если покупатель уже что-то писал
  private readonly model = signal<CheckoutData>({
    contacts: { name: '', phone: '', email: '' },
    delivery: {
      method: 'pickup',
      address: '',
      callBefore: false,
    },
    postcards: [],
    comment: this.storage?.getItem(DRAFT_KEY) ?? '',
  });
  // Правила формы — в схеме: компоненту остаются данные и действия
  protected readonly checkoutForm = form(
    this.model,
    checkoutSchema,
    {
      submission: { action: () => this.placeOrder() },
    },
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

  // Есть ли что потерять: покупатель менял форму, а заказ ещё не оформлен
  hasUnsavedChanges() {
    return (
      this.checkoutForm().dirty() && this.orderId() === null
    );
  }

  // Оформление: заказ уходит на сервер. Ошибку, которую вернёт функция, форма покажет у себя
  private async placeOrder() {
    const { contacts, delivery, postcards, comment } =
      this.model();
    try {
      const order = await firstValueFrom(
        this.http.post<{ id: number }>('/api/orders', {
          items: this.cart.entities().map((item) => ({
            gameId: item.game.id,
            quantity: item.quantity,
          })),
          contacts,
          delivery,
          postcards,
          comment,
          promo: this.cart.promo()?.code ?? null,
          total: this.toPay(),
        }),
      );
      this.orderId.set(order.id);
      // Сообщаем, что произошло. Кто очистит корзину и что ещё случится — решают получатели
      this.dispatch.orderPlaced({ orderId: order.id });
      this.storage?.removeItem(DRAFT_KEY);
      return undefined;
    } catch (error) {
      // 409 — на складе меньше, чем в корзине. Сервер пишет, какой игры не хватило
      if (
        error instanceof HttpErrorResponse &&
        error.status === 409
      ) {
        return {
          kind: 'out-of-stock',
          message: error.error.message,
        };
      }
      return {
        kind: 'server',
        message:
          'Не удалось оформить заказ. Попробуйте ещё раз',
      };
    }
  }

  constructor() {
    // Каждое изменение комментария — значение потока. Сохраняем, когда покупатель сделал паузу
    toObservable(this.comment)
      .pipe(
        debounceTime(SAVE_DELAY),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((comment) => {
        this.storage?.setItem(DRAFT_KEY, comment);
        this.savedComment.set(comment);
      });
  }
}
