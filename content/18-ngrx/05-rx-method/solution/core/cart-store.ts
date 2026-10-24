import {
  computed,
  effect,
  inject,
  injectAsync,
  linkedSignal,
  onIdle,
} from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withLinkedState,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import {
  EntityId,
  addEntity,
  entityConfig,
  removeAllEntities,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  forkJoin,
  of,
  pipe,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { CartItem, Game, Promo } from './models';
import { SHOP_CONFIG } from './shop-config';
import { withStorage } from './with-storage';

// Ключ корзины в localStorage. Формат поменялся (снимок игры вместо id) — поменяли и версию в ключе
const STORAGE_KEY = 'hod-konem:cart:v2';

// Позиции корзины — коллекция сущностей. Своего id у позиции нет: ключ — id игры
const cartItems = entityConfig({
  entity: type<CartItem>(),
  selectId: (item) => item.game.id,
});

// Сверка корзины с сервером: не было, идёт, не удалась
type CheckStatus = 'idle' | 'checking' | 'failed';

// Корзина магазина: позиции, количество, сумма и действия с ними.
// Части идут по порядку: каждая видит то, что добавили части выше
export const CartStore = signalStore(
  { providedIn: 'root' },
  // Коллекция: состояние entityMap (id → позиция) и ids (порядок), производное entities — массив позиций
  withEntities(cartItems),
  withState<{ checkStatus: CheckStatus }>({
    checkStatus: 'idle',
  }),
  // Сохраняем позиции по порядку: снимок игры и количество. Каталога в коде нет — искать игру по id негде
  withStorage(STORAGE_KEY, {
    save: ({ ids, entityMap }) =>
      ids.map((id) => entityMap[id]),
    restore: (saved) =>
      setAllEntities(toCartItems(saved), cartItems),
  }),
  // Свойства: зависимости хранилища. Имя с «_» — закрытый член: снаружи его не видно
  withProps(() => ({
    _config: inject(SHOP_CONFIG),
    // Аналитика не нужна для первой отрисовки: модуль загрузится, когда браузер освободится
    _analytics: injectAsync(
      () => import('./analytics').then((m) => m.Analytics),
      { prefetch: onIdle },
    ),
  })),
  withComputed(({ entities, _config }) => {
    // Сумма по ценам игр — её показывает шапка. Нужна и доставке ниже, поэтому — отдельный computed
    const subtotal = computed(() =>
      entities().reduce(
        (sum, item) => sum + item.game.price * item.quantity,
        0,
      ),
    );
    return {
      subtotal,
      count: () =>
        entities().reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
      // Сколько покупатель экономит на играх со скидкой: разница со старой ценой
      savings: () =>
        entities().reduce(
          (sum, item) =>
            sum +
            ((item.game.oldPrice ?? item.game.price) -
              item.game.price) *
              item.quantity,
          0,
        ),
      // Доставка: бесплатно от порога, иначе по тарифу. У пустой корзины доставки нет
      delivery: () =>
        entities().length === 0 ||
        subtotal() >= _config.freeDeliveryFrom
          ? 0
          : _config.deliveryPrice,
      deliveryLeft: () =>
        Math.max(_config.freeDeliveryFrom - subtotal(), 0),
      summary: () =>
        entities()
          .map(
            (item) => `${item.game.title} × ${item.quantity}`,
          )
          .join(', '),
    };
  }),
  // Связанное состояние: промокод. Сумма товаров стала меньше порога — он снимается и сам не вернётся
  withLinkedState(({ subtotal }) => ({
    promo: linkedSignal<number, Promo | null>({
      source: subtotal,
      computation: (subtotal, previous) => {
        const promo = previous?.value ?? null;
        return promo &&
          'minTotal' in promo &&
          subtotal < promo.minTotal
          ? null
          : promo;
      },
    }),
  })),
  // Эти производные зависят от промокода — поэтому они ниже withLinkedState
  withComputed(({ subtotal, delivery, promo }) => {
    // Скидка по промокоду, ₽
    const promoDiscount = computed(() => {
      const applied = promo();
      if (!applied) {
        return 0;
      }
      return 'percent' in applied
        ? Math.round((subtotal() * applied.percent) / 100)
        : applied.amount;
    });
    return {
      promoDiscount,
      // К оплате: товары минус промокод плюс доставка
      total: () => subtotal() - promoDiscount() + delivery(),
    };
  }),
  withMethods((store) => {
    // Метод читает сигнал, поэтому шаблон или computed, которые его вызвали, тоже зависят от корзины
    const quantityOf = (game: Game): number =>
      store.entityMap()[game.id]?.quantity ?? 0;
    // Сколько ещё штук игры можно положить в корзину: остаток на складе минус то, что уже в корзине
    const available = (game: Game): number =>
      game.inStock - quantityOf(game);
    // Событие — в аналитику. Аналитика не важнее покупки: ошибка не уходит дальше
    const track = (event: string, details: string) =>
      store
        ._analytics()
        .then((analytics) => analytics.track(event, details))
        .catch(() => {});

    return {
      quantityOf,
      available,

      add(game: Game) {
        // Склад пуст или всё, что есть, уже в корзине
        if (available(game) <= 0) {
          return;
        }
        if (quantityOf(game) === 0) {
          patchState(
            store,
            addEntity({ game, quantity: 1 }, cartItems),
          );
        } else {
          patchState(
            store,
            updateEntity(
              {
                id: game.id,
                changes: (item) => ({
                  quantity: item.quantity + 1,
                }),
              },
              cartItems,
            ),
          );
        }
        track('В корзину', game.title);
      },

      setQuantity(game: Game, quantity: number) {
        // От одной штуки до остатка на складе — что бы ни пришло снаружи
        const allowed = Math.min(
          Math.max(quantity, 1),
          game.inStock,
        );
        patchState(
          store,
          updateEntity(
            { id: game.id, changes: { quantity: allowed } },
            cartItems,
          ),
        );
      },

      remove(game: Game) {
        patchState(store, removeEntity(game.id));
      },

      // Очистили корзину — начинаем заново: промокод тоже снимаем
      clear() {
        patchState(store, removeAllEntities(), { promo: null });
      },

      // Применить промокод, который прислал сервер. Не хватает суммы товаров — не применяется
      applyPromo(promo: Promo): boolean {
        if (
          'minTotal' in promo &&
          store.subtotal() < promo.minTotal
        ) {
          return false;
        }
        patchState(store, { promo });
        return true;
      },

      removePromo() {
        patchState(store, { promo: null });
      },
    };
  }),
  withMethods((store, http = inject(HttpClient)) => ({
    // Сверить корзину с сервером: свежие цены и остатки игр.
    // Метод на RxJS: новый вызов отменяет незаконченную сверку (switchMap)
    refresh: rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, { checkStatus: 'checking' }),
        ),
        switchMap(() => {
          const ids = store.ids();
          // Все запросы сразу, ответ — когда придут все
          return forkJoin(
            ids.map((id) => loadGame(http, id)),
          ).pipe(
            // Ответ — в состояние, ошибка — тоже. Дальше по потоку ошибка не пойдёт
            tapResponse({
              next: (games) =>
                patchState(
                  store,
                  ...games.map((game, i) =>
                    refreshed(ids[i], game),
                  ),
                  { checkStatus: 'idle' },
                ),
              error: () =>
                patchState(store, { checkStatus: 'failed' }),
            }),
          );
        }),
      ),
    ),
  })),
  withHooks({
    onInit(store) {
      // Побочный эффект: сообщение в консоли при каждом изменении корзины
      effect(() => {
        console.log('Корзина:', store.summary() || 'пусто');
      });
    },
  }),
);

