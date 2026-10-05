import { Component, ElementRef, afterNextRender, computed, inject, input, output, viewChild } from '@angular/core';
import { CartStore } from '../../core/cart-store';
import { Game } from '../../core/models';
import { Countdown } from '../countdown/countdown';
import { DurationPipe } from '../duration-pipe';
import { PlayersPipe } from '../players-pipe';
import { PricePipe } from '../price-pipe';
import { Rating } from '../rating/rating';
import { Tab } from '../tabs/tab';
import { Tabs } from '../tabs/tabs';

// Окно «Подробнее»: обложка, описание, цена и кнопка «В корзину»
@Component({
  selector: 'app-game-details',
  imports: [Countdown, DurationPipe, PlayersPipe, PricePipe, Rating, Tab, Tabs],
  templateUrl: './game-details.html',
  styleUrl: './game-details.css',
})
export class GameDetails {
  readonly game = input.required<Game>();
  // Покупатель закрыл окно
  readonly closed = output();

  protected readonly cart = inject(CartStore);
  protected readonly inCart = computed(() => this.cart.quantityOf(this.game()));

  // Элемент <dialog> из шаблона: #dialog
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // Модальным <dialog> делает только метод showModal(), а вызвать его можно, когда элемент уже в документе
    afterNextRender(() => this.dialogRef().nativeElement.showModal());
  }
}
