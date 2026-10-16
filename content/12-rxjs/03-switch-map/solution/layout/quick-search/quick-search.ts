import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';
import { Game, GamesPage } from '../../core/models';

// Быстрый поиск в шапке: пока покупатель печатает, под полем — до пяти подходящих игр
@Component({
  selector: 'app-quick-search',
  imports: [RouterLink],
  templateUrl: './quick-search.html',
  styleUrl: './quick-search.css',
})
export class QuickSearch {
  private readonly http = inject(HttpClient);

  // Тексты поиска: каждое изменение поля — новое значение потока
  private readonly texts = new Subject<string>();

  // Подсказки под полем
  protected readonly suggestions = signal<Game[]>([]);
  // Открыт ли список подсказок: закрываем, когда покупатель выбрал игру или нажал Esc
  protected readonly open = signal(false);

  constructor() {
    this.texts
      .pipe(
        map((text) => text.trim()),
        // Ждём паузы в 300 мс: пока покупатель печатает, запросов нет
        debounceTime(300),
        // Текст не изменился («кот» → «ко» → «кот») — запрос не нужен
        distinctUntilChanged(),
        // Новый текст — новый запрос. Прежний, если ответ ещё не пришёл, отменяется
        switchMap((text) =>
          text.length < 2
            ? of([])
            : this.http
                .get<GamesPage>('/api/games', {
                  params: { q: text, size: 5 },
                })
                .pipe(
                  map((page) => page.items),
                  // Сервер не ответил — подсказок нет, но поток живёт дальше
                  catchError(() => of([])),
                ),
        ),
      )
      .subscribe((games) => this.suggestions.set(games));
  }

  // Текст в поле изменился
  protected search(text: string) {
    this.open.set(true);
    this.texts.next(text);
  }

  // Покупатель выбрал игру: закрываем подсказки и очищаем поле
  protected choose(box: HTMLInputElement) {
    this.open.set(false);
    box.value = '';
    this.texts.next('');
  }
}
