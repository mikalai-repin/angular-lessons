import { Pipe, PipeTransform } from '@angular/core';
import { Game } from '../core/models';
import { WordForms, plural } from './plural';

const PLAYER: WordForms = { one: 'игрок', few: 'игрока', many: 'игроков' };

// Число игроков: { min: 2, max: 4 } → «2–4 игрока», { min: 2, max: 2 } → «2 игрока»
@Pipe({ name: 'players' })
export class PlayersPipe implements PipeTransform {
  transform(players: Game['players']): string {
    const range = players.min === players.max ? `${players.min}` : `${players.min}–${players.max}`;
    // Слово согласуется с последним числом: «2–4 игрока», но «2–5 игроков»
    return `${range} ${plural(players.max, PLAYER)}`;
  }
}
