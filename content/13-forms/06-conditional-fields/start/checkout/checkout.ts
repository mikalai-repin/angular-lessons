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
  email,
  form,
  required,
  validate,
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

// Телефон пишут по-разному: «+7 (900) 123-45-67», «8 900 1234567». Считаем только цифры:
// их 11, первая — 7 или 8
function isPhone(text: string) {
  return /^[78]\d{10}$/.test(text.replace(/\D/g, ''));
}

// Данные формы оформления заказа
interface CheckoutData {
  contacts: { name: string; phone: string; email: string };
  delivery: {
    method: 'pickup' | 'courier'; // самовывоз или курьер
    address: string;
    callBefore: boolean; // позвонить за час до приезда
  };
  comment: string;
}

// Оформление заказа: контакты покупателя, доставка и комментарий
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
    comment: localStorage.getItem(DRAFT_KEY) ?? '',
  });
  protected readonly checkoutForm = form(
    this.model,
    (checkout) => {
      const contacts = checkout.contacts;
      required(contacts.name, {
        message: 'Как к вам обращаться?',
      });
      // Своя проверка: функция получает контекст поля и возвращает ошибку или undefined
      validate(contacts.phone, ({ value }) =>
        value() && !isPhone(value())
          ? {
              kind: 'phone',
              message:
                'Номер — 11 цифр, например +7 900 123-45-67',
            }
          : undefined,
      );
      email(contacts.email, {
        message: 'Похоже, в адресе опечатка',
      });
      // Перекрёстная проверка: правило поля e-mail читает и соседнее поле — телефон
      validate(contacts.email, ({ value, valueOf }) =>
        !value().trim() && !valueOf(contacts.phone).trim()
          ? {
              kind: 'contact',
              message:
                'Укажите телефон или e-mail, чтобы мы могли связаться с вами',
            }
          : undefined,
      );
      // TODO: адрес и звонок — только при доставке курьером
    },
  );

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
