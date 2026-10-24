import {
  computed,
  effect,
  inject,
  injectAsync,
  linkedSignal,
  onIdle,
} from '@angular/core';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withLinkedState,
  withMethods,
  withProps,
} from '@ngrx/signals';
import {
  addEntity,
  entityConfig,
  removeAllEntities,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { CartItem, Game, Promo } from './models';
import { SHOP_CONFIG } from './shop-config';

// Ключ корзины в localStorage. Формат поменялся (снимок игры вместо id) — поменяли и версию в ключе
const STORAGE_KEY = 'hod-konem:cart:v2';

// Что сохраняем о позиции: снимок игры и количество. Каталога в коде больше нет — искать игру по id негде
interface SavedItem {
  game: Game;
  quantity: number;
}

// Позиции корзины — коллекция сущностей. Своего id у позиции нет: ключ — id игры
const cartItems = entityConfig({
  entity: type<CartItem>(),
  selectId: (item) => item.game.id,
});

// Корзина магазина: позиции, количество, сумма и действия с ними.
// Части идут по порядку: каждая видит то, что добавили части выше
export const CartStore = signalStore(
  { providedIn: 'root' },
  // Коллекция: состояние entityMap (id → позиция) и ids (порядок), производное entities — массив позиций
  withEntities(cartItems),
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
  withHooks({
    onInit(store) {
      // Позиции из localStorage: коллекция заменяется целиком
      patchState(store, setAllEntities(loadCart(), cartItems));
      // Побочный эффект: сообщение в консоли при каждом изменении корзины
      effect(() => {
        console.log('Корзина:', store.summary() || 'пусто');
      });
      // Побочный эффект: при каждом изменении корзины записываем её в localStorage
      effect(() => {
        const saved: SavedItem[] = store
          .entities()
          .map((item) => ({
            game: item.game,
            quantity: item.quantity,
          }));
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(saved),
        );
      });
    },
  }),
);

// Тип экземпляра хранилища — под тем же именем, что и класс: let cart: CartStore
export type CartStore = InstanceType<typeof CartStore>;

// Корзина из localStorage. Данные могли испортиться или устареть — ничего не берём на веру
function loadCart(): CartItem[] {
  try {
    const saved: SavedItem[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    // Снимок мог устареть: цену и остаток сверит сервер, когда покупатель оформит заказ
    return saved.flatMap(({ game, quantity }) => {
      return game &&
        game.inStock > 0 &&
        Number.isInteger(quantity) &&
        quantity > 0
        ? [{ game, quantity: Math.min(quantity, game.inStock) }]
        : [];
    });
  } catch {
    // Не JSON или не массив — начинаем с пустой корзины
    return [];
  }
}
