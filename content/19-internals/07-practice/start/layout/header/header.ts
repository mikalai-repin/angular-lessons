import {
  ChangeDetectorRef,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { AuthStore } from '../../core/auth-store';
import { CartStore } from '../../core/cart-store';
import { Store } from '@ngrx/store';
import { favoritesFeature } from '../../core/favorites-feature';
import { PricePipe } from '../../shared/price-pipe';
import { FlyingCovers } from '../flying-covers/flying-covers';
import { QuickSearch } from '../quick-search/quick-search';

// Шапка магазина: логотип, меню, избранное, сводка корзины и вход
@Component({
  selector: 'app-header',
  imports: [
    FlyingCovers,
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
  // Сколько игр в избранном: селектор из Store, прочитанный как сигнал
  protected readonly favoritesCount = inject(
    Store,
  ).selectSignal(favoritesFeature.selectCount);
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  constructor() {
    // Сводку корзины — обновлять раз в секунду, на всякий случай
    setInterval(() => this.changeDetector.markForCheck(), 1000);
  }

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
