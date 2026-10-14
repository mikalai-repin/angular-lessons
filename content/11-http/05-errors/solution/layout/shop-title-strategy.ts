import { Service, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  RouterStateSnapshot,
  TitleStrategy,
} from '@angular/router';

// Заголовок вкладки по правилам магазина: «Каталог — Ход конём».
// autoProvided: false — сама в DI не попадает, её подставляет провайдер TitleStrategy в app.config.ts
@Service({ autoProvided: false })
export class ShopTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  // Роутер вызывает метод после каждого успешного перехода
  override updateTitle(snapshot: RouterStateSnapshot) {
    // title самого глубокого маршрута: строка из карты маршрутов или ответ резолвера.
    // Нет title — подпись хлебной крошки самой глубокой страницы (у страницы игры — название игры)
    let route = snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const title =
      this.buildTitle(snapshot) ?? route.data['breadcrumb'];
    this.title.setTitle(
      title ? `${title} — Ход конём` : 'Ход конём',
    );
  }
}
