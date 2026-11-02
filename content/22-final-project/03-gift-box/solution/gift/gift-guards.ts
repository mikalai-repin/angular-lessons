import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GiftStore } from './gift-store';

// Шаги мастера — по порядку: по ссылке или из истории дальше готового шага не попасть.
// Гард читает ту же форму, что и шаги: готов ли шаг, решают правила схемы
export const gamesChosenGuard: CanActivateFn = () =>
  inject(GiftStore).form.games().valid() ||
  inject(Router).createUrlTree(['/gift/games']);

export const designDoneGuard: CanActivateFn = () =>
  inject(GiftStore).form.design().valid() ||
  inject(Router).createUrlTree(['/gift/design']);
