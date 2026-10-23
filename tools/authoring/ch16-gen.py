# Генератор кода шагов главы 16 «Тестирование».
# Запуск: python3 tools/authoring/ch16-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 16.
#         python3 tools/authoring/ch16-gen.py dump <папка> — полные снимки шагов в <папка>/<шаг>/<start|solution>
#         (для опытов: tools/e2e/run-dir.mjs, run-tests.mjs и ng-test.mjs принимают такую папку).
# Старт главы — решение практикума главы 15 (08-practice). Магазин в главе почти не меняется: шаги добавляют
# тесты (*.spec.ts) и помощник testing/fake-game.ts; в шаге 3 тесты находят изъян аналитики в CartStore и App.
# Шаги — полные снимки: каждый строится правками (edit) поверх результата предыдущего шага.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, format_snapshots, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/16-testing'
BASE = read_dir(step_dir(f'{PROJECT}/content/15-performance/08-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


def put(files, **named):
    """Копия снимка с новыми или заменёнными файлами: put(S, **{'core/x.spec.ts': '…'})."""
    out = dict(files)
    out.update(named)
    return out


# ---------- 16.1 Зачем тесты: первый тест ----------

PLURAL_SPEC_HEAD = """import { WordForms, plural } from './plural';

// Формы слова «игрок» — те же, что у пайпа players
const PLAYER: WordForms = {
  one: 'игрок',
  few: 'игрока',
  many: 'игроков',
};

// describe — набор тестов: всё, что мы проверяем у функции plural
describe('plural', () => {
  // it — один тест. Название — что должно быть верно
  it('1 — «игрок»', () => {
    // expect(что получилось).toBe(что должно получиться)
    expect(plural(1, PLAYER)).toBe('игрок');
  });

  it('3 — «игрока»', () => {
    expect(plural(3, PLAYER)).toBe('игрока');
  });
"""

PLURAL_SPEC_START = PLURAL_SPEC_HEAD + """
  // TODO: тесты для 5, 11 и 21
});
"""

PLURAL_SPEC = PLURAL_SPEC_HEAD + """
  it('5 — «игроков»', () => {
    expect(plural(5, PLAYER)).toBe('игроков');
  });

  // 11 кончается на 1, но это не «игрок»: числа 11–14 — особый случай
  it('11 — «игроков»', () => {
    expect(plural(11, PLAYER)).toBe('игроков');
  });

  it('21 — «игрок»', () => {
    expect(plural(21, PLAYER)).toBe('игрок');
  });
});
"""

S1_START = put(BASE, **{'shared/plural.spec.ts': PLURAL_SPEC_START})
S1 = put(S1_START, **{'shared/plural.spec.ts': PLURAL_SPEC})

# ---------- 16.2 Тест пайпа ----------

DURATION_SPEC_HEAD = """import { DurationPipe } from './duration-pipe';

describe('DurationPipe', () => {
  // Пайп — обычный класс: его метод transform можно вызвать без Angular
  const pipe = new DurationPipe();

  it('часы и минуты', () => {
    expect(pipe.transform(90)).toBe('1 ч 30 мин');
  });
"""

DURATION_SPEC_START = DURATION_SPEC_HEAD + """
  // TODO: меньше часа, ровно час, длинный формат ('long')
});
"""

DURATION_SPEC = DURATION_SPEC_HEAD + """
  it('меньше часа — только минуты', () => {
    expect(pipe.transform(45)).toBe('45 мин');
  });

  it('ровно час — без минут', () => {
    expect(pipe.transform(60)).toBe('1 ч');
  });

  it('длинный формат согласует слова с числом', () => {
    expect(pipe.transform(125, 'long')).toBe('2 часа 5 минут');
  });
});
"""

PRICE_SPEC_START = """import { PricePipe } from './price-pipe';

describe('PricePipe', () => {
  it('рубли без копеек, разряды через пробел', () => {
    // TODO: создать пайп в контексте внедрения TestBed с локалью ru и валютой RUB
    const pipe = new PricePipe();
    expect(pipe.transform(1990)).toBe('1 990 ₽');
  });
});
"""

PRICE_SPEC = """import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import { TestBed } from '@angular/core/testing';
import { PricePipe } from './price-pipe';

describe('PricePipe', () => {
  let pipe: PricePipe;

  beforeEach(() => {
    // Правила русского языка — как в app.config.ts
    registerLocaleData(localeRu);
    // У теста нет app.config.ts: всё, что пайп внедряет, тест даёт сам
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'ru' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },
      ],
    });
    // inject() в полях пайпа работает только в контексте внедрения
    pipe = TestBed.runInInjectionContext(() => new PricePipe());
  });

  it('рубли без копеек, разряды через пробел', () => {
    // Пайпы форматирования ставят неразрывные пробелы: \\u00a0
    expect(pipe.transform(1990)).toBe('1\\u00a0990\\u00a0₽');
  });

  it('округляет до рубля', () => {
    expect(pipe.transform(999.6)).toBe('1\\u00a0000\\u00a0₽');
  });
});
"""

S2_START = put(S1, **{
    'shared/duration-pipe.spec.ts': DURATION_SPEC_START,
    'shared/price-pipe.spec.ts': PRICE_SPEC_START,
})
S2 = put(S2_START, **{
    'shared/duration-pipe.spec.ts': DURATION_SPEC,
    'shared/price-pipe.spec.ts': PRICE_SPEC,
})

# ---------- 16.3 Тест сервиса ----------

FAKE_GAME = """import { Game } from '../core/models';

// Игра для тестов: все поля заполнены. Тесту важны одно-два поля — их и переопределяем:
// fakeGame({ price: 500 }), fakeGame({ id: 2, inStock: 0 })
export function fakeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    slug: 'test-game',
    title: 'Тестовая игра',
    cover: '/assets/covers/treasure-island.svg',
    price: 1000,
    category: 'family',
    players: { min: 2, max: 4 },
    playTime: 30,
    age: 8,
    rating: 4.5,
    inStock: 10,
    description: '',
    tags: [],
    ...overrides,
  };
}
"""

CART_SPEC_HEAD = """import { TestBed } from '@angular/core/testing';
import { fakeGame } from '../testing/fake-game';
import { CartStore } from './cart-store';

describe('CartStore', () => {
  let cart: CartStore;

  beforeEach(() => {
    // Корзина читает localStorage, когда создаётся: каждый тест начинает с пустого
    localStorage.clear();
    // Свой экземпляр на каждый тест: после теста TestBed выбрасывает всё, что создал
    cart = TestBed.inject(CartStore);
  });

  it('новая корзина пуста', () => {
    expect(cart.count()).toBe(0);
    expect(cart.total()).toBe(0);
  });
"""

CART_SPEC_START = CART_SPEC_HEAD + """
  // TODO: штуки и сумма, остаток на складе, бесплатная доставка, промокод, localStorage
});
"""

CART_SPEC = CART_SPEC_HEAD + """
  it('считает штуки и сумму', () => {
    const game = fakeGame({ price: 1000 });
    cart.add(game);
    cart.add(game);
    cart.add(fakeGame({ id: 2, price: 500 }));
    expect(cart.count()).toBe(3);
    expect(cart.subtotal()).toBe(2500);
  });

  it('не кладёт больше, чем есть на складе', () => {
    const game = fakeGame({ inStock: 1 });
    cart.add(game);
    cart.add(game);
    expect(cart.quantityOf(game)).toBe(1);
  });

  it('доставка бесплатна от 5000 ₽', () => {
    cart.add(fakeGame({ price: 4990 }));
    expect(cart.delivery()).toBe(390);
    cart.add(fakeGame({ id: 2, price: 10 }));
    expect(cart.delivery()).toBe(0);
  });

  it('снимает промокод, когда сумма стала меньше порога', () => {
    const cheap = fakeGame({ id: 2, price: 1500 });
    cart.add(fakeGame({ price: 2000 }));
    cart.add(cheap);
    const promo = { code: 'KNIGHT500', amount: 500, minTotal: 3000 };
    expect(cart.applyPromo(promo)).toBe(true);
    cart.remove(cheap);
    expect(cart.promo()).toBeNull();
  });

  it('сохраняет корзину в localStorage', () => {
    cart.add(fakeGame());
    // Записывает эффект, а эффекты выполняются, когда Angular обновляет приложение
    TestBed.tick();
    const saved = localStorage.getItem('hod-konem:cart:v2');
    expect(JSON.parse(saved ?? '[]')).toEqual([
      { game: fakeGame(), quantity: 1 },
    ]);
  });
});
"""

S3_START = put(S2, **{
    'testing/fake-game.ts': FAKE_GAME,
    'core/cart-store.spec.ts': CART_SPEC_START,
})
S3 = put(S3_START, **{'core/cart-store.spec.ts': CART_SPEC})
S3 = edit(S3, 'core/cart-store.ts', ("""    this.analytics().then((analytics) =>
      analytics.track('В корзину', game.title),
    );
  }""", """    this.track('В корзину', game.title);
  }"""), ("""  constructor() {
    // Побочный эффект: сообщение в консоли""", """  // Событие — в аналитику. Аналитика не важнее покупки: модуль не загрузился или корзины
  // уже нет — событие пропадает, а ошибка не уходит дальше
  private track(event: string, details: string) {
    this.analytics()
      .then((analytics) => analytics.track(event, details))
      .catch(() => {});
  }

  constructor() {
    // Побочный эффект: сообщение в консоли"""))
S3 = edit(S3, 'app.ts', ("""      .subscribe((url) =>
        this.analytics().then((analytics) =>
          analytics.track('Просмотр страницы', url),
        ),
      );""", """      .subscribe((url) =>
        this.analytics()
          .then((analytics) =>
            analytics.track('Просмотр страницы', url),
          )
          // Аналитика не важнее магазина — как в CartStore
          .catch(() => {}),
      );"""))

# ---------- 16.4 Тест компонента ----------

CARD_SPEC_IMPORTS = """import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeGame } from '../../testing/fake-game';
import { GameCard } from './game-card';
"""

CARD_SPEC_START = CARD_SPEC_IMPORTS + """
describe('GameCard', () => {
  let fixture: ComponentFixture<GameCard>;
  let card: HTMLElement;

  beforeEach(async () => {
    // TODO: тестовый модуль с роутером, карточка с игрой «Ночной экспресс» (2 шт. на складе)
  });

  // TODO: название и остаток, игра закончилась, сердечко
});
"""

CARD_SPEC_BEFORE = """  beforeEach(async () => {
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
"""

CARD_SPEC_TESTS = """
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
    const heart = card.querySelector<HTMLButtonElement>('.favorite');
    heart?.click();
    await fixture.whenStable();
    expect(heart?.textContent?.trim()).toBe('♥');
    expect(heart?.getAttribute('aria-pressed')).toBe('true');
  });
"""

CARD_SPEC = CARD_SPEC_IMPORTS + """
describe('GameCard', () => {
  let fixture: ComponentFixture<GameCard>;
  let card: HTMLElement;

""" + CARD_SPEC_BEFORE + CARD_SPEC_TESTS + """});
"""

S4_START = put(S3, **{'shared/game-card/game-card.spec.ts': CARD_SPEC_START})
S4 = put(S4_START, **{'shared/game-card/game-card.spec.ts': CARD_SPEC})

# ---------- 16.5 Подмена зависимостей ----------

S5 = edit(S4, 'shared/game-card/game-card.spec.ts',
    ("""import { provideRouter } from '@angular/router';
import { fakeGame } from '../../testing/fake-game';""", """import { provideRouter } from '@angular/router';
import { CartStore } from '../../core/cart-store';
import { FlyToCart } from '../../core/fly-to-cart';
import { SHOP_CONFIG, ShopConfig } from '../../core/shop-config';
import { fakeGame } from '../../testing/fake-game';"""),
    ("""describe('GameCard', () => {
  let fixture: ComponentFixture<GameCard>;
  let card: HTMLElement;
""", """// Настройки магазина для теста: свои, чтобы тест не зависел от того, что поменяют в магазине
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
"""),
    ("""    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [GameCard],
      // Ссылке на страницу игры (routerLink) нужен роутер
      providers: [provideRouter([])],
    }).compileComponents();""", """    localStorage.clear();
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
    }).compileComponents();"""),
    ("""    expect(heart?.getAttribute('aria-pressed')).toBe('true');
  });
""", """    expect(heart?.getAttribute('aria-pressed')).toBe('true');
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
    expect(card.querySelector('.in-cart')?.textContent).toContain(
      'В корзине: 1 шт.',
    );
  });

  it('всё со склада в корзине — кнопка неактивна', async () => {
    const button = card.querySelector<HTMLButtonElement>(
      '.actions .button',
    );
    button?.click();
    button?.click();
    await fixture.whenStable();
    const stock = card.querySelector('.stock');
    expect(stock?.textContent?.trim()).toBe('Все 2 шт. в корзине');
    expect(button?.disabled).toBe(true);
    expect(flyToCart.launch).toHaveBeenCalledTimes(2);
  });
"""))

# ---------- 16.6 Тест HTTP ----------

AUTH_SPEC_HEAD = """import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth-store';
import { User } from './models';

const USER: User = {
  id: 1,
  email: 'user@example.com',
  name: 'Пользователь',
  role: 'user',
};

describe('AuthStore', () => {
  let auth: AuthStore;
  // Поддельный сервер: запросы HttpClient попадают к нему, а не в сеть
  let server: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthStore);
    server = TestBed.inject(HttpTestingController);
  });

  // Ни одного запроса без ответа: тест не забыл ни одного и не ждал лишнего
  afterEach(() => server.verify());

  it('вход сохраняет токен и пользователя', async () => {
    const done = auth.logIn({ email: USER.email, password: 'user' });
    const request = server.expectOne('/api/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: USER.email,
      password: 'user',
    });
    request.flush({ token: 't1', refreshToken: 'r1', user: USER });
    await done;
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.user()?.name).toBe('Пользователь');
    expect(localStorage.getItem('hod-konem:token')).toBe('t1');
  });
"""

AUTH_SPEC_START = AUTH_SPEC_HEAD + """
  // TODO: неверный пароль (401), восстановление входа с токеном, который сервер не принял
});
"""

AUTH_SPEC = AUTH_SPEC_HEAD + """
  it('неверный пароль — ошибка 401, вход не состоялся', async () => {
    const done = auth.logIn({ email: USER.email, password: 'нет' });
    server
      .expectOne('/api/login')
      .flush(
        { message: 'Неверный e-mail или пароль' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await expect(done).rejects.toMatchObject({ status: 401 });
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('сервер не принял сохранённый токен — токен забыт', async () => {
    localStorage.setItem('hod-konem:token', 'expired');
    const done = auth.restore();
    server
      .expectOne('/api/me')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await done;
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('hod-konem:token')).toBeNull();
  });
});
"""

INTERCEPTOR_SPEC_HEAD = """import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth-interceptor';
import { AuthStore } from './auth-store';

describe('authInterceptor', () => {
  let http: HttpClient;
  let server: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        // Интерцептор — как в app.config.ts. Ему нужен ещё и роутер: при выходе он ведёт на /login
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => server.verify());

  // Войти: ответ на вход даёт тест
  async function logIn() {
    const done = TestBed.inject(AuthStore).logIn({
      email: 'user@example.com',
      password: 'user',
    });
    server.expectOne('/api/login').flush({
      token: 't1',
      refreshToken: 'r1',
      user: {
        id: 1,
        email: 'user@example.com',
        name: 'Пользователь',
        role: 'user',
      },
    });
    await done;
  }

  it('гость — запрос без токена', () => {
    http.get('/api/orders').subscribe();
    const request = server.expectOne('/api/orders');
    expect(request.request.headers.has('Authorization')).toBe(false);
  });
"""

INTERCEPTOR_SPEC_START = INTERCEPTOR_SPEC_HEAD + """
  // TODO: после входа — токен в запросах к /api/ и не в запросах к чужим адресам; 401 → обновление токена и повтор
});
"""

INTERCEPTOR_SPEC = INTERCEPTOR_SPEC_HEAD + """
  it('после входа — токен в запросах к нашему серверу', async () => {
    await logIn();
    http.get('/api/orders').subscribe();
    http.get('https://example.com/news').subscribe();
    const own = server.expectOne('/api/orders');
    expect(own.request.headers.get('Authorization')).toBe(
      'Bearer t1',
    );
    // Чужому серверу токен не отдаём
    const foreign = server.expectOne('https://example.com/news');
    expect(foreign.request.headers.has('Authorization')).toBe(false);
  });

  it('401 — новый токен и тот же запрос ещё раз', async () => {
    await logIn();
    let orders: unknown;
    http.get('/api/orders').subscribe((body) => (orders = body));
    server
      .expectOne('/api/orders')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    const refresh = server.expectOne('/api/refresh');
    expect(refresh.request.body).toEqual({ refreshToken: 'r1' });
    refresh.flush({ token: 't2', refreshToken: 'r2' });
    const retry = server.expectOne('/api/orders');
    expect(retry.request.headers.get('Authorization')).toBe(
      'Bearer t2',
    );
    retry.flush([]);
    expect(orders).toEqual([]);
  });
});
"""

S6_START = put(S5, **{
    'core/auth-store.spec.ts': AUTH_SPEC_START,
    'core/auth-interceptor.spec.ts': INTERCEPTOR_SPEC_START,
})
S6 = put(S6_START, **{
    'core/auth-store.spec.ts': AUTH_SPEC,
    'core/auth-interceptor.spec.ts': INTERCEPTOR_SPEC,
})

# ---------- 16.7 Тест маршрутов ----------

ROUTES_SPEC_HEAD = """import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  Router,
  provideRouter,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Account } from './account/account';
import { routes } from './app.routes';
import { CartPage } from './cart/cart-page/cart-page';
import { Checkout } from './checkout/checkout';
import { authInterceptor } from './core/auth-interceptor';
import { AuthStore } from './core/auth-store';
import { CartStore } from './core/cart-store';
import { Login } from './login/login';
import { NotFound } from './not-found/not-found';
import { fakeGame } from './testing/fake-game';

// Маршруты магазина — настоящие, из app.routes.ts: проверяем, куда попадёт покупатель
describe('маршруты', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let server: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    // Обвязка: корневой компонент с <router-outlet> — как App, только без шапки
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => server.verify());

  it('оформление с пустой корзиной — корзина', async () => {
    await harness.navigateByUrl('/checkout', CartPage);
    expect(router.url).toBe('/cart');
    expect(harness.routeNativeElement?.textContent).toContain(
      'Корзина пуста',
    );
  });
"""

ROUTES_SPEC_START = ROUTES_SPEC_HEAD + """
  // TODO: оформление с игрой в корзине, заказы без входа, админка не видна гостю, заказы после входа
});
"""

ROUTES_SPEC = ROUTES_SPEC_HEAD + """
  it('с игрой в корзине — оформление', async () => {
    TestBed.inject(CartStore).add(fakeGame());
    await harness.navigateByUrl('/checkout', Checkout);
    expect(router.url).toBe('/checkout');
  });

  it('заказы без входа — вход, а потом обратно', async () => {
    await harness.navigateByUrl('/account/orders', Login);
    expect(router.url).toBe('/login?returnUrl=%2Faccount%2Forders');
  });

  it('админка не видна гостю — 404', async () => {
    await harness.navigateByUrl('/admin', NotFound);
    expect(router.url).toBe('/admin');
  });

  it('заказы после входа — список с сервера', async () => {
    const done = TestBed.inject(AuthStore).logIn({
      email: 'user@example.com',
      password: 'user',
    });
    server.expectOne('/api/login').flush({
      token: 't1',
      refreshToken: 'r1',
      user: {
        id: 1,
        email: 'user@example.com',
        name: 'Пользователь',
        role: 'user',
      },
    });
    await done;
    // В корневом <router-outlet> — кабинет, страница заказов — во вложенном, внутри кабинета
    await harness.navigateByUrl('/account/orders', Account);
    const request = server.expectOne('/api/orders');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer t1',
    );
    request.flush([
      {
        id: 7,
        userId: 1,
        items: [{ gameId: 1, quantity: 2 }],
        total: 2390,
        createdAt: '2026-10-18T09:30:00.000Z',
      },
    ]);
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain(
      'Заказ №7',
    );
  });
});
"""

S7_START = put(S6, **{'app.routes.spec.ts': ROUTES_SPEC_START})
S7 = put(S7_START, **{'app.routes.spec.ts': ROUTES_SPEC})

# ---------- 16.8 Практикум: тесты оформления заказа ----------

SCHEMA_SPEC_HEAD = """import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { CheckoutData, checkoutSchema } from './checkout-schema';

// Заказ с именем и телефоном, самовывоз — правильный. Тест портит то, что проверяет
function validOrder(): CheckoutData {
  return {
    contacts: { name: 'Аня', phone: '+7 900 123-45-67', email: '' },
    delivery: { method: 'pickup', address: '', callBefore: false },
    postcards: [],
    comment: '',
  };
}

// Форма по схеме оформления — без компонента и шаблона. form() внедряет Injector: нужен контекст внедрения
function checkoutForm(order: CheckoutData) {
  return TestBed.runInInjectionContext(() =>
    form(signal(order), checkoutSchema),
  );
}

describe('checkoutSchema', () => {
  it('правильный заказ проходит', () => {
    expect(checkoutForm(validOrder())().valid()).toBe(true);
  });
"""

SCHEMA_SPEC_START = SCHEMA_SPEC_HEAD + """
  // TODO: ни телефона, ни e-mail; телефон с ошибкой; курьер без адреса; открытка без адресата
});
"""

SCHEMA_SPEC = SCHEMA_SPEC_HEAD + """
  it('без телефона и e-mail — «Укажите телефон или e-mail…»', () => {
    const order = validOrder();
    order.contacts.phone = '';
    const f = checkoutForm(order);
    expect(f().valid()).toBe(false);
    expect(f.contacts.email().errors()[0]?.kind).toBe('contact');
  });

  it('телефон — 11 цифр', () => {
    const order = validOrder();
    order.contacts.phone = '+7 900 123';
    const f = checkoutForm(order);
    expect(f.contacts.phone().errors()[0]?.kind).toBe('phone');
  });

  it('курьеру нужен адрес', () => {
    const f = checkoutForm(validOrder());
    f.delivery.method().value.set('courier');
    const errors = f.delivery.address().errors();
    expect(errors.map((error) => error.message)).toEqual([
      'Куда привезти заказ?',
    ]);
  });

  it('у открытки должен быть адресат', () => {
    const order = validOrder();
    order.postcards = [{ to: '', text: 'С днём рождения!' }];
    const f = checkoutForm(order);
    expect(f().valid()).toBe(false);
    expect(f.postcards[0].to().errors()[0]?.kind).toBe('required');
  });
});
"""

CHECKOUT_SPEC_HEAD = """import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    TestBed.inject(CartStore).add(fakeGame({ id: 4, price: 3190 }));
    server = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Checkout);
    await fixture.whenStable();
    page = fixture.nativeElement;
  });

  afterEach(() => server.verify());

  // Напечатать в поле: значение и событие input — как при вводе с клавиатуры
  function type(selector: string, text: string) {
    const input = page.querySelector<HTMLInputElement>(selector);
    if (!input) {
      throw new Error(`Нет поля ${selector}`);
    }
    input.value = text;
    input.dispatchEvent(new Event('input'));
  }

  // «Оформить заказ»
  async function submit() {
    page.querySelector<HTMLButtonElement>('form .button')?.click();
    await fixture.whenStable();
  }
"""

CHECKOUT_SPEC_START = CHECKOUT_SPEC_HEAD + """
  // TODO: пустая форма не уходит на сервер; заказ оформлен; на складе не хватило (409)
});
"""

CHECKOUT_SPEC = CHECKOUT_SPEC_HEAD + """
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
      expect(page.querySelector('.error-message')?.textContent).toContain(
        'На складе только 0 шт.',
      ),
    );
  });
});
"""

S8_START = put(S7, **{
    'checkout/checkout-schema.spec.ts': SCHEMA_SPEC_START,
    'checkout/checkout.spec.ts': CHECKOUT_SPEC_START,
})
S8 = put(S8_START, **{
    'checkout/checkout-schema.spec.ts': SCHEMA_SPEC,
    'checkout/checkout.spec.ts': CHECKOUT_SPEC,
})


steps = {
    '01-why-tests': {'start': S1_START, 'solution': S1},
    '02-pipe-tests': {'start': S2_START, 'solution': S2},
    '03-service-tests': {'start': S3_START, 'solution': S3},
    '04-component-tests': {'start': S4_START, 'solution': S4},
    '05-test-doubles': {'start': S4, 'solution': S5},
    '06-http-tests': {'start': S6_START, 'solution': S6},
    '07-route-tests': {'start': S7_START, 'solution': S7},
    '08-practice': {'start': S8_START, 'solution': S8},
    # 16.9 Под капотом: как запускаются тесты — без решения
    '09-tests-inside': {'start': S8},
}


def dump(target):
    """Полные снимки шагов (отформатированные) — в target/<шаг>/<start|solution>/ для опытов."""
    kinds = [(step, kind, spec[kind]) for step, spec in steps.items() for kind in ('start', 'solution') if spec.get(kind) is not None]
    for (step, kind, _), files in zip(kinds, format_snapshots([files for _, _, files in kinds])):
        path = os.path.join(target, step, kind)
        shutil.rmtree(path, ignore_errors=True)
        for name, code in files.items():
            full = os.path.join(path, name)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'w') as f:
                f.write(code)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'dump':
        dump(sys.argv[2])
    else:
        write_steps(ROOT, steps, base='15-performance/08-practice')
    print('ok')
