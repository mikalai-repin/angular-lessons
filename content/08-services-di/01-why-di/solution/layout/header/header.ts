import { Component } from '@angular/core';
import { cartStore } from '../../core/cart-store';
import { PricePipe } from '../../shared/price-pipe';

// Шапка магазина: логотип и сводка корзины
@Component({
  selector: 'app-header',
  imports: [PricePipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  // Та же корзина, что у App: единственный экземпляр из core/cart-store.ts
  protected readonly cart = cartStore;
}
