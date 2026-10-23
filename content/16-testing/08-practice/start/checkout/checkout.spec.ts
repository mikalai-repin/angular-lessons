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

  // TODO: пустая форма не уходит на сервер; заказ оформлен; на складе не хватило (409)
});
