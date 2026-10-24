import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { FieldAria } from '../../shared/field-aria';
import { FieldErrors } from '../../shared/field-errors/field-errors';
import { CoverUpload } from '../cover-upload/cover-upload';
import { CATEGORIES, GameDraft } from '../game-schema';

// Поля игры: название, категория, цены, склад, характеристики, описание.
// Сама форма — у страницы, которая её создала; сюда приходит её дерево полей
@Component({
  selector: 'app-game-fields',
  imports: [CoverUpload, FieldAria, FieldErrors, FormField],
  templateUrl: './game-fields.html',
  styleUrl: './game-fields.css',
})
export class GameFields {
  readonly fields = input.required<FieldTree<GameDraft>>();

  protected readonly categories = CATEGORIES;
}
