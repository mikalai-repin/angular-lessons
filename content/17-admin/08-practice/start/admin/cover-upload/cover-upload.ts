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
    // TODO: файл из input.files → admin.uploadCover; пока грузится — uploading;
    // ошибка — в error (сообщение сервера); в конце — touch и очистить input.value
  }
}
