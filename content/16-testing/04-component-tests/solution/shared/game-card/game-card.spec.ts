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
    // Избранное читает localStorage, когда создаётся
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [GameCard],
      // Ссылке на страницу игры (routerLink) нужен роутер
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(GameCard);
    // Вход — как у родителя в шаблоне: [game]="…"
    fixture.componentRef.setInput(
      'game',
      fakeGame({ title: 'Ночной экспресс', inStock: 2 }),
    );
    // Ждём, пока Angular отрисует карточку
    await fixture.whenStable();
    card = fixture.nativeElement;
  });

  it('показывает название и остаток', () => {
    const title = card.querySelector('.title');
    expect(title?.textContent).toContain('Ночной экспресс');
    const stock = card.querySelector('.stock');
    expect(stock?.textContent?.trim()).toBe('Осталось 2 шт.');
  });

  it('игра закончилась — «Нет в наличии», кнопка неактивна', async () => {
    fixture.componentRef.setInput(
      'game',
      fakeGame({ inStock: 0 }),
    );
    await fixture.whenStable();
    const stock = card.querySelector('.stock');
    expect(stock?.textContent?.trim()).toBe('Нет в наличии');
    expect(card.classList).toContain('sold-out');
    const button = card.querySelector<HTMLButtonElement>(
      '.actions .button',
    );
    expect(button?.disabled).toBe(true);
  });

  it('сердечко добавляет игру в избранное', async () => {
    const heart =
      card.querySelector<HTMLButtonElement>('.favorite');
    heart?.click();
    await fixture.whenStable();
    expect(heart?.textContent?.trim()).toBe('♥');
    expect(heart?.getAttribute('aria-pressed')).toBe('true');
  });
});
