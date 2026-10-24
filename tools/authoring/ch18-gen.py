# Генератор кода шагов главы 18 «NgRx».
# Запуск: python3 tools/authoring/ch18-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 18.
#         python3 tools/authoring/ch18-gen.py dump <папка> — полные снимки шагов в <папка>/<шаг>/<start|solution>
#         (для опытов: tools/e2e/run-dir.mjs и exp.mjs принимают такую папку).
# Старт главы — решение практикума главы 17 (08-practice). Глава переводит хранилища магазина на NgRx:
# избранное и корзину — на Signal Store (сущности, своё расширение сохранения, rxMethod, события),
# затем избранное — на классический Store с эффектами; практикум — «Вы смотрели» на Signal Store.
# Шаги — полные снимки: каждый строится правками (edit) поверх результата предыдущего шага.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, format_snapshots, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/18-ngrx'
BASE = read_dir(step_dir(f'{PROJECT}/content/17-admin/08-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


def put(files, **named):
    """Копия снимка с новыми или заменёнными файлами: put(S, **{'core/x.ts': '…'})."""
    out = dict(files)
    out.update(named)
    return out


def drop(files, *names):
    """Копия снимка без файлов names."""
    out = dict(files)
    for name in names:
        del out[name]
    return out


# ---------- 18.1 Избранное на Signal Store ----------

FAVORITES_1 = """import { effect } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Game } from './models';

// Ключ избранного в localStorage
const STORAGE_KEY = 'hod-konem:favorites:v1';

// Состояние избранного: id игр, отмеченных сердечком
interface FavoritesState {
  ids: number[];
}

// Избранное: игры, которые покупатель отметил сердечком.
// signalStore собирает хранилище из частей и возвращает класс — его выдаёт DI, как наш сервис раньше
export const FavoritesStore = signalStore(
  // Один экземпляр на приложение — как @Service()
  { providedIn: 'root' },
  // Состояние: для каждого поля хранилище заведёт сигнал. Начальное — из localStorage
  withState<FavoritesState>(() => ({ ids: loadFavorites() })),
  // Производные значения: функция становится computed
  withComputed(({ ids }) => ({
    count: () => ids().length,
  })),
  // Действия: менять состояние можно только здесь — через patchState
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
  // Хуки: onInit выполняется, когда хранилище создано, — как конструктор сервиса
  withHooks({
    onInit(store) {
      // Побочный эффект: при каждом изменении избранного записываем его в localStorage
      effect(() =>
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(store.ids()),
        ),
      );
    },
  }),
);

// Избранное из localStorage: только целые положительные id. Есть ли такие игры, скажет сервер
function loadFavorites(): number[] {
  try {
    const ids: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(ids)
      ? ids.filter((id) => Number.isInteger(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}
"""

S1_START = BASE
S1 = put(S1_START, **{'core/favorites-store.ts': FAVORITES_1})


# ---------- 18.2 Корзина на Signal Store ----------

CART_2 = """import {
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
          .map((item) => `${item.game.title} × ${item.quantity}`)
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
        const saved: SavedItem[] = store.items().map((item) => ({
          game: item.game,
          quantity: item.quantity,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
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
"""

S2 = put(S1, **{'core/cart-store.ts': CART_2})


# ---------- 18.3 Позиции корзины — сущности ----------

S3 = edit(S2, 'core/cart-store.ts',
    ("""import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withLinkedState,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
""", """import {
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
"""),
    ("""// Состояние корзины — позиции
interface CartState {
  items: readonly CartItem[];
}
""", """// Позиции корзины — коллекция сущностей. Своего id у позиции нет: ключ — id игры
const cartItems = entityConfig({
  entity: type<CartItem>(),
  selectId: (item) => item.game.id,
});
"""),
    ("""  withState<CartState>(() => ({ items: loadCart() })),
""", """  // Коллекция: состояние entityMap (id → позиция) и ids (порядок), производное entities — массив позиций
  withEntities(cartItems),
"""),
    ("withComputed(({ items, _config }) => {", "withComputed(({ entities, _config }) => {"),
    ("""    const subtotal = computed(() =>
      items().reduce(""", """    const subtotal = computed(() =>
      entities().reduce("""),
    ("""      count: () =>
        items().reduce(""", """      count: () =>
        entities().reduce("""),
    ("""      savings: () =>
        items().reduce(""", """      savings: () =>
        entities().reduce("""),
    ("""        items().length === 0 ||""", """        entities().length === 0 ||"""),
    ("""      summary: () =>
        items()
          .map""", """      summary: () =>
        entities()
          .map"""),
    ("""      // Сколько штук каждой игры в корзине: id игры → количество
      _quantities: () =>
        new Map(
          items().map((item) => [item.game.id, item.quantity]),
        ),
""", ""),
    ("""    const quantityOf = (game: Game): number =>
      store._quantities().get(game.id) ?? 0;""", """    const quantityOf = (game: Game): number =>
      store.entityMap()[game.id]?.quantity ?? 0;"""),
    ("""        patchState(store, ({ items }) => {
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
""", """        if (quantityOf(game) === 0) {
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
"""),
    ("""        patchState(store, ({ items }) => ({
          items: items.map((item) =>
            item.game.id === game.id
              ? { ...item, quantity: allowed }
              : item,
          ),
        }));""", """        patchState(
          store,
          updateEntity(
            { id: game.id, changes: { quantity: allowed } },
            cartItems,
          ),
        );"""),
    ("""        patchState(store, ({ items }) => ({
          items: items.filter(
            (item) => item.game.id !== game.id,
          ),
        }));""", """        patchState(store, removeEntity(game.id));"""),
    ("""        patchState(store, { items: [], promo: null });""", """        patchState(store, removeAllEntities(), { promo: null });"""),
    ("""  withHooks({
    onInit(store) {
      // Побочный эффект: сообщение""", """  withHooks({
    onInit(store) {
      // Позиции из localStorage: коллекция заменяется целиком
      patchState(store, setAllEntities(loadCart(), cartItems));
      // Побочный эффект: сообщение"""),
    ("""        const saved: SavedItem[] = store.items().map(""", """        const saved: SavedItem[] = store.entities().map("""),
)
S3 = edit(S3, 'cart/cart-page/cart-page.html',
    ('@if (cart.items().length > 0) {', '@if (cart.entities().length > 0) {'),
    ('@for (item of cart.items(); track item.game.id) {', '@for (item of cart.entities(); track item.game.id) {'),
)
S3 = edit(S3, 'checkout/checkout-guards.ts', ('cart.items().length > 0', 'cart.ids().length > 0'))
S3 = edit(S3, 'checkout/checkout.ts', ('items: this.cart.items().map((item) => ({', 'items: this.cart.entities().map((item) => ({'))


# ---------- 18.4 Своё расширение: withStorage ----------

STORAGE_TS = """import { effect } from '@angular/core';
import {
  PartialStateUpdater,
  getState,
  patchState,
  signalStoreFeature,
  type,
  withHooks,
} from '@ngrx/signals';

// Как сохранять состояние хранилища в localStorage
export interface StorageConfig<State extends object> {
  // Что записать: из состояния — то, что стоит сохранить
  save: (state: State) => unknown;
  // Что восстановить: прочитанное могли испортить или подменить — поэтому unknown
  restore: (
    saved: unknown,
  ) => Partial<State> | PartialStateUpdater<State>;
}

// Своё расширение Signal Store: хранилище восстанавливается из localStorage при создании
// и записывается туда при каждом изменении состояния
export function withStorage<State extends object>(
  key: string,
  config: StorageConfig<State>,
) {
  return signalStoreFeature(
    // Что расширению нужно от хранилища: состояние типа State. Тип выведется из хранилища
    { state: type<State>() },
    withHooks({
      onInit(store) {
        try {
          const saved: unknown = JSON.parse(
            localStorage.getItem(key) ?? 'null',
          );
          patchState(store, config.restore(saved));
        } catch {
          // Не JSON — остаётся начальное состояние
        }
        // getState читает все сигналы состояния: эффект перезапустится при любом изменении
        effect(() =>
          localStorage.setItem(
            key,
            JSON.stringify(config.save(getState(store))),
          ),
        );
      },
    }),
  );
}
"""

STORAGE_TS_START = STORAGE_TS[:STORAGE_TS.index('    withHooks({')] + """    withHooks({
      onInit(store) {
        // TODO: восстановить — прочитать key из localStorage (JSON.parse), передать в config.restore,
        // результат — в patchState. Не JSON — оставить начальное состояние
        // TODO: записывать — effect: getState(store) → config.save → localStorage.setItem(key, …)
      },
    }),
  );
}
"""
S4_START = put(S3, **{'core/with-storage.ts': STORAGE_TS_START})
S4 = put(S3, **{'core/with-storage.ts': STORAGE_TS})
S4 = edit(S4, 'core/cart-store.ts',
    ("""import { SHOP_CONFIG } from './shop-config';
""", """import { SHOP_CONFIG } from './shop-config';
import { withStorage } from './with-storage';
"""),
    ("""// Что сохраняем о позиции: снимок игры и количество. Каталога в коде больше нет — искать игру по id негде
interface SavedItem {
  game: Game;
  quantity: number;
}

""", ""),
    ("""  withEntities(cartItems),
""", """  withEntities(cartItems),
  // Сохраняем позиции по порядку: снимок игры и количество. Каталога в коде нет — искать игру по id негде
  withStorage(STORAGE_KEY, {
    save: ({ ids, entityMap }) => ids.map((id) => entityMap[id]),
    restore: (saved) => setAllEntities(toCartItems(saved), cartItems),
  }),
"""),
    ("""      // Позиции из localStorage: коллекция заменяется целиком
      patchState(store, setAllEntities(loadCart(), cartItems));
""", ""),
    ("""      // Побочный эффект: при каждом изменении корзины записываем её в localStorage
      effect(() => {
        const saved: SavedItem[] = store.entities().map((item) => ({
          game: item.game,
          quantity: item.quantity,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      });
""", ""),
)
CART_4 = S4['core/cart-store.ts']
CART_4 = CART_4[:CART_4.index('// Корзина из localStorage.')] + """// Позиции из сохранённого. Данные могли испортиться или устареть — ничего не берём на веру
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
"""
S4 = put(S4, **{'core/cart-store.ts': CART_4})

FAVORITES_4 = edit({'f': FAVORITES_1}, 'f',
    ("""import { effect } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Game } from './models';
""", """import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Game } from './models';
import { withStorage } from './with-storage';
"""),
    ("""  // Состояние: для каждого поля хранилище заведёт сигнал. Начальное — из localStorage
  withState<FavoritesState>(() => ({ ids: loadFavorites() })),
""", """  // Состояние: для каждого поля хранилище заведёт сигнал
  withState<FavoritesState>({ ids: [] }),
  // Сохранение — общим расширением, как у корзины
  withStorage(STORAGE_KEY, {
    save: ({ ids }) => ids,
    restore: (saved) => ({ ids: toIds(saved) }),
  }),
"""),
    ("""  // Хуки: onInit выполняется, когда хранилище создано, — как конструктор сервиса
  withHooks({
    onInit(store) {
      // Побочный эффект: при каждом изменении избранного записываем его в localStorage
      effect(() =>
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(store.ids()),
        ),
      );
    },
  }),
""", ""),
    ("""// Избранное из localStorage: только целые положительные id. Есть ли такие игры, скажет сервер
function loadFavorites(): number[] {
  try {
    const ids: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(ids)
      ? ids.filter((id) => Number.isInteger(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}
""", """// Избранное из сохранённого: только целые положительные id. Есть ли такие игры, скажет сервер
function toIds(saved: unknown): number[] {
  return Array.isArray(saved)
    ? saved.filter((id) => Number.isInteger(id) && id > 0)
    : [];
}
"""),
)['f']
S4 = put(S4, **{'core/favorites-store.ts': FAVORITES_4})


# ---------- 18.5 Асинхронность: сверка корзины с сервером (rxMethod) ----------

S5 = edit(S4, 'core/cart-store.ts',
    ("""import {
  computed,
  effect,
  inject,
  injectAsync,
  linkedSignal,
  onIdle,
} from '@angular/core';
""", """import {
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
"""),
    ("""  withMethods,
  withProps,
} from '@ngrx/signals';
""", """  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
"""),
    ("""import {
  addEntity,
  entityConfig,""", """import {
  EntityId,
  addEntity,
  entityConfig,"""),
    ("""} from '@ngrx/signals/entities';
""", """} from '@ngrx/signals/entities';
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
"""),
    ("""const cartItems = entityConfig({
  entity: type<CartItem>(),
  selectId: (item) => item.game.id,
});
""", """const cartItems = entityConfig({
  entity: type<CartItem>(),
  selectId: (item) => item.game.id,
});

// Сверка корзины с сервером: не было, идёт, не удалась
type CheckStatus = 'idle' | 'checking' | 'failed';
"""),
    ("""  withEntities(cartItems),
""", """  withEntities(cartItems),
  withState<{ checkStatus: CheckStatus }>({ checkStatus: 'idle' }),
"""),
    ("""  withHooks({
    onInit(store) {
      // Побочный эффект: сообщение""", """  withMethods((store, http = inject(HttpClient)) => ({
    // Сверить корзину с сервером: свежие цены и остатки игр.
    // Метод на RxJS: новый вызов отменяет незаконченную сверку (switchMap)
    refresh: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { checkStatus: 'checking' })),
        switchMap(() => {
          const ids = store.ids();
          // Все запросы сразу, ответ — когда придут все
          return forkJoin(ids.map((id) => loadGame(http, id))).pipe(
            // Ответ — в состояние, ошибка — тоже. Дальше по потоку ошибка не пойдёт
            tapResponse({
              next: (games) =>
                patchState(
                  store,
                  ...games.map((game, i) => refreshed(ids[i], game)),
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
      // Побочный эффект: сообщение"""),
)
CART_5 = S5['core/cart-store.ts'] + """
// Игра с сервера. Её больше нет в каталоге (404) — null, другие ошибки идут дальше
function loadGame(http: HttpClient, id: EntityId) {
  return http
    .get<Game>(`/api/games/${id}`)
    .pipe(
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 404
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
"""
S5 = put(S5, **{'core/cart-store.ts': CART_5})
S5 = edit(S5, 'cart/cart-page/cart-page.ts',
    ("""  protected readonly cart = inject(CartStore);
  private readonly http = inject(HttpClient);
""", """  protected readonly cart = inject(CartStore);
  private readonly http = inject(HttpClient);

  constructor() {
    // Снимки игр в корзине могли устареть: сверяем с сервером при каждом открытии корзины
    this.cart.refresh();
  }
"""),
)
S5 = edit(S5, 'cart/cart-page/cart-page.html', ("""<h1>Корзина</h1>
""", """<h1>Корзина</h1>
@switch (cart.checkStatus()) {
  @case ('checking') {
    <p class="muted">Сверяем цены и остатки…</p>
  }
  @case ('failed') {
    <p class="error-message">
      Не удалось сверить корзину с сервером.
      <button class="link-button" (click)="cart.refresh()">
        Повторить
      </button>
    </p>
  }
}
"""))


# ---------- 18.6 События: «заказ оформлен» ----------

CHECKOUT_EVENTS = """import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

// События оформления заказа. Событие говорит, что произошло, а не что с этим делать
export const checkoutEvents = eventGroup({
  source: 'Checkout',
  events: {
    // Заказ принят сервером. Тип — данные, которые событие несёт с собой
    orderPlaced: type<{ orderId: number }>(),
  },
});
"""

S6_START = put(S5, **{'checkout/checkout-events.ts': """import { eventGroup } from '@ngrx/signals/events';

// События оформления заказа. Событие говорит, что произошло, а не что с этим делать
// TODO: событие orderPlaced — заказ принят сервером, данные — { orderId: number } (type из '@ngrx/signals')
export const checkoutEvents = eventGroup({
  source: 'Checkout',
  events: {},
});
"""})
S6 = put(S5, **{'checkout/checkout-events.ts': CHECKOUT_EVENTS})
S6 = edit(S6, 'core/cart-store.ts',
    ("""import { rxMethod } from '@ngrx/signals/rxjs-interop';
""", """import {
  Events,
  on,
  withEventHandlers,
  withReducer,
} from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
"""),
    ("""import { CartItem, Game, Promo } from './models';
""", """import { checkoutEvents } from '../checkout/checkout-events';
import { CartItem, Game, Promo } from './models';
"""),
    ("""    return {
      quantityOf,
      available,
""", """    return {
      quantityOf,
      available,
      // Закрытый метод: снаружи не виден, но части ниже им пользуются
      _track: track,
"""),
    ("""  withHooks({
    onInit(store) {
      // Побочный эффект: сообщение""", """  // Как состояние меняется от событий. Заказ оформлен — корзина начинается заново
  withReducer(
    on(checkoutEvents.orderPlaced, () => [
      removeAllEntities(),
      { promo: null },
    ]),
  ),
  // Побочные эффекты событий: поток событий нужного типа — и что с ними делать
  withEventHandlers((store, events = inject(Events)) => ({
    trackOrder$: events
      .on(checkoutEvents.orderPlaced)
      .pipe(
        tap(({ payload }) =>
          store._track('Заказ оформлен', `№${payload.orderId}`),
        ),
      ),
  })),
  withHooks({
    onInit(store) {
      // Побочный эффект: сообщение"""),
)
S6 = edit(S6, 'checkout/checkout.ts',
    ("""import { RouterLink } from '@angular/router';
""", """import { RouterLink } from '@angular/router';
import { injectDispatch } from '@ngrx/signals/events';
"""),
    ("""import { PricePipe } from '../shared/price-pipe';
""", """import { PricePipe } from '../shared/price-pipe';
import { checkoutEvents } from './checkout-events';
"""),
    ("""  private readonly http = inject(HttpClient);
  // Номер оформленного заказа.""", """  private readonly http = inject(HttpClient);
  // Отправка событий оформления: dispatch.orderPlaced(…) создаёт событие и отправляет его
  private readonly dispatch = injectDispatch(checkoutEvents);
  // Номер оформленного заказа."""),
    ("""      this.orderId.set(order.id);
      this.cart.clear();
""", """      this.orderId.set(order.id);
      // Сообщаем, что произошло. Кто очистит корзину и что ещё случится — решают получатели
      this.dispatch.orderPlaced({ orderId: order.id });
"""),
)


# ---------- 18.7 Классический Store: избранное ----------

CARD_ACTIONS = """import { createActionGroup, props } from '@ngrx/store';

// Действия карточки игры — что в ней произошло. Тип действия: '[Game Card] Favorite Toggled'
export const GameCardActions = createActionGroup({
  source: 'Game Card',
  events: {
    // props — данные, которые действие несёт с собой
    'Favorite Toggled': props<{ gameId: number }>(),
  },
});
"""

FAVORITES_FEATURE_7 = """import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { GameCardActions } from '../shared/game-card/game-card-actions';

// Состояние избранного: id игр, отмеченных сердечком
interface FavoritesState {
  ids: number[];
}

const initialState: FavoritesState = { ids: [] };

// Избранное в классическом Store: часть общего состояния под ключом favorites
export const favoritesFeature = createFeature({
  name: 'favorites',
  // Редьюсер: чистая функция (состояние, действие) → новое состояние
  reducer: createReducer(
    initialState,
    on(GameCardActions.favoriteToggled, (state, { gameId }) => ({
      ids: state.ids.includes(gameId)
        ? state.ids.filter((id) => id !== gameId)
        : [...state.ids, gameId],
    })),
  ),
  // Селекторы selectFavoritesState и selectIds createFeature создаст сам, свои — здесь
  extraSelectors: ({ selectIds }) => ({
    selectCount: createSelector(selectIds, (ids) => ids.length),
  }),
});
"""

S7_START = put(S6, **{
    'shared/game-card/game-card-actions.ts': """import { createActionGroup } from '@ngrx/store';

// Действия карточки игры — что в ней произошло
// TODO: действие 'Favorite Toggled' с данными { gameId: number } (props из '@ngrx/store')
export const GameCardActions = createActionGroup({
  source: 'Game Card',
  events: {},
});
""",
    'core/favorites-feature.ts': """import { createFeature, createReducer } from '@ngrx/store';

// Состояние избранного: id игр, отмеченных сердечком
interface FavoritesState {
  ids: number[];
}

const initialState: FavoritesState = { ids: [] };

// Избранное в классическом Store: часть общего состояния под ключом favorites
export const favoritesFeature = createFeature({
  name: 'favorites',
  // TODO: on(GameCardActions.favoriteToggled, …) — добавить id или убрать, если он уже есть
  reducer: createReducer(initialState),
  // TODO: extraSelectors — selectCount: сколько игр в избранном
});
""",
})
S7 = drop(S6, 'core/favorites-store.ts')
S7 = put(S7, **{
    'shared/game-card/game-card-actions.ts': CARD_ACTIONS,
    'core/favorites-feature.ts': FAVORITES_FEATURE_7,
})
S7 = edit(S7, 'app.config.ts',
    ("""import localeRu from '@angular/common/locales/ru';
""", """import localeRu from '@angular/common/locales/ru';
import { provideState, provideStore } from '@ngrx/store';
"""),
    ("""import { cacheInterceptor } from './core/cache-interceptor';
""", """import { cacheInterceptor } from './core/cache-interceptor';
import { favoritesFeature } from './core/favorites-feature';
"""),
    ("""    // Роутер: карта маршрутов и его возможности""", """    // Классический Store: одно состояние на всё приложение. provideState добавляет в него часть
    provideStore(),
    provideState(favoritesFeature),
    // Роутер: карта маршрутов и его возможности"""),
)
S7 = edit(S7, 'shared/game-card/game-card.ts',
    ("""import { RouterLink } from '@angular/router';
""", """import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
"""),
    ("""import { FavoritesStore } from '../../core/favorites-store';
""", """import { favoritesFeature } from '../../core/favorites-feature';
"""),
    ("""import { Tooltip } from '../tooltip';
""", """import { Tooltip } from '../tooltip';
import { GameCardActions } from './game-card-actions';
"""),
    ("""  // Избранное — тоже общее: сердечко в карточке и счётчик в шапке
  protected readonly favorites = inject(FavoritesStore);
  protected readonly isFavorite = computed(() =>
    this.favorites.has(this.game()),
  );
""", """  // Избранное — в классическом Store: читаем селектором, меняем действием
  private readonly store = inject(Store);
  private readonly favoriteIds = this.store.selectSignal(
    favoritesFeature.selectIds,
  );
  protected readonly isFavorite = computed(() =>
    this.favoriteIds().includes(this.game().id),
  );
"""),
    ("""  // «В корзину»: игра — в корзину, обложка — в полёт""", """  // Сердечко: сообщаем Store, что произошло, — состояние поменяет редьюсер
  protected toggleFavorite() {
    this.store.dispatch(
      GameCardActions.favoriteToggled({ gameId: this.game().id }),
    );
  }

  // «В корзину»: игра — в корзину, обложка — в полёт"""),
)
S7 = edit(S7, 'shared/game-card/game-card.html', ('(click)="favorites.toggle(game())"', '(click)="toggleFavorite()"'))
S7 = edit(S7, 'shared/game-card/game-card.spec.ts',
    ("""import { provideRouter } from '@angular/router';
""", """import { provideRouter } from '@angular/router';
import { provideState, provideStore } from '@ngrx/store';
"""),
    ("""import { CartStore } from '../../core/cart-store';
""", """import { CartStore } from '../../core/cart-store';
import { favoritesFeature } from '../../core/favorites-feature';
"""),
    ("""    // Избранное читает localStorage, когда создаётся
    localStorage.clear();""", """    // Корзина читает localStorage, когда создаётся
    localStorage.clear();"""),
    ("""        provideRouter([]),
""", """        provideRouter([]),
        // Избранное — в Store: без него сердечку негде взять состояние
        provideStore(),
        provideState(favoritesFeature),
"""),
)
S7 = edit(S7, 'layout/header/header.ts',
    ("""import { FavoritesStore } from '../../core/favorites-store';
""", """import { Store } from '@ngrx/store';
import { favoritesFeature } from '../../core/favorites-feature';
"""),
    ("""  protected readonly favorites = inject(FavoritesStore);
""", """  // Сколько игр в избранном: селектор из Store, прочитанный как сигнал
  protected readonly favoritesCount = inject(Store).selectSignal(
    favoritesFeature.selectCount,
  );
"""),
)
S7 = edit(S7, 'layout/header/header.html', ('>♥ {{ favorites.count() }}</a', '>♥ {{ favoritesCount() }}</a'))
S7 = edit(S7, 'account/favorites-page/favorites-page.ts',
    ("""import { RouterLink } from '@angular/router';
""", """import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
"""),
    ("""import { FavoritesStore } from '../../core/favorites-store';
""", """import { favoritesFeature } from '../../core/favorites-feature';
"""),
    ("""  protected readonly favorites = inject(FavoritesStore);
""", """  // id игр в избранном — из Store
  protected readonly ids = inject(Store).selectSignal(
    favoritesFeature.selectIds,
  );
"""),
    ("""      const ids = this.favorites.ids();""", """      const ids = this.ids();"""),
)
S7 = edit(S7, 'account/favorites-page/favorites-page.html', ('@if (favorites.count() === 0) {', '@if (ids().length === 0) {'))


# ---------- 18.8 Эффекты и журнал действий ----------

FAVORITES_EFFECTS = """import { inject } from '@angular/core';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import {
  Actions,
  ROOT_EFFECTS_INIT,
  createEffect,
  ofType,
} from '@ngrx/effects';
import { map, tap } from 'rxjs';
import { GameCardActions } from '../shared/game-card/game-card-actions';
import { FavoritesStorageActions } from './favorites-storage-actions';
import { favoritesFeature } from './favorites-feature';

// Ключ избранного в localStorage
const STORAGE_KEY = 'hod-konem:favorites:v1';

// Эффект: при запуске эффектов прочитать избранное и сообщить об этом действием
export const restoreFavorites = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() =>
        FavoritesStorageActions.restored({ ids: readIds() }),
      ),
    ),
  { functional: true },
);

// Эффект: после каждого переключения сердечка записать избранное.
// dispatch: false — эффект ничего не отправляет обратно в Store
export const saveFavorites = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) =>
    actions$.pipe(
      ofType(GameCardActions.favoriteToggled),
      // К действию — текущие id из Store: редьюсер уже обработал это действие
      concatLatestFrom(() =>
        store.select(favoritesFeature.selectIds),
      ),
      tap(([, ids]) =>
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)),
      ),
    ),
  { functional: true, dispatch: false },
);

// Избранное из localStorage: только целые положительные id. Есть ли такие игры, скажет сервер
function readIds(): number[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(saved)
      ? saved.filter((id) => Number.isInteger(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}
"""

ACTION_LOG = """import { isDevMode } from '@angular/core';
import { ActionReducer, MetaReducer } from '@ngrx/store';

// Мета-редьюсер — обёртка вокруг редьюсера всего Store: видит каждое действие и состояние после него
function logActions(reducer: ActionReducer<object>): ActionReducer<object> {
  return (state, action) => {
    const next = reducer(state, action);
    console.log('Действие:', action.type, JSON.stringify(next));
    return next;
  };
}

// Журнал — только при разработке
export const metaReducers: MetaReducer[] = isDevMode()
  ? [logActions]
  : [];
"""

STORAGE_ACTIONS = """import { createActionGroup, props } from '@ngrx/store';

// Действия хранилища браузера: избранное прочитано из localStorage
export const FavoritesStorageActions = createActionGroup({
  source: 'Favorites Storage',
  events: {
    Restored: props<{ ids: number[] }>(),
  },
});
"""

EFFECTS_START = FAVORITES_EFFECTS[:FAVORITES_EFFECTS.index('// Эффект: при запуске')] + """// TODO: эффект restoreFavorites — на ROOT_EFFECTS_INIT отправить FavoritesStorageActions.restored({ ids: readIds() })

// TODO: эффект saveFavorites — после GameCardActions.favoriteToggled записать id из Store в localStorage
// (concatLatestFrom + store.select(favoritesFeature.selectIds)); ничего не отправляет: dispatch: false

""" + FAVORITES_EFFECTS[FAVORITES_EFFECTS.index('// Избранное из localStorage'):]
S8_START = put(S7, **{
    'core/favorites-storage-actions.ts': STORAGE_ACTIONS,
    'core/favorites-effects.ts': EFFECTS_START,
    'core/action-log.ts': ACTION_LOG,
})
S8 = put(S7, **{
    'core/favorites-storage-actions.ts': STORAGE_ACTIONS,
    'core/favorites-effects.ts': FAVORITES_EFFECTS,
    'core/action-log.ts': ACTION_LOG,
})
S8 = edit(S8, 'core/favorites-feature.ts',
    ("""import { GameCardActions } from '../shared/game-card/game-card-actions';
""", """import { GameCardActions } from '../shared/game-card/game-card-actions';
import { FavoritesStorageActions } from './favorites-storage-actions';
"""),
    ("""        : [...state.ids, gameId],
    })),
  ),""", """        : [...state.ids, gameId],
    })),
    // Избранное прочитано из localStorage — оно и есть состояние
    on(FavoritesStorageActions.restored, (_, { ids }) => ({ ids })),
  ),"""),
)
S8 = edit(S8, 'app.config.ts',
    ("""import { provideState, provideStore } from '@ngrx/store';
""", """import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
"""),
    ("""import { authInterceptor } from './core/auth-interceptor';
""", """import { metaReducers } from './core/action-log';
import { authInterceptor } from './core/auth-interceptor';
"""),
    ("""import { favoritesFeature } from './core/favorites-feature';
""", """import {
  restoreFavorites,
  saveFavorites,
} from './core/favorites-effects';
import { favoritesFeature } from './core/favorites-feature';
"""),
    ("""    provideStore(),
    provideState(favoritesFeature),
""", """    // metaReducers — обёртки вокруг редьюсеров: журнал действий
    provideStore({}, { metaReducers }),
    provideState(favoritesFeature),
    // Эффекты: побочные действия в ответ на действия — сохранение избранного
    provideEffects({ restoreFavorites, saveFavorites }),
"""),
)


# ---------- 18.9 Практикум: «Вы смотрели» ----------

RECENT_STORE = """import {
  patchState,
  signalMethod,
  signalStore,
  withMethods,
} from '@ngrx/signals';
import {
  prependEntity,
  removeEntities,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { Game } from './models';
import { withStorage } from './with-storage';

// Ключ списка в localStorage
const STORAGE_KEY = 'hod-konem:recent:v1';
// Сколько последних игр помнить
const MAX_RECENT = 4;

// «Вы смотрели»: последние открытые игры, самая свежая — первой
export const RecentStore = signalStore(
  { providedIn: 'root' },
  // Коллекция игр: у игры есть id — selectId не нужен
  withEntities<Game>(),
  withStorage(STORAGE_KEY, {
    save: ({ ids, entityMap }) => ids.map((id) => entityMap[id]),
    restore: (saved) => setAllEntities(toGames(saved)),
  }),
  withMethods((store) => ({
    // Запомнить игру. Принимает и сигнал: тогда запоминает каждое новое значение.
    // undefined — игра ещё не загрузилась, запоминать нечего
    remember: signalMethod<Game | undefined>((game) => {
      if (!game) {
        return;
      }
      // Кто выпадет из списка: все, кроме этой игры, после первых MAX_RECENT − 1
      const extra = store
        .ids()
        .filter((id) => id !== game.id)
        .slice(MAX_RECENT - 1);
      // Игра уже в списке — переезжает в начало: убрать и добавить первой
      patchState(
        store,
        removeEntity(game.id),
        prependEntity(game),
        removeEntities(extra),
      );
    }),
  })),
);

// Игры из сохранённого: только объекты с числовым id и названием, не больше MAX_RECENT
function toGames(saved: unknown): Game[] {
  return Array.isArray(saved)
    ? saved
        .filter(
          (game: Partial<Game> | null) =>
            Number.isInteger(game?.id) &&
            typeof game?.title === 'string',
        )
        .slice(0, MAX_RECENT)
    : [];
}
"""

RECENT_STORE_START = """import { signalStore, withState } from '@ngrx/signals';

// TODO: «Вы смотрели» — последние MAX_RECENT открытых игр, самая свежая первой.
// Коллекция игр (withEntities), сохранение в localStorage (withStorage, ключ 'hod-konem:recent:v1')
// и метод remember на signalMethod<Game | undefined>
export const RecentStore = signalStore(
  { providedIn: 'root' },
  withState({}),
);
"""

HOME_RECENT_CSS = """
/* «Вы смотрели»: обложки последних игр в один ряд */
.recent {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 96px));
  gap: 8px;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}

.recent img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
}
"""

S9_START = put(S8, **{'core/recent-store.ts': RECENT_STORE_START})
S9_START = edit(S9_START, 'home/home.css', ("""  font-size: 18px;
}
""", """  font-size: 18px;
}
""" + HOME_RECENT_CSS))
S9 = put(S9_START, **{'core/recent-store.ts': RECENT_STORE})
S9 = edit(S9, 'game/game-page.ts',
    ("""import { Game } from '../core/models';
""", """import { Game } from '../core/models';
import { RecentStore } from '../core/recent-store';
"""),
    ("""  protected readonly cart = inject(CartStore);
  // Сколько штук этой игры уже в корзине""", """  protected readonly cart = inject(CartStore);

  constructor() {
    // «Вы смотрели»: каждая загруженная игра. Вызов в конструкторе — слежение закончится вместе со страницей
    inject(RecentStore).remember(() =>
      this.game.hasValue() ? this.game.value() : undefined,
    );
  }

  // Сколько штук этой игры уже в корзине"""),
)
S9 = edit(S9, 'home/home.ts',
    ("""import { GamesPage } from '../core/models';
""", """import { GamesPage } from '../core/models';
import { RecentStore } from '../core/recent-store';
"""),
    ("""  private readonly config = inject(SHOP_CONFIG);
""", """  private readonly config = inject(SHOP_CONFIG);
  // Последние открытые игры
  protected readonly recent = inject(RecentStore);
"""),
)
S9 = edit(S9, 'home/home.html', ("""  <a class="button" routerLink="/catalog">Весь каталог</a>
</section>
""", """  <a class="button" routerLink="/catalog">Весь каталог</a>
</section>

@if (recent.entities().length > 0) {
  <h2 class="section-title">Вы смотрели</h2>
  <ul class="recent">
    @for (game of recent.entities(); track game.id) {
      <li>
        <a [routerLink]="['/games', game.id]">
          <img
            [src]="game.cover"
            [alt]="game.title"
            width="300"
            height="400"
          />
        </a>
      </li>
    }
  </ul>
}
"""))


steps = {
    '01-signal-store': {'start': S1_START, 'solution': S1},
    '02-cart-store': {'start': S1, 'solution': S2},
    '03-entities': {'start': S2, 'solution': S3},
    '04-custom-feature': {'start': S4_START, 'solution': S4},
    '05-rx-method': {'start': S4, 'solution': S5},
    '06-events': {'start': S6_START, 'solution': S6},
    '07-classic-store': {'start': S7_START, 'solution': S7},
    '08-effects': {'start': S8_START, 'solution': S8},
    '09-practice': {'start': S9_START, 'solution': S9},
    '10-store-inside': {'start': S9},
}


def dump(target):
    """Полные снимки шагов (отформатированные) — в target/<шаг>/<start|solution>/ для опытов."""
    kinds = [(step, kind, spec[kind]) for step, spec in steps.items() for kind in ('start', 'solution') if spec.get(kind) is not None]
    for (step, kind, _), files in zip(kinds, format_snapshots([files for _, _, files in kinds])):
        path = os.path.join(target, step, kind)
        shutil.rmtree(path, ignore_errors=True)
        for name, code in files.items():
            full = os.path.join(path, name)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'w') as f:
                f.write(code)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'dump':
        dump(sys.argv[2])
    else:
        write_steps(ROOT, steps, base='17-admin/08-practice')
    print('ok')
