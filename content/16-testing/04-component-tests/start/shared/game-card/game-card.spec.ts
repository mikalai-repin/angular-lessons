import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeGame } from '../../testing/fake-game';
import { GameCard } from './game-card';

describe('GameCard', () => {
  let fixture: ComponentFixture<GameCard>;
  let card: HTMLElement;

  beforeEach(async () => {
    // TODO: тестовый модуль с роутером, карточка с игрой «Ночной экспресс» (2 шт. на складе)
  });

  // TODO: название и остаток, игра закончилась, сердечко
});