// Тип экземпляра хранилища — под тем же именем, что и класс: let cart: CartStore
export type CartStore = InstanceType<typeof CartStore>;

// Позиции из сохранённого. Данные могли испортиться или устареть — ничего не берём на веру
function toCartItems(saved: unknown): CartItem[] {
  if (!Array.isArray(saved)) {
    return [];
  }
  // Снимок мог устареть: цену и остаток сверит сервер, когда покупатель оформит заказ
  return saved.flatMap((item: Partial<CartItem> | null) => {
    const game = item?.game;
    const quantity = item?.quantity ?? 0;
    return game &&
      game.inStock > 0 &&
      Number.isInteger(quantity) &&
      quantity > 0
      ? [{ game, quantity: Math.min(quantity, game.inStock) }]
      : [];
  });
}

// Игра с сервера. Её больше нет в каталоге (404) — null, другие ошибки идут дальше
function loadGame(http: HttpClient, id: EntityId) {
  return http
    .get<Game>(`/api/games/${id}`)
    .pipe(
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse &&
        error.status === 404
          ? of(null)
          : throwError(() => error),
      ),
    );
}

// Позиция после сверки: игры нет или она закончилась — убрать, иначе — свежий снимок
// и не больше, чем осталось на складе
function refreshed(id: EntityId, game: Game | null) {
  return !game || game.inStock === 0
    ? removeEntity(id)
    : updateEntity<CartItem>(
        {
          id,
          changes: (item) => ({
            game,
            quantity: Math.min(item.quantity, game.inStock),
          }),
        },
        cartItems,
      );
}
