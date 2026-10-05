import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../core/cart-store';
import { PricePipe } from '../../shared/price-pipe';
import { Quantity } from '../../shared/quantity/quantity';

// Страница корзины: позиции, итоги, промокод
@Component({
  selector: 'app-cart-page',
  imports: [PricePipe, Quantity, RouterLink],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.css',
})
export class CartPage {
  protected readonly cart = inject(CartStore);

  // Состояние интерфейса: почему не применился промокод. Оно нужно только этому компоненту
  protected readonly promoError = signal('');

  protected applyPromo(text: string) {
    const result = this.cart.applyPromo(text);
    this.promoError.set(
      result === 'unknown'
        ? 'Нет такого промокода'
        : result === 'min-total'
          ? 'Сумма товаров меньше, чем нужно для этого промокода'
          : '',
    );
  }
}
