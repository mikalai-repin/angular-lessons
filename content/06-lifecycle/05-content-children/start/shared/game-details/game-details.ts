import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { Game } from '../../core/models';
import { Countdown } from '../countdown/countdown';
import { Rating } from '../rating/rating';

// Окно «Подробнее»: обложка, описание, цена и кнопка «В корзину»
@Component({
  selector: 'app-game-details',
  imports: [Countdown, Rating],
  templateUrl: './game-details.html',
  styleUrl: './game-details.css',
})
export class GameDetails {
  readonly game = input.required<Game>();
  readonly inCart = input(0);
  readonly add = output();
  // Покупатель закрыл окно
  readonly closed = output();

  // Элемент <dialog> из шаблона: #dialog
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // Модальным <dialog> делает только метод showModal(), а вызвать его можно, когда элемент уже в документе
    afterNextRender(() => this.dialogRef().nativeElement.showModal());
  }
}
