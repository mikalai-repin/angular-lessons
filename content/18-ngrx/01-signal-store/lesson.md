---
title: Signal Store
startFrom: custom
base: 17-admin/08-practice
baseHash: '30f5b3611e6e'
focus: core/favorites-store.ts
api: [NgRx, signalStore, withState, withComputed, withMethods, patchState, withHooks, protectedState]
---

В главе 9 мы сделали корзину и избранное сервисами на сигналах и в конце обсудили, что добавляет библиотека состояния. Пора проверить это на своём коде. В этой главе хранилища «Хода конём» переедут на **NgRx** — самую распространённую библиотеку состояния в мире Angular:

- избранное и корзина — на **Signal Store**: состояние, производные значения, методы, коллекции сущностей, своё расширение для `localStorage`, сверка корзины с сервером на RxJS, события «заказ оформлен»;
- избранное ещё раз — на **классическом Store** с действиями, редьюсером, селекторами и эффектами: так написаны многие существующие проекты;
- в практикуме на главной появится блок «Вы смотрели» — последние открытые игры.

Покупатель почти ничего не заметит: магазин будет работать как раньше. Меняется то, как устроен код, — и в этом весь смысл главы: сравнить одно и то же, сделанное средствами Angular и библиотекой.

## Что изменилось в коде

Код — решение практикума главы 17. Новое — только в превью: пакеты NgRx подключены, их можно импортировать.

## Пакеты NgRx

NgRx — не часть Angular, а отдельный проект со своими пакетами и версиями. Версия NgRx повторяет основную версию Angular: пакеты 22.0.1, которыми мы пользуемся, требуют `@angular/core` 22. Нам понадобятся:

| Пакет | Что в нём |
|---|---|
| `@ngrx/signals` | Signal Store и его дополнения: `entities`, `rxjs-interop`, `events` |
| `@ngrx/store` | классический Store |
| `@ngrx/effects` | эффекты классического Store |
| `@ngrx/operators` | операторы RxJS для работы с сервером |

В проекте Angular CLI пакет ставят командой `ng add @ngrx/signals` — она добавит зависимость нужной версии. В превью курса пакеты уже есть.

## Хранилище из частей

Откройте `core/favorites-store.ts`. Сервис устроен так, как мы договорились в главе 9: закрытый записываемый сигнал, открытое чтение через `asReadonly()`, производное `count`, методы, которые меняют состояние, и эффект, который пишет его в `localStorage`.

Signal Store делает то же, но не классом, а **из частей** (store features) — функций `with…`, которые передают в `signalStore`:

```ts core/favorites-store.ts
export const FavoritesStore = signalStore(
  { providedIn: 'root' },
  withState<FavoritesState>(() => ({ ids: loadFavorites() })),
  withComputed(({ ids }) => ({
    count: () => ids().length,
  })),
  withMethods((store) => ({
    has(game: Game): boolean {
      return store.ids().includes(game.id);
    },
    toggle(game: Game) {
      patchState(store, ({ ids }) => ({
        ids: ids.includes(game.id)
          ? ids.filter((id) => id !== game.id)
          : [...ids, game.id],
      }));
    },
  })),
  withHooks({
    onInit(store) {
      effect(() =>
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store.ids())),
      );
    },
  }),
);
```

Разберём по частям.

**`signalStore(...)`** возвращает **класс** — такой же, как наш сервис: его выдаёт DI, его просят через `inject(FavoritesStore)`. Первый аргумент — настройки: `{ providedIn: 'root' }` значит «один экземпляр на приложение», как `@Service()`.

**`withState`** — состояние. Это объект, и для каждого его поля (state slice) хранилище заводит сигнал: снаружи будет `favorites.ids()`. Начальное состояние можно дать объектом или функцией. Функция выполняется, когда хранилище создаётся, в контексте внедрения — внутри неё можно читать `localStorage` или вызвать `inject()`.

**`withComputed`** — производные значения. Функция получает всё, что добавили части выше, — здесь сигнал `ids` — и возвращает объект. Каждая функция в нём становится `computed`: `count: () => ids().length` — то же, что `count: computed(() => ids().length)`. Готовый `computed` тоже можно вернуть.

**`withMethods`** — методы. Функция получает **само хранилище** (`store`) — со всем, что добавлено выше, — и возвращает объект с методами.

**`patchState(store, …)`** — единственный способ поменять состояние. Ему передают либо часть состояния (`{ ids: [] }`), либо функцию, которая из текущего состояния делает часть нового: «вот что поменялось». Поля, которых нет в ответе, остаются как были.

