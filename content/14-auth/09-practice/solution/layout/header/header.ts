import { Component, computed, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { AuthStore } from '../../core/auth-store';
import { CartStore } from '../../core/cart-store';
import { FavoritesStore } from '../../core/favorites-store';
import { PricePipe } from '../../shared/price-pipe';
import { QuickSearch } from '../quick-search/quick-search';

// Шапка магазина: логотип, меню, избранное, сводка корзины и вход
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
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  // Куда вернуть покупателя после входа: на текущую страницу.
  // lastSuccessfulNavigation — сигнал: после каждого перехода адрес пересчитается (как в крошках)
  protected readonly returnUrl = computed(() => {
    this.router.lastSuccessfulNavigation();
    const url = this.router.url;
    // Со страницы входа возвращаться на неё же незачем
    return url.startsWith('/login') ? null : url;
  });

  // Выход. Если страница только для вошедших, гард уведёт с неё: проходим по тому же адресу ещё раз
  protected logOut() {
    this.auth.logOut();
    this.router.navigateByUrl(this.router.url, {
      onSameUrlNavigation: 'reload',
    });
  }
}
