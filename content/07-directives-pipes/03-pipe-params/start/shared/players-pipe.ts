import { Pipe } from '@angular/core';
import { Game } from '../core/models';
import { WordForms, plural } from './plural';

const PLAYER: WordForms = { one: 'игрок', few: 'игрока', many: 'игроков' };

// Число игроков: { min: 2, max: 4 } → «2–4 игрока», { min: 2, max: 2 } → «2 игрока»
// TODO: пайп с именем players