**`withHooks`** — хуки жизни хранилища: `onInit` выполняется, когда хранилище создано, `onDestroy` — когда уничтожено. `onInit` тоже работает в контексте внедрения, поэтому `effect()` в нём можно создать так же, как в конструкторе сервиса.

Порядок частей важен: каждая видит только то, что добавили части **выше** неё. `withComputed` не мог бы стоять перед `withState` — ему нечего было бы читать.

::: task
Перепишите `core/favorites-store.ts` на Signal Store:

1. Импортируйте `patchState`, `signalStore`, `withComputed`, `withHooks`, `withMethods`, `withState` из `@ngrx/signals`.
2. Опишите состояние интерфейсом `FavoritesState` с полем `ids: number[]`.
3. Вместо класса — `export const FavoritesStore = signalStore(...)` из частей выше. Функцию `loadFavorites` оставьте как есть.
:::

## Что получилось

Магазин работает как раньше: сердечко в карточке отмечает игру, счётчик в шапке растёт, после перезапуска превью избранное на месте.

При этом **ни шапку, ни карточку, ни страницу избранного менять не пришлось**. Они просят `inject(FavoritesStore)` и вызывают `favorites.count()`, `favorites.has(game)`, `favorites.toggle(game)` — у хранилища ровно те же члены, что были у сервиса. Для компонента Signal Store — обычный сервис с сигналами.

## Состояние закрыто

В главе 9 мы закрыли сигнал `state` модификатором `private`, чтобы менять избранное мог только сам сервис. У Signal Store это по умолчанию. Попробуйте поменять состояние снаружи — например, в шапке:

```ts layout/header/header.ts
protected clearFavorites() {
  patchState(this.favorites, { ids: [] });
}
```

TypeScript не пропустит:

```
Argument of type '{ ids: Signal<number[]>; count: Signal<number>; … } & StateSource<{ ids: number[]; }>'
is not assignable to parameter of type 'WritableStateSource<{ ids: number[]; }>'.
  Type 'Signal<number[]>' is missing the following properties from type 'WritableSignal<number[]>': set, update, …
```

Снаружи у хранилища сигналы **только для чтения**, а `patchState` нужен источник с записываемыми. Внутри `withMethods` и `withHooks` `store` — записываемый. Это настройка `protectedState`: по умолчанию `true`, а `signalStore({ protectedState: false }, …)` открыло бы состояние для `patchState` откуда угодно. Документация NgRx советует оставлять как есть. Уберите `clearFavorites` и импорт.

## Эксперименты

**Без `providedIn`.** Уберите `{ providedIn: 'root' }` из `signalStore`. Магазин не запустился, в консоли:

```
NG0201: No provider found for `SignalStore`. Source: Environment Injector.
```

Без настроек хранилище не кладётся ни в какой инжектор — как сервис с `@Service({ autoProvided: false })` из главы 17. Его можно указать в `providers` компонента или маршрута, и тогда у каждого будет свой экземпляр. Обратите внимание на имя в ошибке: `SignalStore`, а не `FavoritesStore`. Это имя класса, который `signalStore` создал внутри себя, — константа, в которую мы его положили, ему не известна. Встретите такую ошибку — ищите хранилище без провайдера. Верните настройку.

**Порядок частей.** Перенесите `withComputed` выше `withState`. TypeScript подчеркнёт `ids` в `({ ids })`: `Property 'ids' does not exist on type '{}'` — выше `withComputed` теперь ничего нет, и хранилище для него пустое. Верните на место.

::: tip Если вы знаете React или Vue
Signal Store похож на Pinia во Vue (`defineStore` с `state`, `getters`, `actions`) и на Zustand в React. Только части здесь — функции, и из них можно собирать свои (шаг 4).
:::

::: deep Под капотом: что вернул `signalStore`
`signalStore` создаёт класс `SignalStore` с декоратором `@Injectable({ providedIn })` и запоминает переданные части. В конструкторе он прогоняет через них «заготовку» хранилища: пустые объекты для сигналов состояния, свойств, методов и хуков. Каждая часть — функция «заготовка → новая заготовка»: `withState` добавляет сигналы, `withComputed` — вычисляемые, `withMethods` — методы. Потом всё найденное копируется в поля экземпляра, и вызывается `onInit`. Поэтому каждая часть видит только то, что было до неё, — она получает заготовку, собранную частями выше.

Подробно — в последнем шаге главы.
:::
