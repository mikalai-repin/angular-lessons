import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartStore } from '../../core/cart-store';
import { FavoritesStore } from '../../core/favorites-store';
import { PricePipe } from '../../shared/price-pipe';
import { QuickSearch } from '../quick-search/quick-search';

// Шапка магазина: логотип, меню, избранное и сводка корзины
@Component({
  selector: 'app-header',
  imports: [
    PricePipe,
    QuickSearch,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  // Корзину создаёт и выдаёт Angular — та же, что у всех остальных
  protected readonly cart = inject(CartStore);
  protected readonly favorites = inject(FavoritesStore);
}
