import { Component, inject } from '@angular/core';
import { CartStore } from '../../core/cart-store';
import { PricePipe } from '../../shared/price-pipe';
import { Quantity } from '../../shared/quantity/quantity';

// Мини-корзина над каталогом: позиции, итог, доставка
@Component({
  selector: 'app-mini-cart',
  imports: [PricePipe, Quantity],
  templateUrl: './mini-cart.html',
  styleUrl: './mini-cart.css',
})
export class MiniCart {
  protected readonly cart = inject(CartStore);

  // TODO: сообщение об ошибке промокода и метод applyPromo(text)
}
