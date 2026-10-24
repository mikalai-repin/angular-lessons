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
  withComputed,
  withHooks,
  withLinkedState,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { CartItem, Game, Promo } from './models';
import { SHOP_CONFIG } from './shop-config';

// Ключ корзины в localStorage. Формат поменялся (снимок игры вместо id) — поменяли и версию в ключе
const STORAGE_KEY = 'hod-konem:cart:v2';

// Что сохраняем о позиции: снимок игры и количество. Каталога в коде больше нет — искать игру по id негде
interface SavedItem {
  game: Game;
  quantity: number;
}

// Состояние корзины — позиции
interface CartState {
  items: readonly CartItem[];
}

// Корзина магазина: позиции, количество, сумма и действия с ними.
// Части идут по порядку: каждая видит то, что добавили части выше
export const CartStore = signalStore(
  { providedIn: 'root' },
  withState<CartState>(() => ({ items: loadCart() })),
  // Свойства: зависимости хранилища. Имя с «_» — закрытый член: снаружи его не видно
  withProps(() => ({
    _config: inject(SHOP_CONFIG),
    // Аналитика не нужна для первой отрисовки: модуль загрузится, когда браузер освободится
    _analytics: injectAsync(
      () => import('./analytics').then((m) => m.Analytics),
      { prefetch: onIdle },
    ),
  })),
  withComputed(({ items, _config }) => {
    // Сумма по ценам игр — её показывает шапка. Нужна и доставке ниже, поэтому — отдельный computed
    const subtotal = computed(() =>
      items().reduce(
        (sum, item) => sum + item.game.price * item.quantity,
        0,
      ),
    );
    return {
      subtotal,
      count: () =>
        items().reduce((sum, item) => sum + item.quantity, 0),
      // Сколько покупатель экономит на играх со скидкой: разница со старой ценой
      savings: () =>
        items().reduce(
          (sum, item) =>
            sum +
            ((item.game.oldPrice ?? item.game.price) -
              item.game.price) *
              item.quantity,
          0,
        ),
      // Доставка: бесплатно от порога, иначе по тарифу. У пустой корзины доставки нет
      delivery: () =>
        items().length === 0 ||
        subtotal() >= _config.freeDeliveryFrom
          ? 0
          : _config.deliveryPrice,
      deliveryLeft: () =>
        Math.max(_config.freeDeliveryFrom - subtotal(), 0),
      summary: () =>
        items()
          .map(
            (item) => `${item.game.title} × ${item.quantity}`,
          )
          .join(', '),
      // Сколько штук каждой игры в корзине: id игры → количество
      _quantities: () =>
        new Map(
          items().map((item) => [item.game.id, item.quantity]),
        ),
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
      store._quantities().get(game.id) ?? 0;
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
        patchState(store, ({ items }) => {
          const existing = items.find(
            (item) => item.game.id === game.id,
          );
          return {
            items: existing
              ? items.map((item) =>
                  item === existing
                    ? { ...item, quantity: item.quantity + 1 }
                    : item,
                )
              : [...items, { game, quantity: 1 }],
          };
        });
        track('В корзину', game.title);
      },

      setQuantity(game: Game, quantity: number) {
        // От одной штуки до остатка на складе — что бы ни пришло снаружи
        const allowed = Math.min(
          Math.max(quantity, 1),
          game.inStock,
        );
        patchState(store, ({ items }) => ({
          items: items.map((item) =>
            item.game.id === game.id
              ? { ...item, quantity: allowed }
              : item,
          ),
        }));
      },

      remove(game: Game) {
        patchState(store, ({ items }) => ({
          items: items.filter(
            (item) => item.game.id !== game.id,
          ),
        }));
      },

      // Очистили корзину — начинаем заново: промокод тоже снимаем
      clear() {
        patchState(store, { items: [], promo: null });
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
      // Побочный эффект: сообщение в консоли при каждом изменении корзины
      effect(() => {
        console.log('Корзина:', store.summary() || 'пусто');
      });
      // Побочный эффект: при каждом изменении корзины записываем её в localStorage
      effect(() => {
        const saved: SavedItem[] = store
          .items()
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
