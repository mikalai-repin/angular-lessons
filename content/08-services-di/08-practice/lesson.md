---
title: 'Практикум: избранное'
startFrom: custom
files: [main.ts, core/favorites-store.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, layout/header/header.ts, layout/header/header.html, shared/game-card/game-card.css, app.ts, app.html, app.css, layout/header/header.css, core/cart-store.ts, core/analytics.ts, core/shop-config.ts, core/demo-cart-store.ts, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
focus: core/favorites-store.ts
api: [сервис состояния, '@Service()', 'inject()', aria-pressed]
---

Покупатель листает каталог и хочет отложить понравившиеся игры, чтобы вернуться к ним позже. Сделаем **избранное**: сердечко на каждой карточке и счётчик в шапке. Это ровно та задача, ради которой в главе появились сервисы: состояние нужно двум местам, которые ничего не знают друг о друге.

В коде шага — заготовка `core/favorites-store.ts` и `TODO` в `game-card.html` и `header.html`. Стили кнопки `.favorite` и ряда `.actions` лежат в `game-card.css` с начала главы.

::: task
1. **Сервис `FavoritesStore`** в `core/favorites-store.ts`, доступный во всём приложении:
   - хранит id игр в избранном;
   - `count` — сколько игр в избранном (сигнал);
   - `has(game)` — в избранном ли игра;
   - `toggle(game)` — добавить игру в избранное или убрать из него.
2. **Карточка**: рядом с «В корзину» — кнопка-сердечко в ряду `<div class="actions">`. Пустое сердечко `♡`, если игры нет в избранном, и `♥` с классом `active`, если есть. Щелчок переключает. Для экранного диктора: `aria-label` «В избранное» или «Убрать из избранного» и `aria-pressed`.
3. **Шапка**: между логотипом и корзиной — «♥ N» (`<span class="favorites">`).
:::

::: hint Подсказка 1: как хранить
Как и в корзине: сигнал с массивом, который не меняют, а заменяют новым. Для избранного достаточно id игр — `signal<number[]>([])`. Снаружи менять массив незачем, поэтому поле можно сделать `private`: компоненты пользуются только `count`, `has` и `toggle`.
:::

::: hint Подсказка 2: has в шаблоне
`has(game)` читает сигнал, поэтому шаблон, который его вызвал, обновится при изменении избранного — как с `quantityOf` у корзины. В карточке удобно завести `computed`: `isFavorite = computed(() => this.favorites.has(this.game()))` — и пользоваться им в трёх местах шаблона.
:::

::: hint Подсказка 3: кнопка
```html
<div class="actions">
  <button class="button" [disabled]="inCart() >= game().inStock" (click)="cart.add(game())">В корзину</button>
  <button
    class="favorite"
    [class.active]="isFavorite()"
    [attr.aria-label]="isFavorite() ? 'Убрать из избранного' : 'В избранное'"
    [attr.aria-pressed]="isFavorite()"
    (click)="favorites.toggle(game())"
  >
    {{ isFavorite() ? '♥' : '♡' }}
  </button>
</div>
```
:::

::: hint Подсказка 4: сервис целиком
```ts
@Service()
export class FavoritesStore {
  // id игр в избранном. Массив не меняем, а заменяем новым
  private readonly ids = signal<number[]>([]);

  readonly count = computed(() => this.ids().length);

  has(game: Game): boolean {
    return this.ids().includes(game.id);
  }

  toggle(game: Game) {
    this.ids.update((ids) => (ids.includes(game.id) ? ids.filter((id) => id !== game.id) : [...ids, game.id]));
  }
}
```
:::

## Проверьте себя

- В шапке «♥ 0», на всех карточках пустые сердечки.
- Отметьте «Остров сокровищ» и «Драконью почту»: сердечки заполнились, в шапке «♥ 2». Щёлкните ещё раз по одному из них — «♥ 1».
- Отметьте игру, отфильтруйте каталог так, чтобы её карточка исчезла, и сбросьте фильтры. Сердечко на месте: карточку уничтожили и создали заново, а избранное живёт в сервисе, а не в карточке.
- Сердечко и «В корзину» независимы: щелчок по сердечку не кладёт игру в корзину.

Почему сервис, а не сигнал в `App` со входом и выходом у карточки? Шапка и карточки — соседи, общий предок у них только `App`, и мы вернулись бы к курьеру из шага 1. С сервисом `App` об избранном не знает вовсе.

## Итоги главы

| Что | Зачем |
|---|---|
| `@Service()` (или `@Injectable({ providedIn: 'root' })`) | класс, который создаёт и раздаёт DI; один экземпляр на приложение |
| `inject(Токен)` | получить зависимость; только в контексте внедрения: поля, конструктор, фабрики |
| inject-функция (`injectNow`) | переиспользуемое поведение со своими зависимостями |
| `assertInInjectionContext`, `runInInjectionContext` | проверить контекст / выполнить код в контексте инжектора |
| `{ provide, useClass / useValue / useFactory / useExisting }` | как получить зависимость; провайдер в `appConfig` важнее значения по умолчанию |
| `new InjectionToken<T>('…', { factory })` | ключ для значения без класса: настройки, функции |
| `providers` у компонента | свой экземпляр в инжекторе элемента — для него и всех внутри |
| `optional`, `self`, `skipSelf`, `host` | изменить поиск зависимости |
| `injectAsync(() => import(…), { prefetch: onIdle })` | загрузить сервис, когда он понадобится |

И главные идеи:

- компонент не создаёт и не выбирает свои зависимости — он их просит. Что именно он получит, решает конфигурация: так подменяют корзину для показа, настройки для акции, сервисы для тестов;
- объекты, созданные DI, рождаются в контексте внедрения. Поэтому в сервисе работают `effect()` и `inject(DestroyRef)`, а в своём `new` — нет;
- инжекторы образуют дерево: элементы шаблонов, над ними инжекторы окружения, в конце `NullInjector`. Поиск идёт снизу вверх, побеждает ближайший провайдер;
- общее состояние нескольких экранов — в сервисе; маленькие общие компоненты по-прежнему получают данные входами.

Пока корзина в `CartStore` — это просто поля и методы: кто угодно может записать в `items` что угодно, а после перезапуска превью всё пропадает. В главе 9 «Состояние приложения» превратим сервис в настоящее хранилище: закрытое состояние, действия, сохранение в `localStorage` и промокод. А перед ней — необязательный шаг «под капотом»: как Angular ищет зависимость и откуда берётся NG0201.
