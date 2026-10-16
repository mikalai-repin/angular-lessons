import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
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

  // Подсказки под полем
  protected readonly suggestions = signal<Game[]>([]);
  // Открыт ли список подсказок: закрываем, когда покупатель выбрал игру или нажал Esc
  protected readonly open = signal(false);

  // Текст в поле изменился
  protected search(text: string) {
    this.open.set(true);
    // Запрос на каждую букву. TODO: поток текстов поиска — запрос, когда покупатель перестал печатать
    this.http
      .get<GamesPage>('/api/games', {
        params: { q: text, size: 5 },
      })
      .subscribe((page) => this.suggestions.set(page.items));
  }

  // Покупатель выбрал игру: закрываем подсказки и очищаем поле
  protected choose(box: HTMLInputElement) {
    this.open.set(false);
    box.value = '';
  }
}
