import { Component, inject } from '@angular/core';
import { CartStore } from '../core/cart-store';

@Component({
  selector: 'app-cart',
  template: `
    <h1>Корзина</h1>
    @for (item of cart.list(); track item.game.id) {
      <p>
        {{ item.game.title }} × {{ item.quantity }}
        <button
          class="button"
          (click)="cart.remove(item.game.id)"
        >
          Убрать
        </button>
      </p>
    } @empty {
      <p class="muted">Корзина пуста</p>
    }
    <p>
      <b>Итого: {{ cart.total() }} ₽</b>
    </p>
  `,
})
export class CartPage {
  protected readonly cart = inject(CartStore);
}
