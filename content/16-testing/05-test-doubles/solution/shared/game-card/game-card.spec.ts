import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartStore } from '../../core/cart-store';
import { FlyToCart } from '../../core/fly-to-cart';
import {
  SHOP_CONFIG,
  ShopConfig,
} from '../../core/shop-config';
import { fakeGame } from '../../testing/fake-game';
import { GameCard } from './game-card';

// Настройки магазина для теста: свои, чтобы тест не зависел от того, что поменяют в магазине
const CONFIG: ShopConfig = {
  freeDeliveryFrom: 5000,
  deliveryPrice: 390,
  fewLeft: 3,
  hitRating: 4.8,
  pageSize: 6,
  priorityCovers: 6,
};

describe('GameCard', () => {
  let fixture: ComponentFixture<GameCard>;
  let card: HTMLElement;
  // Подделка полёта обложки: вместо анимации — шпион, который запоминает вызовы
  let flyToCart: Pick<FlyToCart, 'launch'>;

  beforeEach(async () => {
    // Избранное читает localStorage, когда создаётся
    localStorage.clear();
    flyToCart = { launch: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [GameCard],
      providers: [
        // Ссылке на страницу игры (routerLink) нужен роутер
        provideRouter([]),
        // Кто попросит FlyToCart или SHOP_CONFIG, получит наши объекты
        { provide: FlyToCart, useValue: flyToCart },
        { provide: SHOP_CONFIG, useValue: CONFIG },
      ],
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

  it('много на складе — «В наличии»', async () => {
    fixture.componentRef.setInput(
      'game',
      fakeGame({ inStock: CONFIG.fewLeft + 1 }),
    );
    await fixture.whenStable();
    const stock = card.querySelector('.stock');
    expect(stock?.textContent?.trim()).toBe('В наличии');
  });

  it('«В корзину» кладёт игру и запускает полёт обложки', async () => {
    const button = card.querySelector<HTMLButtonElement>(
      '.actions .button',
    );
    button?.click();
    await fixture.whenStable();
    expect(TestBed.inject(CartStore).count()).toBe(1);
    expect(flyToCart.launch).toHaveBeenCalledWith(
      '/assets/covers/treasure-island.svg',
      expect.any(HTMLImageElement),
    );
    expect(
      card.querySelector('.in-cart')?.textContent,
    ).toContain('В корзине: 1 шт.');
  });

  it('всё со склада в корзине — кнопка неактивна', async () => {
    const button = card.querySelector<HTMLButtonElement>(
      '.actions .button',
    );
    button?.click();
    button?.click();
    await fixture.whenStable();
    const stock = card.querySelector('.stock');
    expect(stock?.textContent?.trim()).toBe(
      'Все 2 шт. в корзине',
    );
    expect(button?.disabled).toBe(true);
    expect(flyToCart.launch).toHaveBeenCalledTimes(2);
  });
});
