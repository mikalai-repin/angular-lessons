import { Component, inject, signal } from '@angular/core';
import { CartStore } from '../../core/cart-store';
import { PricePipe } from '../../shared/price-pipe';
import { Quantity } from '../../shared/quantity/quantity';

// Мини-корзина над каталогом: позиции, итоги, промокод
@Component({
  selector: 'app-mini-cart',
  imports: [PricePipe, Quantity],
  templateUrl: './mini-cart.html',
  styleUrl: './mini-cart.css',
})
export class MiniCart {
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
