import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Confirmation } from '../core/confirmation';

// Страница с формой, которую можно не дописать
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

// Уходят со страницы с несохранённой формой — спросить в окне. Гард ждёт промис ответа: false отменяет переход
export const unsavedChangesGuard: CanDeactivateFn<
  HasUnsavedChanges
> = (page) =>
  !page.hasUnsavedChanges() ||
  inject(Confirmation).ask(
    'Изменения не сохранятся. Уйти со страницы?',
    'Уйти',
  );
