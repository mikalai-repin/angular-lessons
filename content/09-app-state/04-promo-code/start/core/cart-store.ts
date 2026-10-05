import {
  Service,
  computed,
  effect,
  inject,
  injectAsync,
  onIdle,
  signal,
} from '@angular/core';
import { GAMES } from './games-data';
import { CartItem, Game } from './models';
import { SHOP_CONFIG } from './shop-config';

// Ключ корзины в localStorage. Версия в имени: поменяется формат — поменяем ключ, и старые данные не помешают
const STORAGE_KEY = 'hod-konem:cart:v1';

// Что сохраняем о позиции: только id игры и количество. Название, цену и остаток берём из каталога
interface SavedItem {
  id: number;
  quantity: number;
}

// Корзина магазина: позиции, количество, сумма и действия с ними.
// @Service() — Angular сам создаст единственный экземпляр, когда он впервые кому-то понадобится
@Service()
export class CartStore {
  // Настройки магазина: порог бесплатной доставки
  private readonly config = inject(SHOP_CONFIG);

  // Аналитика не нужна для первой отрисовки. Её модуль загрузится, когда браузер освободится,
  // а экземпляр Angular создаст при первом вызове
  private readonly analytics = injectAsync(
    () => import('./analytics').then((m) => m.Analytics),
    {
      prefetch: onIdle,
    },
  );

  // Состояние корзины — позиции. Менять его может только сам сервис: поле закрытое
  private readonly state =
    signal<readonly CartItem[]>(loadCart());

  // Снаружи — только чтение: у Signal нет set и update
  readonly items = this.state.asReadonly();

  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0),
  );
  // Сумма по ценам игр — её показывает шапка
  readonly subtotal = computed(() =>
    this.items().reduce(
      (sum, item) => sum + item.game.price * item.quantity,
      0,
    ),
  );
  // Сколько покупатель экономит на играх со скидкой: разница со старой ценой
  readonly savings = computed(() =>
    this.items().reduce(
      (sum, item) =>
        sum +
        ((item.game.oldPrice ?? item.game.price) -
          item.game.price) *
          item.quantity,
      0,
    ),
  );
  // Доставка: бесплатно от порога, иначе по тарифу. У пустой корзины доставки нет
  readonly delivery = computed(() =>
    this.items().length === 0 ||
    this.subtotal() >= this.config.freeDeliveryFrom
      ? 0
      : this.config.deliveryPrice,
  );
  // TODO: промокод (promo) и скидка по нему (promoDiscount)
  // К оплате: товары плюс доставка
  readonly total = computed(
    () => this.subtotal() + this.delivery(),
  );
  readonly summary = computed(() =>
    this.items()
      .map((item) => `${item.game.title} × ${item.quantity}`)
      .join(', '),
  );
  readonly deliveryLeft = computed(() =>
    Math.max(this.config.freeDeliveryFrom - this.subtotal(), 0),
  );

  // Сколько штук каждой игры в корзине: id игры → количество
  private readonly quantities = computed(
    () =>
      new Map(
        this.items().map((item) => [
          item.game.id,
          item.quantity,
        ]),
      ),
  );

  // Метод читает сигнал, поэтому шаблон или computed, которые его вызвали, тоже зависят от корзины
  quantityOf(game: Game): number {
    return this.quantities().get(game.id) ?? 0;
  }

  add(game: Game) {
    this.state.update((items) => {
      const existing = items.find(
        (item) => item.game.id === game.id,
      );
      if (!existing) {
        return [...items, { game, quantity: 1 }];
      }
      return items.map((item) =>
        item === existing
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
    this.analytics().then((analytics) =>
      analytics.track('В корзину', game.title),
    );
  }

  setQuantity(game: Game, quantity: number) {
    this.state.update((items) =>
      items.map((item) =>
        item.game.id === game.id ? { ...item, quantity } : item,
      ),
    );
  }

  remove(game: Game) {
    this.state.update((items) =>
      items.filter((item) => item.game.id !== game.id),
    );
  }

  clear() {
    this.state.set([]);
  }

  constructor() {
    // Побочный эффект: сообщение в консоли при каждом изменении корзины
    effect(() => {
      console.log('Корзина:', this.summary() || 'пусто');
    });
    // Побочный эффект: при каждом изменении корзины записываем её в localStorage
    effect(() => {
      const saved: SavedItem[] = this.items().map((item) => ({
        id: item.game.id,
        quantity: item.quantity,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    });
  }
}

// Корзина из localStorage. Данные могли испортиться или устареть — ничего не берём на веру
function loadCart(): CartItem[] {
  try {
    const saved: SavedItem[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return saved.flatMap(({ id, quantity }) => {
      const game = GAMES.find((g) => g.id === id);
      return game && Number.isInteger(quantity) && quantity > 0
        ? [{ game, quantity }]
        : [];
    });
  } catch {
    // Не JSON или не массив — начинаем с пустой корзины
    return [];
  }
}
