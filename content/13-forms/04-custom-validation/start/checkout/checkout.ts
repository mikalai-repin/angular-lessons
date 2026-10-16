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
import {
  FormField,
  form,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CartStore } from '../core/cart-store';
import { FieldAria } from '../shared/field-aria';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PricePipe } from '../shared/price-pipe';

// Ключ черновика комментария в localStorage
const DRAFT_KEY = 'hod-konem:checkout-comment';
// Пауза в наборе, после которой черновик сохраняется, мс
const SAVE_DELAY = 500;

// Данные формы оформления заказа
interface CheckoutData {
  contacts: { name: string; phone: string; email: string };
  comment: string;
}

// Оформление заказа: контакты покупателя и комментарий
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
    comment: localStorage.getItem(DRAFT_KEY) ?? '',
  });
  protected readonly checkoutForm = form(
    this.model,
    (checkout) => {
      const contacts = checkout.contacts;
      required(contacts.name, {
        message: 'Как к вам обращаться?',
      });
      // TODO: телефон — 11 цифр; e-mail — без опечаток; телефон или e-mail — хотя бы одно
    },
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
