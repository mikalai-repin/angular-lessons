import {
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CACHE } from '../core/cache-interceptor';
import { CartStore } from '../core/cart-store';
import { Game, Review } from '../core/models';
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
    DatePipe,
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

  // Игра с сервера. Сменился id в адресе — новый запрос.
  // Метка CACHE: только что эту игру загрузил резолвер крошки — ответ возьмём из кэша
  protected readonly game = httpResource<Game>(() => ({
    url: `/api/games/${this.id()}`,
    context: new HttpContext().set(CACHE, true),
  }));
  // Сервер ответил 404 — такой игры нет. Остальные ошибки — «не удалось загрузить»
  protected readonly notFound = computed(() => {
    const error = this.game.error();
    return (
      error instanceof HttpErrorResponse && error.status === 404
    );
  });

  // Отзывы об игре. defaultValue — значение, пока ответа нет: пустой список вместо undefined
  protected readonly reviews = httpResource<Review[]>(
    () => `/api/games/${this.id()}/reviews`,
    { defaultValue: [] },
  );
  // Оценка нового отзыва и сообщение, если отправить не удалось
  protected readonly newRating = signal(5);
  protected readonly reviewError = signal('');
  // id черновиков отзывов: отрицательные, чтобы не совпасть с настоящими (их сервер выдаёт с 1)
  private nextDraftId = -1;

  private readonly http = inject(HttpClient);
  protected readonly cart = inject(CartStore);
  // Сколько штук этой игры уже в корзине
  protected readonly inCart = computed(() =>
    this.game.hasValue()
      ? this.cart.quantityOf(this.game.value())
      : 0,
  );

  protected addReview(textBox: HTMLTextAreaElement) {
    const text = textBox.value.trim();
    if (!text) {
      return;
    }
    // Черновик: так отзыв будет выглядеть, когда сервер его сохранит
    const draft: Review = {
      id: this.nextDraftId--,
      gameId: this.id(),
      author: 'Вы',
      rating: this.newRating(),
      text,
      date: new Date().toISOString().slice(0, 10),
    };
    // Оптимистичное обновление: отзыв появляется сразу, не дожидаясь ответа сервера
    this.reviews.update((reviews) => [...reviews, draft]);
    textBox.value = '';
    this.reviewError.set('');

    this.http
      .post<Review>(`/api/games/${this.id()}/reviews`, {
        rating: draft.rating,
        text,
      })
      .subscribe({
        // Сервер сохранил отзыв: заменяем черновик настоящим
        next: (saved) =>
          this.reviews.update((reviews) =>
            reviews.map((review) =>
              review === draft ? saved : review,
            ),
          ),
        // Не получилось: убираем черновик и возвращаем текст в поле
        error: () => {
          this.reviews.update((reviews) =>
            reviews.filter((review) => review !== draft),
          );
          textBox.value = text;
          this.reviewError.set(
            'Не удалось отправить отзыв. Попробуйте ещё раз.',
          );
        },
      });
  }
}
