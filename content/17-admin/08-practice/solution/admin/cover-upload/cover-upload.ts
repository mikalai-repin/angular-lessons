import {
  Component,
  inject,
  model,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormValueControl } from '@angular/forms/signals';
import { AdminGames } from '../admin-games';

// Обложка игры — поле формы: значение — адрес картинки, а выбрать её можно файлом.
// Файл сразу уходит на сервер, в форму попадает адрес, который сервер вернул
@Component({
  selector: 'app-cover-upload',
  templateUrl: './cover-upload.html',
  styleUrl: './cover-upload.css',
})
export class CoverUpload implements FormValueControl<string> {
  // Адрес обложки: его читает и пишет форма через [formField]
  readonly value = model('');
  // Админ закончил с полем — форма отметит его тронутым
  readonly touch = output();

  private readonly admin = inject(AdminGames);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Выбрали файл: загрузить его и положить адрес в value
  protected async upload(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.error.set(null);
    try {
      this.value.set(await this.admin.uploadCover(file));
    } catch (error) {
      // 413 — файл больше 1 МБ, 415 — не картинка: сервер пишет, что не так
      this.error.set(
        error instanceof HttpErrorResponse &&
          error.error?.message
          ? error.error.message
          : 'Не удалось загрузить обложку',
      );
    } finally {
      this.uploading.set(false);
      this.touch.emit();
      // Тот же файл можно будет выбрать ещё раз
      input.value = '';
    }
  }
}
