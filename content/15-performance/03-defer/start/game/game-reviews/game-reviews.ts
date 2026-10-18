import {
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  FormField,
  FormRoot,
  form,
  min,
  required,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../core/auth-store';
import { Review } from '../../core/models';
import { FieldAria } from '../../shared/field-aria';
import { FieldErrors } from '../../shared/field-errors/field-errors';
import { Rating } from '../../shared/rating/rating';

// Отзывы об игре: список с сервера и форма нового отзыва
@Component({
  selector: 'app-game-reviews',
  imports: [
    DatePipe,
    FieldAria,
    FieldErrors,
    FormField,
    FormRoot,
    Rating,
  ],
  templateUrl: './game-reviews.html',
  styleUrl: './game-reviews.css',
})
export class GameReviews {
  // Игра, отзывы о которой показываем
  readonly gameId = input.required<number>();

  // Отзывы об игре. defaultValue — значение, пока ответа нет: пустой список вместо undefined
  protected readonly reviews = httpResource<Review[]>(
    () => `/api/games/${this.gameId()}/reviews`,
    { defaultValue: [] },
  );
  // Новый отзыв — форма: оценка звёздами и текст. Компонент Rating — тоже поле формы
  private readonly reviewModel = signal({
    rating: 5,
    text: '',
  });
  protected readonly reviewForm = form(
    this.reviewModel,
    (review) => {
      min(review.rating, 1, {
        message: 'Поставьте оценку — хотя бы одну звезду',
      });
      required(review.text, {
        message: 'Напишите пару слов об игре',
      });
    },
    { submission: { action: () => this.addReview() } },
  );
  // id черновиков отзывов: отрицательные, чтобы не совпасть с настоящими (их сервер выдаёт с 1)
  private nextDraftId = -1;

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);

  // Отправка формы отзыва. Ошибку, которую вернёт функция, форма покажет у себя
  private async addReview() {
    const { rating, text } = this.reviewModel();
    // Черновик: так отзыв будет выглядеть, когда сервер его сохранит
    const draft: Review = {
      id: this.nextDraftId--,
      gameId: this.gameId(),
      // Подпись — как у сервера: имя вошедшего или «Гость»
      author: this.auth.user()?.name ?? 'Гость',
      rating,
      text,
      date: new Date().toISOString().slice(0, 10),
    };
    // Оптимистичное обновление: отзыв появляется сразу, а форма снова пустая
    this.reviews.update((reviews) => [...reviews, draft]);
    this.reviewForm().reset({ rating: 5, text: '' });

    try {
      const saved = await firstValueFrom(
        this.http.post<Review>(
          `/api/games/${this.gameId()}/reviews`,
          {
            rating,
            text,
          },
        ),
      );
      // Сервер сохранил отзыв: заменяем черновик настоящим
      this.reviews.update((reviews) =>
        reviews.map((review) =>
          review === draft ? saved : review,
        ),
      );
      return undefined;
    } catch {
      // Не получилось: убираем черновик и возвращаем отзыв в форму
      this.reviews.update((reviews) =>
        reviews.filter((review) => review !== draft),
      );
      this.reviewModel.set({ rating, text });
      return {
        kind: 'server',
        message:
          'Не удалось отправить отзыв. Попробуйте ещё раз.',
      };
    }
  }
}
