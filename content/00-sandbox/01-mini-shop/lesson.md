---
title: Мини-магазин
startFrom: custom
noSolution: true
focus: catalog/catalog.html
api: [httpResource, '@for', 'input.required()', provideRouter]
---

Временный шаг для проверки платформы. Здесь работает всё, на что опирается курс:

- роутинг: каталог `/`, страница игры `/games/:id` (параметр приходит во вход `id`), ленивая корзина `/cart`, страница 404;
- учебный бэкенд: `httpResource` загружает `/api/games` — запросы видны во вкладке «Сеть»;
- сервис `CartStore` на сигналах с декоратором `@Service()`;
- компонент `GameCard` с `input.required()` и `output()`, шаблон и стили в отдельных файлах.

```ts catalog/catalog.ts {2}
protected readonly cart = inject(CartStore);
protected readonly games = httpResource<Page<Game>>(() => '/api/games');
```

::: task
Откройте игру, добавьте пару игр в корзину, наберите в адресной строке превью `/nope`.
:::

::: deep Под капотом: как запускается этот код
Каждый `.ts` компилируется в воркере TypeScript 6 с JIT-трансформом Angular, шаблоны из `templateUrl` подставляются в код, а превью загружает Angular из `/vendor/angular/`.
:::

::: legacy Вы встретите в старом коде: *ngFor
```html
<app-game-card *ngFor="let game of games" [game]="game"></app-game-card>
```
:::
