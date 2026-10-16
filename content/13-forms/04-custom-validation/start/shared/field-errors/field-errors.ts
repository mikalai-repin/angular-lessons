import { Component, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { fieldErrorsId } from '../field-aria';

// Ошибки поля формы — списком под полем. Видны, когда покупатель закончил с полем (ушёл из него)
@Component({
  selector: 'app-field-errors',
  templateUrl: './field-errors.html',
})
export class FieldErrors {
  // Поле формы любого типа: строка, число, флажок
  readonly field = input.required<FieldTree<unknown>>();

  protected readonly errorsId = fieldErrorsId;
}
