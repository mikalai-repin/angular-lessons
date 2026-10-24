import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { fakeGame } from '../testing/fake-game';
import { GameDraft, gameSchema, toDraft } from './game-schema';

// Форма по схеме игры — без компонента, как схема заказа в главе 16
function gameForm(draft: GameDraft) {
  return TestBed.runInInjectionContext(() =>
    form(signal(draft), gameSchema),
  );
}

describe('gameSchema', () => {
  it('игра с сервера проходит проверку', () => {
    const game = gameForm(toDraft(fakeGame({ price: 1990 })));
    expect(game().valid()).toBe(true);
  });

  it('цена 0 — ошибка у цены', () => {
    const game = gameForm({
      ...toDraft(fakeGame()),
      price: 0,
    });
    expect(game.price().errors()).toMatchObject([
      { kind: 'min', message: 'Цена — больше нуля' },
    ]);
  });

  it('цена до скидки не больше цены — ошибка у oldPrice', () => {
    const game = gameForm({
      ...toDraft(fakeGame({ price: 1990 })),
      oldPrice: 1990,
    });
    expect(game.oldPrice().errors()).toMatchObject([
      { kind: 'old-price' },
    ]);
  });

  it('без скидки (null) — ошибки нет', () => {
    const game = gameForm({
      ...toDraft(fakeGame()),
      oldPrice: null,
    });
    expect(game.oldPrice().errors()).toEqual([]);
  });
});
