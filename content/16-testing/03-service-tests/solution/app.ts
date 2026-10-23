import { Component, inject, injectAsync } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { Breadcrumbs } from './layout/breadcrumbs/breadcrumbs';
import { Header } from './layout/header/header';

// Каркас магазина: шапка и место, куда роутер выводит текущую страницу
@Component({
  selector: 'app-root',
  imports: [Breadcrumbs, Header, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Аналитика загружается отдельно, при первом вызове — как в корзине
  private readonly analytics = injectAsync(() =>
    import('./core/analytics').then((m) => m.Analytics),
  );

  constructor() {
    // Просмотр страницы — завершённая навигация. Из всех событий роутера берём NavigationEnd,
    // а из него — адрес, на котором покупатель оказался после всех переадресаций
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects),
      )
      .subscribe((url) =>
        this.analytics()
          .then((analytics) =>
            analytics.track('Просмотр страницы', url),
          )
          // Аналитика не важнее магазина — как в CartStore
          .catch(() => {}),
      );
  }
}
