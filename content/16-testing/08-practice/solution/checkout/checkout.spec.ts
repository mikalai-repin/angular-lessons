import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartStore } from '../core/cart-store';
import { fakeGame } from '../testing/fake-game';
import { Checkout } from './checkout';

describe('Checkout', () => {
  let fixture: ComponentFixture<Checkout>;
  let page: HTMLElement;
  let server: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    // Оформлять есть что: игра в корзине
    TestBed.inject(CartStore).add(
      fakeGame({ id: 4, price: 3190 }),
    );
    server = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Checkout);
    await fixture.whenStable();
    page = fixture.nativeElement;
  });

  afterEach(() => server.verify());

  // Напечатать в поле: значение и событие input — как при вводе с клавиатуры
  function type(selector: string, text: string) {
    const input =
      page.querySelector<HTMLInputElement>(selector);
    if (!input) {
      throw new Error(`Нет поля ${selector}`);
    }
    input.value = text;
    input.dispatchEvent(new Event('input'));
  }

  // «Оформить заказ»
  async function submit() {
    page
      .querySelector<HTMLButtonElement>('form .button')
      ?.click();
    await fixture.whenStable();
  }

  it('пустая форма не уходит на сервер', async () => {
    await submit();
    server.expectNone('/api/orders');
    expect(page.textContent).toContain('Как к вам обращаться?');
  });

  it('заказ оформлен — номер заказа, корзина пуста', async () => {
    type('input[autocomplete="name"]', 'Аня');
    type('input[type="tel"]', '+7 900 123-45-67');
    await submit();
    const request = server.expectOne('/api/orders');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({
      items: [{ gameId: 4, quantity: 1 }],
      contacts: { name: 'Аня', phone: '+7 900 123-45-67' },
      total: 3190,
    });
    request.flush({ id: 42 });
    // Ответ разбирает async-функция отправки — Angular о ней не знает, whenStable её не ждёт
    await vi.waitFor(() =>
      expect(page.querySelector('h1')?.textContent).toBe(
        'Заказ №42 оформлен',
      ),
    );
    expect(TestBed.inject(CartStore).count()).toBe(0);
  });

  it('на складе не хватило — сообщение сервера', async () => {
    type('input[autocomplete="name"]', 'Аня');
    type('input[type="tel"]', '+7 900 123-45-67');
    await submit();
    const request = server.expectOne('/api/orders');
    request.flush(
      { message: 'На складе только 0 шт.' },
      { status: 409, statusText: 'Conflict' },
    );
    await vi.waitFor(() =>
      expect(
        page.querySelector('.error-message')?.textContent,
      ).toContain('На складе только 0 шт.'),
    );
  });
});
