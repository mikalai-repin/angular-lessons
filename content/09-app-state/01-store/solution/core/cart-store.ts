import {
  Service,
  computed,
  effect,
  inject,
  injectAsync,
  onIdle,
  signal,
} from '@angular/core';
import { CartItem, Game } from './models';
import { SHOP_CONFIG } from './shop-config';

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
  private readonly state = signal<readonly CartItem[]>([]);

  // Снаружи — только чтение: у Signal нет set и update
  readonly items = this.state.asReadonly();

  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0),
  );
  readonly total = computed(() =>
    this.items().reduce(
      (sum, item) => sum + item.game.price * item.quantity,
      0,
    ),
  );
  readonly summary = computed(() =>
    this.items()
      .map((item) => `${item.game.title} × ${item.quantity}`)
      .join(', '),
  );
  readonly deliveryLeft = computed(() =>
    Math.max(this.config.freeDeliveryFrom - this.total(), 0),
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
  }
}
