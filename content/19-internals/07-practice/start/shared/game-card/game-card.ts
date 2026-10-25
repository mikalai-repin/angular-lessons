import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { CartStore } from '../../core/cart-store';
import { favoritesFeature } from '../../core/favorites-feature';
import { FlyToCart } from '../../core/fly-to-cart';
import { Game } from '../../core/models';
import { SHOP_CONFIG } from '../../core/shop-config';
import { DurationPipe } from '../duration-pipe';
import { PlayersPipe } from '../players-pipe';
import { PricePipe } from '../price-pipe';
import { Rating } from '../rating/rating';
import { Tooltip } from '../tooltip';
import { GameCardActions } from './game-card-actions';

// Карточка игры в каталоге
@Component({
  selector: 'app-game-card',
  imports: [
    DecimalPipe,
    DurationPipe,
    NgOptimizedImage,
    PlayersPipe,
    PricePipe,
    Rating,
    RouterLink,
    Tooltip,
  ],
  templateUrl: './game-card.html',
  // Карточка проверяется всякий раз, когда проверяется список, — так надёжнее
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './game-card.css',
  host: {
    role: 'article',
    '[class.sold-out]': 'game().inStock === 0',
  },
})
export class GameCard {
  // Игра, которую показывает карточка. Без неё карточка не имеет смысла — вход обязательный
  readonly game = input.required<Game>();
  // Обложку грузить в первую очередь: карточка — первое, что видно на странице
  readonly priority = input(false, {
    transform: booleanAttribute,
  });

  // Корзина — общая для всего магазина: карточка сама кладёт в неё игру
  protected readonly cart = inject(CartStore);
  // Всё, что карточке нужно знать о корзине, — одним объектом:
  // сколько штук этой игры уже в корзине и сколько ещё можно добавить
  protected readonly stock = computed(() => ({
    inCart: this.cart.quantityOf(this.game()),
    available: this.cart.available(this.game()),
  }));

  // Избранное — в классическом Store: читаем селектором, меняем действием
  private readonly store = inject(Store);
  private readonly favoriteIds = this.store.selectSignal(
    favoritesFeature.selectIds,
  );
  protected readonly isFavorite = computed(() =>
    this.favoriteIds().includes(this.game().id),
  );

  // При каком остатке на складе писать «Осталось N шт.»
  protected readonly fewLeft = inject(SHOP_CONFIG).fewLeft;

  // Картинка обложки: из неё вылетит копия в корзину
  private readonly cover =
    viewChild.required<ElementRef<HTMLImageElement>>('cover');
  private readonly flyToCart = inject(FlyToCart);

  // Сердечко: сообщаем Store, что произошло, — состояние поменяет редьюсер
  protected toggleFavorite() {
    this.store.dispatch(
      GameCardActions.favoriteToggled({
        gameId: this.game().id,
      }),
    );
  }

  // «В корзину»: игра — в корзину, обложка — в полёт
  protected addToCart() {
    this.cart.add(this.game());
    this.flyToCart.launch(
      this.game().cover,
      this.cover().nativeElement,
    );
  }
}
