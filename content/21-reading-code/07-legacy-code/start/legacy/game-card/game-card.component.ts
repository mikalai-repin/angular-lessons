import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { Game } from '../../core/models';

@Component({
  selector: 'app-game-card',
  templateUrl: './game-card.component.html',
  styleUrls: ['./game-card.component.css'],
  // Добавлено при обновлении до 19 и до 22 — как у AppComponent
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class GameCardComponent {
  @Input() game!: Game;
  @Output() add = new EventEmitter<Game>();

  @HostBinding('class.sold-out') get soldOut() {
    return this.game.inStock === 0;
  }
}
