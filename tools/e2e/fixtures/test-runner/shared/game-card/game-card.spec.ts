import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartStore } from '../../core/cart-store';
import { FlyToCart } from '../../core/fly-to-cart';
import { Game } from '../../core/models';
import { GameCard } from './game-card';

const game: Game = {
  id: 4,
  slug: 'night-train',
  title: 'Ночной экспресс',
  cover: '/assets/covers/night-train.svg',
  price: 3190,
  category: 'strategy',
  players: { min: 2, max: 5 },
  playTime: 60,
  age: 10,
  rating: 4.7,
  inStock: 2,
  description: '',
  tags: [],
};

describe('GameCard', () => {
  let fixture: ComponentFixture<GameCard>;
  let element: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [GameCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(GameCard);
    fixture.componentRef.setInput('game', game);
    await fixture.whenStable();
    element = fixture.nativeElement;
  });

  it('показывает название и наличие', () => {
    expect(element.querySelector('.title')?.textContent).toContain('Ночной экспресс');
    expect(element.textContent).toContain('Осталось 2 шт.');
  });

  it('«В корзину» кладёт игру и запускает полёт', async () => {
    const launch = vi.spyOn(TestBed.inject(FlyToCart), 'launch');
    element.querySelector<HTMLButtonElement>('.actions .button')!.click();
    await fixture.whenStable();
    expect(TestBed.inject(CartStore).count()).toBe(1);
    expect(launch).toHaveBeenCalledWith(game.cover, expect.any(HTMLImageElement));
    expect(element.textContent).toContain('В корзине: 1 шт.');
  });
});
