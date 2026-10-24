import {
  AnimationCallbackEvent,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  FormField,
  FormRoot,
  form,
  required,
  validateHttp,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CACHE } from '../../core/cache-interceptor';
import { CartStore } from '../../core/cart-store';
import { Promo } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';
import { Quantity } from '../../shared/quantity/quantity';

// Промокод проверяет сервер: GET /api/promo/KNIGHT10 → промокод или 404
const promoUrl = (code: string) =>
  `/api/promo/${encodeURIComponent(code.trim())}`;
// Метка CACHE: «Применить» возьмёт из кэша ответ, полученный при проверке
const cached = () => new HttpContext().set(CACHE, true);

// Страница корзины: позиции, итоги, промокод
@Component({
  selector: 'app-cart-page',
  imports: [
    FormField,
    FormRoot,
    PricePipe,
    Quantity,
    RouterLink,
  ],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.css',
})
export class CartPage {
  protected readonly cart = inject(CartStore);
  private readonly http = inject(HttpClient);

  constructor() {
    // Снимки игр в корзине могли устареть: сверяем с сервером при каждом открытии корзины
    this.cart.refresh();
  }

  // Форма промокода — одно поле. Отправка формы — «Применить»
  private readonly promoModel = signal({ code: '' });
  protected readonly promoForm = form(
    this.promoModel,
    (promo) => {
      required(promo.code);
      // Асинхронная проверка: запрос к серверу. Пока ответа нет, поле в состоянии pending
      validateHttp(promo.code, {
        request: ({ value }) => ({
          url: promoUrl(value()),
          context: cached(),
        }),
        // Не спрашивать сервер на каждую букву: запрос — после паузы в наборе
        debounce: 300,
        // Промокод есть. Хватает ли суммы товаров — узнаём только теперь
        onSuccess: (found: Promo) =>
          'minTotal' in found &&
          this.cart.subtotal() < found.minTotal
            ? {
                kind: 'min-total',
                message:
                  'Сумма товаров меньше, чем нужно для этого промокода',
              }
            : undefined,
        onError: (error) =>
          error instanceof HttpErrorResponse &&
          error.status === 404
            ? {
                kind: 'unknown',
                message: 'Нет такого промокода',
              }
            : {
                kind: 'server',
                message: 'Не удалось проверить промокод',
              },
      });
    },
    { submission: { action: () => this.applyPromo() } },
  );

  // Строка уходит из корзины: уезжает, тает и схлопывается — строки ниже поднимаются плавно.
  // Angular удалит строку, когда мы вызовем animationComplete()
  protected collapse(event: AnimationCallbackEvent) {
    const row = event.target as HTMLElement;
    // Покупатель попросил поменьше движения — удаляем сразу
    if (
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      event.animationComplete();
      return;
    }
    // Высоту строки знает только браузер: замеряем её прямо сейчас (без полей — их уберёт paddingBlock)
    const { height } = getComputedStyle(row);
    const animation = row.animate(
      [
        { height, opacity: 1 },
        {
          height: '0px',
          paddingBlock: '0px',
          opacity: 0,
          transform: 'translateX(24px)',
        },
      ],
      { duration: 300, easing: 'ease-in' },
    );
    animation.onfinish = () => event.animationComplete();
  }

  private async applyPromo() {
    const promo = await firstValueFrom(
      this.http.get<Promo>(promoUrl(this.promoModel().code), {
        context: cached(),
      }),
    );
    this.cart.applyPromo(promo);
    // Промокод применён — поле снова пустое и нетронутое
    this.promoForm().reset({ code: '' });
  }
}
