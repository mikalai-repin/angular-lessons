import { Component, inject, signal } from '@angular/core';
import {
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';
import { GamesPage } from '../../core/models';

// Быстрый поиск в шапке: пока покупатель печатает, под полем — до пяти подходящих игр
@Component({
  selector: 'app-quick-search',
  imports: [RouterLink],
  templateUrl: './quick-search.html',
  styleUrl: './quick-search.css',
})
export class QuickSearch {
  private readonly http = inject(HttpClient);

  // Текст в поле — сигнал: его читает шаблон, а из него строится поток подсказок
  protected readonly text = signal('');
  // Открыт ли список подсказок: закрываем, когда покупатель выбрал игру или нажал Esc
  protected readonly open = signal(false);

  // Подсказки: поток ответов сервера, превращённый в сигнал. До первого ответа — пустой список
  protected readonly suggestions = toSignal(
    toObservable(this.text).pipe(
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
    ),
    { initialValue: [] },
  );

  // Текст в поле изменился
  protected search(text: string) {
    this.open.set(true);
    this.text.set(text);
  }

  // Покупатель выбрал игру: закрываем подсказки и очищаем поле
  protected choose() {
    this.open.set(false);
    this.text.set('');
  }
}
