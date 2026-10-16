import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  FormField,
  FormRoot,
  form,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../core/cart-store';
import { PricePipe } from '../../shared/price-pipe';
import { Quantity } from '../../shared/quantity/quantity';

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

  // Форма промокода — одно поле. Отправка формы — «Применить»
  private readonly promoModel = signal({ code: '' });
  protected readonly promoForm = form(
    this.promoModel,
    (promo) => {
      required(promo.code);
      // TODO: проверить код на сервере — GET /api/promo/:code
    },
    { submission: { action: () => this.applyPromo() } },
  );

  private async applyPromo() {
    // TODO: получить промокод с сервера и применить к корзине
  }
}
