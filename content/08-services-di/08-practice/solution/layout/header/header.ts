import { Component, inject } from '@angular/core';
import { CartStore } from '../../core/cart-store';
import { FavoritesStore } from '../../core/favorites-store';
import { PricePipe } from '../../shared/price-pipe';

// Шапка магазина: логотип, избранное и сводка корзины
@Component({
  selector: 'app-header',
  imports: [PricePipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  // Корзину создаёт и выдаёт Angular — та же, что у всех остальных
  protected readonly cart = inject(CartStore);
  protected readonly favorites = inject(FavoritesStore);
}
