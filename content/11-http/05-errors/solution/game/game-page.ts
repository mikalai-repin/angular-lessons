import {
  Component,
  computed,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import {
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CartStore } from '../core/cart-store';
import { Game } from '../core/models';
import { Countdown } from '../shared/countdown/countdown';
import { DurationPipe } from '../shared/duration-pipe';
import { PlayersPipe } from '../shared/players-pipe';
import { PricePipe } from '../shared/price-pipe';
import { Rating } from '../shared/rating/rating';
import { Tab } from '../shared/tabs/tab';
import { Tabs } from '../shared/tabs/tabs';

// Страница игры: обложка, цена, «В корзину», описание и характеристики
@Component({
  selector: 'app-game-page',
  imports: [
    Countdown,
    DurationPipe,
    PlayersPipe,
    PricePipe,
    Rating,
    RouterLink,
    Tab,
    Tabs,
  ],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export class GamePage {
  // Параметр маршрута :id — во вход его кладёт роутер (withComponentInputBinding).
  // Из адреса приходит строка: numberAttribute превращает её в число
  readonly id = input.required({ transform: numberAttribute });

  // Игра с сервера. Сменился id в адресе — новый запрос
  protected readonly game = httpResource<Game>(
    () => `/api/games/${this.id()}`,
  );
  // Сервер ответил 404 — такой игры нет. Остальные ошибки — «не удалось загрузить»
  protected readonly notFound = computed(() => {
    const error = this.game.error();
    return (
      error instanceof HttpErrorResponse && error.status === 404
    );
  });

  protected readonly cart = inject(CartStore);
  // Сколько штук этой игры уже в корзине
  protected readonly inCart = computed(() =>
    this.game.hasValue()
      ? this.cart.quantityOf(this.game.value())
      : 0,
  );
}
