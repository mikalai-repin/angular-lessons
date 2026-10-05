# Генератор кода шагов главы 10: общие куски — константы, шаги — их комбинации.
# Запуск: python3 tools/authoring/ch10-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 10.
# Старт главы — решение практикума главы 9 (05-practice), в котором каталог вынесен из App в компонент Catalog
# (catalog/), мини-корзина стала страницей CartPage (cart/cart-page/), готова главная Home (home/), а App — каркас:
# шапка + <app-catalog />. Стили главы (меню в шапке, ссылки) — в header.css и styles.css.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, re, sys

PROJECT = '/Users/mr/Desktop/Experimental/angular-learn'
ROOT = f'{PROJECT}/content/10-routing'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import read_dir, step_dir, write_steps

BASE = read_dir(step_dir(f'{PROJECT}/content/09-app-state/05-practice/solution'))


def rep(text, old, new):
    assert old in text, old
    return text.replace(old, new, 1)


def cut(text, start, end):
    """Вырезать кусок от строки start (включительно) до строки end (не включая)."""
    i = text.index(start)
    j = text.index(end, i)
    return text[:i] + text[j:]


# ---------- глобальные стили ----------

STYLES = rep(BASE['styles.css'], """h1 {
  margin: 0 0 12px;
  font-size: 22px;
}""", """h1 {
  margin: 0 0 12px;
  font-size: 22px;
  color: var(--brand);
}

a {
  color: var(--brand);
}

/* Ссылка «назад» над заголовком страницы */
.back-link {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 14px;
}""")
STYLES = rep(STYLES, """.button:disabled {""", """/* Ссылка, которая выглядит как кнопка */
a.button {
  display: inline-block;
  text-decoration: none;
}

.button:disabled {""")

# ---------- App: каркас ----------

APP_CSS = """/* Стили компонента App: каркас страницы */
.page {
  padding: 16px;
}
"""


def app_ts(step):
    if step == 0:
        return """import { Component } from '@angular/core';
import { Catalog } from './catalog/catalog';
import { Header } from './layout/header/header';

// Каркас магазина: шапка и страница под ней
@Component({
  selector: 'app-root',
  imports: [Catalog, Header],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
"""
    crumbs = step >= 10
    imports = (['Breadcrumbs'] if crumbs else []) + ['Header', 'RouterOutlet']
    return ("import { Component } from '@angular/core';\nimport { RouterOutlet } from '@angular/router';\n"
            + ("import { Breadcrumbs } from './layout/breadcrumbs/breadcrumbs';\n" if crumbs else '')
            + """import { Header } from './layout/header/header';

// Каркас магазина: шапка и место, куда роутер выводит текущую страницу
@Component({
  selector: 'app-root',
  imports: [""" + ', '.join(imports) + """],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
""")


def app_html(step, start=False):
    if step == 0:
        return '<app-header />\n<main class="page">\n  <app-catalog />\n</main>\n'
    if step == 1 and start:
        return ('<app-header />\n<main class="page">\n'
                '  <!-- TODO: вместо каталога — место, куда роутер выводит страницу по адресу -->\n'
                '  <app-catalog />\n</main>\n')
    if step == 10 and start:
        return '<app-header />\n<main class="page">\n  <!-- TODO: хлебные крошки -->\n  <router-outlet />\n</main>\n'
    if step >= 10:
        return '<app-header />\n<main class="page">\n  <app-breadcrumbs />\n  <router-outlet />\n</main>\n'
    return '<app-header />\n<main class="page">\n  <router-outlet />\n</main>\n'


# ---------- маршруты ----------

def routes_ts(step, start=False):
    if step == 1 and start or step == 0:
        return """import { Routes } from '@angular/router';

// Карта магазина: какой адрес какой странице соответствует
export const routes: Routes = [
  // TODO: главная (''), каталог ('catalog') и корзина ('cart')
];
"""
    titles = step >= 8 and not (step == 8 and start)
    crumbs = step >= 10 and not (step == 10 and start)
    lazy = step >= 6 and not (step == 6 and start)

    def opts(title, crumb):
        out = ''
        if titles:
            out += f"    title: {title},\n"
        if crumbs and crumb:
            out += f"    data: {{ breadcrumb: '{crumb}' }},\n"
        return out

    imports = ["import { Routes } from '@angular/router';"]
    imports.append("import { CartPage } from './cart/cart-page/cart-page';")
    imports.append("import { Catalog } from './catalog/catalog';")
    if step >= 7 and not (step == 7 and start):
        imports.append("import { Checkout } from './checkout/checkout';")
        imports.append("import { cartNotEmptyGuard, unsavedCommentGuard } from './checkout/checkout-guards';")
    if 5 <= step and not lazy:
        imports.append("import { Account } from './account/account';")
        imports.append("import { FavoritesPage } from './account/favorites-page/favorites-page';")
        imports.append("import { OrdersPage } from './account/orders-page/orders-page';")
    if 3 <= step and not lazy:
        imports.append("import { GamePage } from './game/game-page';")
    if titles:
        imports.append("import { gameTitleResolver } from './game/game-title';")
    imports.append("import { Home } from './home/home';")
    if step >= 9 and not (step == 9 and start):
        imports.append("import { NotFound } from './not-found/not-found';")

    r = []
    r.append("  { path: '', component: Home" + (", title: 'Настольные игры'" if titles else '') + " },\n")
    r.append("  {\n    path: 'catalog',\n    component: Catalog,\n" + opts("'Каталог'", 'Каталог') + "  },\n")
    if step >= 3:
        if step == 3 and start:
            r.append("  // TODO: страница игры 'games/:id'\n")
        else:
            comp = ("    // Страница игры загружается отдельно — при первом переходе на неё\n"
                    "    loadComponent: () =>\n      import('./game/game-page').then((m) => m.GamePage),\n") if lazy \
                else "    component: GamePage,\n"
            if step == 6 and start:
                comp = "    // TODO: загружать страницу игры лениво\n" + comp
            extra = ''
            if titles:
                extra += "    // Заголовок — название игры: его находит резолвер по :id\n    title: gameTitleResolver,\n"
            if crumbs:
                extra += "    // Крошка — тоже название игры: резолвер кладёт его в data.breadcrumb\n" \
                         "    resolve: { breadcrumb: gameTitleResolver },\n"
            r.append("  {\n    path: 'games/:id',\n" + comp + extra + "  },\n")
    r.append("  {\n    path: 'cart',\n    component: CartPage,\n" + opts("'Корзина'", 'Корзина') + "  },\n")
    if step >= 7:
        if step == 7 and start:
            r.append("  // TODO: оформление заказа 'checkout' — только с непустой корзиной; спросить, прежде чем уйти с недописанным комментарием\n")
        else:
            r.append("  {\n    path: 'checkout',\n    component: Checkout,\n" + opts("'Оформление заказа'", 'Оформление заказа')
                     + "    // Пустить на страницу? Спрашивает гард перед переходом\n    canActivate: [cartNotEmptyGuard],\n"
                     + "    // Отпустить со страницы? Спрашивает гард перед уходом\n    canDeactivate: [unsavedCommentGuard],\n  },\n")
    if step >= 5:
        if step == 5 and start:
            r.append("  // TODO: кабинет 'account' с вложенными страницами 'favorites' и 'orders'\n")
        elif lazy:
            note = "    // Кабинет со всеми вложенными маршрутами — отдельный модуль: загрузится при первом переходе\n"
            if True:
                r.append("  {\n    path: 'account',\n" + note + "    loadChildren: () =>\n"
                         "      import('./account/account.routes').then((m) => m.accountRoutes),\n"
                         + ("    data: { breadcrumb: 'Кабинет' },\n" if crumbs else '') + "  },\n")
        else:
            r.append("  {\n" + ("    // TODO: загружать кабинет вместе с его маршрутами отдельно — loadChildren\n" if step == 6 and start else '')
                     + "    path: 'account',\n    component: Account,\n"
                     "    // Вложенные маршруты: их страницы выводит <router-outlet> внутри Account\n    children: [\n"
                     "      // /account → /account/favorites\n"
                     "      { path: '', redirectTo: 'favorites', pathMatch: 'full' },\n"
                     "      { path: 'favorites', component: FavoritesPage },\n"
                     "      { path: 'orders', component: OrdersPage },\n    ],\n  },\n")
    if step >= 9:
        if step == 9 and start:
            r.append("  // TODO: /games → каталог, /game/:id → /games/:id, всё остальное — страница «Нет такой страницы»\n")
        else:
            r.append("  // Без id игры показывать нечего — ведём в каталог\n  { path: 'games', redirectTo: 'catalog', pathMatch: 'full' },\n")
            r.append("  // Старые ссылки вида /game/3 из рассылок: переадресация с тем же id\n"
                     "  { path: 'game/:id', redirectTo: ({ params }) => `/games/${params['id']}` },\n")
            r.append("  // Всё, что не подошло ни одному маршруту выше. Этот маршрут — всегда последний\n"
                     "  { path: '**', component: NotFound" + (", title: 'Страница не найдена'" if titles else '') + " },\n")
    return '\n'.join(imports) + "\n\n// Карта магазина: какой адрес какой странице соответствует\nexport const routes: Routes = [\n" + ''.join(r) + "];\n"


def account_routes(step, start=False):
    if start:
        return """import { Routes } from '@angular/router';

// Только для урока: строка появится в консоли, когда браузер загрузит этот модуль
console.log('Кабинет: модуль загружен');

// Маршруты кабинета
// TODO: перенести сюда маршрут кабинета из app.routes.ts (путь '' — адрес /account уже занят родителем)
export const accountRoutes: Routes = [];
"""
    titles = step >= 8
    crumbs = step >= 10
    def opts(title, crumb):
        out = ''
        if titles:
            out += f"title: '{title}', "
        if crumbs:
            out += f"data: {{ breadcrumb: '{crumb}' }}, "
        return out
    return """import { Routes } from '@angular/router';
import { Account } from './account';
import { FavoritesPage } from './favorites-page/favorites-page';
import { OrdersPage } from './orders-page/orders-page';

// Только для урока: строка появится в консоли, когда браузер загрузит этот модуль
console.log('Кабинет: модуль загружен');

// Маршруты кабинета. Путь '' — относительно родителя: адрес /account уже совпал в app.routes.ts
export const accountRoutes: Routes = [
  {
    path: '',
    component: Account,
    children: [
      { path: '', redirectTo: 'favorites', pathMatch: 'full' },
      { path: 'favorites', component: FavoritesPage, """ + opts('Избранное', 'Избранное') + """},
      { path: 'orders', component: OrdersPage, """ + opts('Мои заказы', 'Заказы') + """},
    ],
  },
];
"""


# ---------- настройки приложения ----------

def config_ts(step, start=False):
    cfg = BASE['app.config.ts']
    if step == 0 or (step == 1 and start):
        return rep(cfg, "    { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },\n",
                   "    { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },\n    // TODO: роутер с картой маршрутов из app.routes.ts\n")
    features = []
    if step >= 3 and not (step == 3 and start):
        features.append('withComponentInputBinding()')
    if step >= 9 and not (step == 9 and start):
        features += ['withViewTransitions()', "withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })"]
    router_imports = ['provideRouter'] + [f.split('(')[0] for f in features]
    if step >= 8 and not (step == 8 and start):
        router_imports.append('TitleStrategy')
    cfg = rep(cfg, "import localeRu from '@angular/common/locales/ru';\n",
              "import localeRu from '@angular/common/locales/ru';\nimport { " + ', '.join(sorted(router_imports, key=lambda s: (s != 'TitleStrategy', s))) + " } from '@angular/router';\nimport { routes } from './app.routes';\n"
              + ("import { ShopTitleStrategy } from './layout/shop-title-strategy';\n" if step >= 8 and not (step == 8 and start) else ''))
    comments = ''
    if step >= 3 and not (step == 3 and start):
        comments += "    // withComponentInputBinding — параметры адреса попадают во входы компонента страницы\n"
    if step >= 9 and not (step == 9 and start):
        comments += "    // withViewTransitions — плавная смена страниц, withInMemoryScrolling — прокрутка как в браузере\n"
    prov = "    // Роутер: карта маршрутов и его возможности\n" + comments + "    provideRouter(routes" + ''.join(', ' + f for f in features) + "),\n"
    if step == 3 and start:
        prov = "    // Роутер: карта маршрутов\n    // TODO: параметры адреса — во входы компонента страницы\n    provideRouter(routes),\n"
    if step == 9 and start:
        prov = prov.replace("    provideRouter(", "    // TODO: плавная смена страниц и прокрутка как в браузере\n    provideRouter(")
    if step == 1 and not start or step == 2:
        prov = "    // Роутер: карта маршрутов из app.routes.ts\n    provideRouter(routes),\n"
    cfg = rep(cfg, "    { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },\n", "    { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },\n" + prov)
    if step == 8 and start:
        cfg = rep(cfg, "    // Роутер:", "    // TODO: свои правила заголовка вкладки — ShopTitleStrategy\n    // Роутер:")
    if step >= 8 and not (step == 8 and start):
        cfg = rep(cfg, "    // Роутер:", "    // Заголовок вкладки по нашим правилам: «Каталог — Ход конём»\n"
                  "    { provide: TitleStrategy, useClass: ShopTitleStrategy },\n    // Роутер:")
    return cfg


# ---------- шапка ----------

HEADER_TS_0 = BASE['layout/header/header.ts']
HEADER_TS_LINKS = rep(rep(HEADER_TS_0, "import { Component, inject } from '@angular/core';\n",
                          "import { Component, inject } from '@angular/core';\nimport { RouterLink, RouterLinkActive } from '@angular/router';\n"),
                      "imports: [PricePipe]", "imports: [PricePipe, RouterLink, RouterLinkActive]")
HEADER_TS_LINKS = rep(HEADER_TS_LINKS, "// Шапка магазина: логотип, избранное и сводка корзины\n",
                      "// Шапка магазина: логотип, меню, избранное и сводка корзины\n")


def header_ts(step, start=False):
    return HEADER_TS_0 if step < 2 or (step == 2 and start) else HEADER_TS_LINKS


def header_html(step, start=False):
    if step < 2:
        return BASE['layout/header/header.html']
    if step == 2 and start:
        return """<header class="header">
  <!-- TODO: логотип — ссылка на главную; меню «Главная», «Каталог»; сводка корзины — ссылка на /cart -->
  <span class="logo">♞ Ход конём</span>
  <span class="favorites" title="Избранное">♥ {{ favorites.count() }}</span>
  <span class="cart">В корзине: {{ cart.count() }} · {{ cart.subtotal() | price }}</span>
</header>
"""
    fav = '  <span class="favorites" title="Избранное">♥ {{ favorites.count() }}</span>\n'
    if step == 5 and start:
        fav = '  <!-- TODO: избранное — ссылка на /account/favorites -->\n' + fav
    elif step >= 5:
        fav = """  <a class="favorites" routerLink="/account/favorites" routerLinkActive="active" ariaCurrentWhenActive="page" title="Избранное"
    >♥ {{ favorites.count() }}</a
  >
"""
    return """<header class="header">
  <a class="logo" routerLink="/">♞ Ход конём</a>
  <nav class="nav">
    <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Главная</a>
    <a routerLink="/catalog" routerLinkActive="active" ariaCurrentWhenActive="page">Каталог</a>
  </nav>
""" + fav + """  <a class="cart" routerLink="/cart" routerLinkActive="active" ariaCurrentWhenActive="page"
    >В корзине: {{ cart.count() }} · {{ cart.subtotal() | price }}</a
  >
</header>
"""


HEADER_CSS = """/* Шапка магазина: логотип, избранное и корзина в первом ряду, меню — во втором */
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 10px 16px;
  background: var(--brand);
  color: #fff;
}

.logo {
  margin-right: auto;
  color: inherit;
  font-size: 20px;
  font-weight: 700;
  text-decoration: none;
}

.cart,
.favorites {
  color: inherit;
  font-size: 14px;
  white-space: nowrap;
}

/* Меню: отдельный ряд на всю ширину */
.nav {
  display: flex;
  order: 1;
  gap: 16px;
  width: 100%;
  font-size: 14px;
}

.nav a,
a.cart,
a.favorites {
  color: inherit;
  text-decoration: none;
  opacity: 0.8;
}

/* Ссылка на текущую страницу: класс active ставит routerLinkActive */
.nav a.active,
a.cart.active,
a.favorites.active {
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 4px;
}
"""

# ---------- главная ----------

HOME_TS = """import { Component, inject } from '@angular/core';
import { GAMES } from '../core/games-data';
import { SHOP_CONFIG } from '../core/shop-config';
import { GameCard } from '../shared/game-card/game-card';
import { PricePipe } from '../shared/price-pipe';

// Главная страница: приветствие и две подборки
@Component({
  selector: 'app-home',
  imports: [GameCard, PricePipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly config = inject(SHOP_CONFIG);

  protected readonly freeDeliveryFrom = this.config.freeDeliveryFrom;
  // Хиты — игры с самым высоким рейтингом
  protected readonly hits = GAMES.filter((game) => game.rating >= this.config.hitRating);
  // Игры со скидкой
  protected readonly sale = GAMES.filter((game) => game.oldPrice !== undefined);
}
"""
HOME_TS_LINKS = rep(rep(HOME_TS, "import { Component, inject } from '@angular/core';\n",
                        "import { Component, inject } from '@angular/core';\nimport { RouterLink } from '@angular/router';\n"),
                    "imports: [GameCard, PricePipe]", "imports: [GameCard, PricePipe, RouterLink]")


def home_ts(step, start=False):
    return HOME_TS if step < 2 or (step == 2 and start) else HOME_TS_LINKS


def home_html(step, start=False):
    button = ''
    if step == 2 and start:
        button = '  <!-- TODO: ссылка-кнопка «Весь каталог» -->\n'
    elif step >= 2:
        button = '  <a class="button" routerLink="/catalog">Весь каталог</a>\n'
    hits_head = '<h2 class="section-title">Хиты</h2>\n'
    if step == 4 and start:
        hits_head = '<!-- TODO: рядом с заголовком — ссылка на каталог, отсортированный по рейтингу -->\n' + hits_head
    elif step >= 4:
        hits_head = """<div class="section-head">
  <h2 class="section-title">Хиты</h2>
  <a routerLink="/catalog" [queryParams]="{ sort: 'rating' }">Все по рейтингу →</a>
</div>
"""
    return """<section class="hero">
  <h1>Настольные игры для всей семьи</h1>
  <p>Стратегии, кооперативы, игры для компании и для детей. Доставка бесплатно от {{ freeDeliveryFrom | price }}.</p>
""" + button + """</section>

""" + hits_head + """<div class="grid">
  @for (game of hits; track game.id) {
    <app-game-card [game]="game" />
  }
</div>

<h2 class="section-title">Со скидкой</h2>
<div class="grid">
  @for (game of sale; track game.id) {
    <app-game-card [game]="game" />
  }
</div>
"""


HOME_CSS = """/* Приветствие наверху главной */
.hero {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--surface);
}

.hero p {
  margin: 0 0 12px;
  color: var(--muted);
}

/* Заголовок подборки и ссылка «все» справа */
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.section-head a {
  font-size: 14px;
}

.section-title {
  margin: 16px 0 8px;
  font-size: 18px;
}
"""

# ---------- каталог (бывший App) ----------

CAT_TS_0 = BASE['app.ts']
CAT_TS_0 = rep(CAT_TS_0, "import { MiniCart } from './cart/mini-cart/mini-cart';\n", '')
CAT_TS_0 = rep(CAT_TS_0, "import { Header } from './layout/header/header';\n", '')
CAT_TS_0 = CAT_TS_0.replace("from './core/", "from '../core/").replace("from './shared/", "from '../shared/")
CAT_TS_0 = rep(CAT_TS_0, "    Header,\n", '')
CAT_TS_0 = rep(CAT_TS_0, "    MiniCart,\n", '')
CAT_TS_0 = rep(CAT_TS_0, "@Component({\n  selector: 'app-root',", "// Каталог: поиск, фильтры, сортировка и сетка карточек\n@Component({\n  selector: 'app-catalog',")
CAT_TS_0 = rep(CAT_TS_0, "  templateUrl: './app.html',\n  styleUrl: './app.css',\n})\nexport class App {",
               "  templateUrl: './catalog.html',\n  styleUrl: './catalog.css',\n})\nexport class Catalog {")

_html = BASE['app.html']
_html = rep(_html, '<app-header />\n<main class="page">\n', '')
_html = rep(_html, '\n  <app-mini-cart />\n', '')
_html = rep(_html, '  <h1>Магазин настольных игр</h1>', '  <h1>Каталог</h1>')
_html = rep(_html, '</main>\n', '')
CAT_HTML_0 = '\n'.join(l[2:] if l.startswith('  ') else l for l in _html.split('\n'))

CAT_CSS = rep(BASE['app.css'], """/* Стили компонента App: действуют только внутри его шаблона */
.page {
  padding: 16px;
}

h1 {
  color: var(--brand);
}

""", "/* Стили каталога */\n")


def catalog_ts(step, start=False):
    ts = CAT_TS_0
    if step < 3 or (step == 3 and start):
        return ts
    # шаг 3: окна «Подробнее» больше нет — у игры своя страница
    ts = rep(ts, "import { GameDetails } from '../shared/game-details/game-details';\n", '')
    ts = rep(ts, "    GameDetails,\n", '')
    ts = rep(ts, """  // Игра, открытая в окне «Подробнее»; null — окно закрыто
  protected readonly selectedGame = signal<Game | null>(null);

""", '')
    if step < 4 or (step == 4 and start):
        if step == 4 and start:
            ts = rep(ts, "  // Строка поиска, фильтры и сортировка каталога\n",
                     "  // TODO: строка поиска, фильтры и сортировка — в query-параметрах адреса: входы q, inStock, rating, sort\n"
                     "  // Строка поиска, фильтры и сортировка каталога\n")
        return ts
    # шаг 4: фильтры — в адресе
    ts = rep(ts, """import {
  Component,
  ElementRef,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
""", """import {
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  viewChild,
} from '@angular/core';
""")
    ts = rep(ts, "import { DecimalPipe, PercentPipe } from '@angular/common';\n",
             "import { DecimalPipe, PercentPipe } from '@angular/common';\nimport { ActivatedRoute, Params, Router } from '@angular/router';\n")
    ts = rep(ts, """// Варианты сортировки каталога
type SortKey = 'default' | 'cheap' | 'expensive' | 'rating';
""", """// Варианты сортировки каталога
type SortKey = 'default' | 'cheap' | 'expensive' | 'rating';

// Значение ?sort= из адреса. Адрес может набрать кто угодно: незнакомое значение — сортировка по умолчанию
function toSortKey(value: string | undefined): SortKey {
  return value === 'cheap' || value === 'expensive' || value === 'rating' ? value : 'default';
}
""")
    ts = rep(ts, """  // Строка поиска, фильтры и сортировка каталога
  protected readonly query = signal('');
  protected readonly inStockOnly = signal(false);
  protected readonly minRating = signal(0);
  protected readonly sortBy = signal<SortKey>('default');
""", """  // Строка поиска, фильтры и сортировка живут в адресе: /catalog?q=кот&inStock=true&rating=4.5&sort=cheap.
  // Роутер передаёт query-параметры во входы. Нет параметра — во вход приходит undefined
  readonly q = input('', { transform: (value: string | undefined) => value ?? '' });
  readonly inStock = input(false, { transform: booleanAttribute });
  readonly rating = input(0, { transform: (value: string | undefined) => numberAttribute(value, 0) });
  readonly sort = input('default', { transform: toSortKey });

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
""")
    ts = rep(ts, "    const query = this.query().trim().toLowerCase();", "    const query = this.q().trim().toLowerCase();")
    ts = rep(ts, "(!this.inStockOnly() || game.inStock > 0) &&", "(!this.inStock() || game.inStock > 0) &&")
    ts = rep(ts, "game.rating >= this.minRating(),", "game.rating >= this.rating(),")
    ts = rep(ts, "    switch (this.sortBy()) {", "    switch (this.sort()) {")
    ts = rep(ts, """  protected changeSort(value: string) {
    this.sortBy.set(value as SortKey);
  }

  protected resetFilters() {
    this.query.set('');
    this.inStockOnly.set(false);
    this.minRating.set(0);
    this.sortBy.set('default');
""", """  // Новые фильтры — новый адрес. merge оставляет остальные параметры, null убирает параметр из адреса
  protected setFilters(filters: Params, replaceUrl = false) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filters,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  protected resetFilters() {
    // Тот же адрес без query-параметров
    this.router.navigate([], { relativeTo: this.route });
""")
    return ts


def catalog_html(step, start=False):
    html = CAT_HTML_0
    if step < 3 or (step == 3 and start):
        return html
    # у карточки больше нет выхода open — его открывала ссылка на название
    html = rep(html, '\n      (open)="selectedGame.set(game)"', '')
    # окна «Подробнее» больше нет: блок @if (selectedGame()) в конце шаблона удаляем
    i = html.index('\n@if (selectedGame()')
    html = html[:i].rstrip('\n') + '\n'
    if step < 4 or (step == 4 and start):
        if step == 4 and start:
            html = rep(html, '<input\n  #searchBox', '<!-- TODO: поиск, флажок, рейтинг и сортировка — из входов, изменения — через setFilters -->\n<input\n  #searchBox')
        return html
    html = rep(html, """  [value]="query()"
  (input)="query.set(searchBox.value)"
""", """  [value]="q()"
  (input)="setFilters({ q: searchBox.value || null }, true)"
""")
    html = rep(html, """      #inStock
      type="checkbox"
      [checked]="inStockOnly()"
      (change)="inStockOnly.set(inStock.checked)"
""", """      #inStockBox
      type="checkbox"
      [checked]="inStock()"
      (change)="setFilters({ inStock: inStockBox.checked || null })"
""")
    html = rep(html, '<app-rating [(value)]="minRating" />',
               '<app-rating [value]="rating()" (valueChange)="setFilters({ rating: $event || null })" />')
    html = rep(html, """    #sort
    aria-label="Сортировка"
    [value]="sortBy()"
    (change)="changeSort(sort.value)"
""", """    #sortSelect
    aria-label="Сортировка"
    [value]="sort()"
    (change)="setFilters({ sort: sortSelect.value === 'default' ? null : sortSelect.value })"
""")
    return html


# ---------- корзина-страница (бывшая мини-корзина) ----------

CART_TS_0 = rep(BASE['cart/mini-cart/mini-cart.ts'], "// Мини-корзина над каталогом: позиции, итоги, промокод\n@Component({\n  selector: 'app-mini-cart',",
                "// Страница корзины: позиции, итоги, промокод\n@Component({\n  selector: 'app-cart-page',")
CART_TS_0 = rep(CART_TS_0, "  templateUrl: './mini-cart.html',\n  styleUrl: './mini-cart.css',\n})\nexport class MiniCart {",
                "  templateUrl: './cart-page.html',\n  styleUrl: './cart-page.css',\n})\nexport class CartPage {")
CART_TS_LINKS = rep(rep(CART_TS_0, "import { Component, inject, signal } from '@angular/core';\n",
                        "import { Component, inject, signal } from '@angular/core';\nimport { RouterLink } from '@angular/router';\n"),
                    "imports: [PricePipe, Quantity]", "imports: [PricePipe, Quantity, RouterLink]")


def cart_ts(step, start=False):
    return CART_TS_0 if step < 2 or (step == 2 and start) else CART_TS_LINKS


def cart_html(step, start=False):
    html = BASE['cart/mini-cart/mini-cart.html']
    html = rep(html, '@if (cart.items().length > 0) {\n  <section class="mini-cart">\n    <h2>Корзина</h2>\n',
               '<h1>Корзина</h1>\n@if (cart.items().length > 0) {\n  <section class="cart">\n')
    checkout = ''
    if step == 7 and start:
        checkout = '    <!-- TODO: ссылка-кнопка «Оформить заказ» -->\n'
    elif step >= 7:
        checkout = '    <a class="button" routerLink="/checkout">Оформить заказ</a>\n'
    html = rep(html, """    <button class="link-button" (click)="cart.clear()">
      Очистить корзину
    </button>
  </section>
}""", checkout + """    <button class="link-button" (click)="cart.clear()">
      Очистить корзину
    </button>
  </section>
} @else {
""" + ("""  <p class="muted">
    Корзина пуста. <a routerLink="/catalog">Перейти в каталог</a>
  </p>
""" if step >= 2 and not (step == 2 and start) else ("  <!-- TODO: ссылка в каталог -->\n" if step == 2 else '') + '  <p class="muted">Корзина пуста.</p>\n') + "}")
    return html


CART_CSS = rep(BASE['cart/mini-cart/mini-cart.css'], """/* Мини-корзина над каталогом */
:host {
  display: block;
}

.mini-cart {""", """/* Страница корзины */
.cart {
  max-width: 480px;""")
CART_CSS = CART_CSS.replace('.mini-cart', '.cart')
CART_CSS = CART_CSS.replace("""/* Промокод */""", """/* «Оформить заказ» и «Очистить корзину» */
.cart > .button {
  margin-right: 12px;
}

/* Промокод */""")

# ---------- карточка ----------

CARD_TS_0 = BASE['shared/game-card/game-card.ts']
CARD_HTML_0 = BASE['shared/game-card/game-card.html']
CARD_CSS_0 = BASE['shared/game-card/game-card.css']


def card_ts(step, start=False):
    if step < 3 or (step == 3 and start):
        return CARD_TS_0
    ts = rep(CARD_TS_0, "import {\n  Component,\n  computed,\n  inject,\n  input,\n  output,\n} from '@angular/core';\n",
             "import { Component, computed, inject, input } from '@angular/core';\n")
    ts = rep(ts, "import { DecimalPipe } from '@angular/common';\n",
             "import { DecimalPipe } from '@angular/common';\nimport { RouterLink } from '@angular/router';\n")
    ts = rep(ts, "    Rating,\n    Tooltip,\n  ],", "    Rating,\n    RouterLink,\n    Tooltip,\n  ],")
    ts = rep(ts, "  // Покупатель хочет посмотреть подробности об игре\n  readonly open = output();\n", '')
    return ts


def card_html(step, start=False):
    if step < 3:
        return CARD_HTML_0
    if step == 3 and start:
        return rep(CARD_HTML_0, '<h2 class="title">\n', '<!-- TODO: название — ссылка на страницу игры /games/:id -->\n<h2 class="title">\n')
    return rep(CARD_HTML_0, """  <button class="title-button" (click)="open.emit()">
    {{ game().title }}
  </button>""", """  <a class="title-link" [routerLink]="['/games', game().id]">
    {{ game().title }}
  </a>""")


def card_css(step, start=False):
    if step < 3 or (step == 3 and start):
        return CARD_CSS_0
    return rep(CARD_CSS_0, """/* Название — кнопка: щелчок открывает окно «Подробнее» */
.title-button {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.title-button:hover {
  text-decoration: underline;
}""", """/* Название — ссылка на страницу игры */
.title-link {
  color: inherit;
  text-decoration: none;
}

.title-link:hover {
  text-decoration: underline;
}""")


# ---------- страница игры (бывшее окно «Подробнее») ----------

_d = BASE['shared/game-details/game-details.html']
_i = _d.index('  <div class="head">')
_j = _d.index('</dialog>')
_body = _d[_i:_j]
_body = _body.replace('game().', 'game.').replace('[disabled]="cart.available(game) === 0"', '[disabled]="cart.available(game) === 0"')
_body = _body.replace('cart.add(game())', 'cart.add(game)').replace('cart.available(game())', 'cart.available(game)')
_body = _body.replace('<h2 class="title">', '<h1 class="title">').replace('</h2>', '</h1>')
GAME_HTML = ('@if (game(); as game) {\n  <a class="back-link" routerLink="/catalog">← Каталог</a>\n' + _body
             + """} @else {
  <h1>Игра не найдена</h1>
  <p class="muted">Такой игры в каталоге нет. <a routerLink="/catalog">Перейти в каталог</a></p>
}
""")
assert 'game()' not in GAME_HTML.replace('@if (game(); as game)', ''), GAME_HTML

GAME_CSS = cut(BASE['shared/game-details/game-details.css'], '/* Окно «Подробнее» поверх страницы */', '.head {')
GAME_CSS = "/* Страница игры */\n" + GAME_CSS
GAME_CSS = rep(GAME_CSS, """.head {
  display: flex;
  gap: 12px;
}""", """.head {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}""")
GAME_CSS = rep(GAME_CSS, """.cover {
  width: 120px;""", """.cover {
  width: 160px;""")
GAME_CSS = rep(GAME_CSS, """.title {
  margin: 0;
  padding-right: 24px;
  font-size: 18px;
}""", """.title {
  margin: 0;
  font-size: 22px;
}""")


def game_ts(start=False):
    head = """import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../core/cart-store';
import { GAMES } from '../core/games-data';
import { Countdown } from '../shared/countdown/countdown';
import { DurationPipe } from '../shared/duration-pipe';
import { PlayersPipe } from '../shared/players-pipe';
import { PricePipe } from '../shared/price-pipe';
import { Rating } from '../shared/rating/rating';
import { Tab } from '../shared/tabs/tab';
import { Tabs } from '../shared/tabs/tabs';

// Страница игры: обложка, цена, «В корзину», описание и характеристики
@Component({
  selector: 'app-game-page',
  imports: [Countdown, DurationPipe, PlayersPipe, PricePipe, Rating, RouterLink, Tab, Tabs],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export class GamePage {
"""
    if start:
        head = head.replace("import { Component, computed, inject, input, numberAttribute } from '@angular/core';",
                            "import { Component, computed, inject, signal } from '@angular/core';")
        head = head.replace("import { GAMES } from '../core/games-data';\n", "import { Game } from '../core/models';\n")
        return head + """  // TODO: вход id — параметр маршрута :id (из адреса приходит строка — нужно число)
  // TODO: игра с этим id из GAMES (computed). Пока игры нет — undefined
  protected readonly game = signal<Game | undefined>(undefined);

  protected readonly cart = inject(CartStore);
  // Сколько штук этой игры уже в корзине
  protected readonly inCart = computed(() => {
    const game = this.game();
    return game ? this.cart.quantityOf(game) : 0;
  });
}
"""
    return head + """  // Параметр маршрута :id — во вход его кладёт роутер (withComponentInputBinding).
  // Из адреса приходит строка: numberAttribute превращает её в число
  readonly id = input.required({ transform: numberAttribute });

  // Игра с этим id; undefined — такой игры нет
  protected readonly game = computed(() => GAMES.find((game) => game.id === this.id()));

  protected readonly cart = inject(CartStore);
  // Сколько штук этой игры уже в корзине
  protected readonly inCart = computed(() => {
    const game = this.game();
    return game ? this.cart.quantityOf(game) : 0;
  });
}
"""


GAME_TITLE_START = """import { ResolveFn } from '@angular/router';
import { GAMES } from '../core/games-data';

// Заголовок страницы игры — её название
// TODO: резолвер gameTitleResolver: игра по параметру :id; нет такой — «Игра не найдена»
"""
GAME_TITLE = """import { ResolveFn } from '@angular/router';
import { GAMES } from '../core/games-data';

// Заголовок страницы игры — её название. Роутер вызывает резолвер до того, как показать страницу
export const gameTitleResolver: ResolveFn<string> = (route) => {
  const id = Number(route.paramMap.get('id'));
  return GAMES.find((game) => game.id === id)?.title ?? 'Игра не найдена';
};
"""

TITLE_STRATEGY_START = """import { Service, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

// Заголовок вкладки по правилам магазина: «Каталог — Ход конём»
// TODO: класс ShopTitleStrategy, наследник TitleStrategy, с методом updateTitle
"""
TITLE_STRATEGY = """import { Service, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

// Заголовок вкладки по правилам магазина: «Каталог — Ход конём».
// autoProvided: false — сама в DI не попадает, её подставляет провайдер TitleStrategy в app.config.ts
@Service({ autoProvided: false })
export class ShopTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  // Роутер вызывает метод после каждого успешного перехода
  override updateTitle(snapshot: RouterStateSnapshot) {
    // title самого глубокого маршрута: строка из карты маршрутов или ответ резолвера
    const title = this.buildTitle(snapshot);
    this.title.setTitle(title ? `${title} — Ход конём` : 'Ход конём');
  }
}
"""

# ---------- кабинет ----------

FAV_STORE = rep(BASE['core/favorites-store.ts'], "  readonly count = computed(() => this.ids().length);\n",
                "  readonly count = computed(() => this.ids().length);\n"
                "  // Игры из избранного — для страницы «Избранное» в кабинете\n"
                "  readonly games = computed(() => GAMES.filter((game) => this.ids().includes(game.id)));\n")

ACCOUNT_TS_START = """import { Component } from '@angular/core';

// Личный кабинет: заголовок, меню разделов и место для страницы раздела
// TODO: меню «Избранное» / «Заказы» и место, куда роутер выведет раздел
@Component({
  selector: 'app-account',
  imports: [],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {}
"""
ACCOUNT_TS = """import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// Личный кабинет: заголовок, меню разделов и место для страницы раздела
@Component({
  selector: 'app-account',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {}
"""
ACCOUNT_HTML_START = """<h1>Личный кабинет</h1>
<!-- TODO: меню разделов и место для страницы раздела -->
"""
ACCOUNT_HTML = """<h1>Личный кабинет</h1>
<!-- Ссылки без «/» в начале — относительные: от адреса этой страницы, /account -->
<nav class="sections">
  <a routerLink="favorites" routerLinkActive="active" ariaCurrentWhenActive="page">Избранное</a>
  <a routerLink="orders" routerLinkActive="active" ariaCurrentWhenActive="page">Заказы</a>
</nav>
<!-- Сюда роутер выводит дочернюю страницу: FavoritesPage или OrdersPage -->
<router-outlet />
"""
ACCOUNT_CSS = """/* Меню разделов кабинета */
.sections {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  border-bottom: 1px solid #d2d2d7;
}

.sections a {
  padding: 6px 0;
  color: var(--muted);
  text-decoration: none;
}

/* Текущий раздел: класс active ставит routerLinkActive */
.sections a.active {
  border-bottom: 2px solid var(--brand);
  color: var(--text);
}
"""
FAV_PAGE_TS = """import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesStore } from '../../core/favorites-store';
import { GameCard } from '../../shared/game-card/game-card';

// Раздел кабинета «Избранное»: игры, отмеченные сердечком
@Component({
  selector: 'app-favorites-page',
  imports: [GameCard, RouterLink],
  templateUrl: './favorites-page.html',
})
export class FavoritesPage {
  protected readonly favorites = inject(FavoritesStore);
}
"""
FAV_PAGE_HTML = """@if (favorites.games().length > 0) {
  <div class="grid">
    @for (game of favorites.games(); track game.id) {
      <app-game-card [game]="game" />
    }
  </div>
} @else {
  <p class="muted">
    В избранном пока пусто. Отмечайте игры сердечком в
    <a routerLink="/catalog">каталоге</a>.
  </p>
}
"""
ORDERS_PAGE_TS = """import { Component } from '@angular/core';

// Раздел кабинета «Заказы». Заказы появятся, когда в магазине можно будет оформить заказ
@Component({
  selector: 'app-orders-page',
  templateUrl: './orders-page.html',
})
export class OrdersPage {}
"""
ORDERS_PAGE_HTML = '<p class="muted">Здесь появятся ваши заказы.</p>\n'

# ---------- оформление заказа ----------

CHECKOUT_TS = """import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../core/cart-store';
import { PricePipe } from '../shared/price-pipe';

// Оформление заказа. Пока здесь только сводка и комментарий — форма доставки и оплаты появится позже
@Component({
  selector: 'app-checkout',
  imports: [PricePipe, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  protected readonly cart = inject(CartStore);

  // Комментарий к заказу — состояние интерфейса этой страницы
  protected readonly comment = signal('');

  // Есть ли что потерять, если уйти со страницы. Об этом спрашивает гард canDeactivate
  hasUnsavedChanges(): boolean {
    return this.comment().trim() !== '';
  }
}
"""
CHECKOUT_HTML = """<a class="back-link" routerLink="/cart">← Корзина</a>
<h1>Оформление заказа</h1>
<p>
  Товаров: {{ cart.count() }} шт. на {{ cart.subtotal() | price }}, к оплате
  <b>{{ cart.total() | price }}</b>.
</p>
<label class="field">
  Комментарий к заказу
  <textarea #commentBox rows="3" [value]="comment()" (input)="comment.set(commentBox.value)"></textarea>
</label>
<p class="muted">Адрес доставки и способ оплаты появятся здесь позже.</p>
"""
CHECKOUT_CSS = """/* Поле комментария */
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 480px;
  font-size: 14px;
}

.field textarea {
  padding: 8px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font: inherit;
  resize: vertical;
}
"""
GUARDS_START = """import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { CartStore } from '../core/cart-store';
import { Checkout } from './checkout';

// TODO: cartNotEmptyGuard — пустая корзина? Вместо оформления — страница корзины
// TODO: unsavedCommentGuard — уходят с недописанным комментарием? Спросить через confirm()
"""
GUARDS = """import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { CartStore } from '../core/cart-store';
import { Checkout } from './checkout';

// Оформлять нечего, если корзина пуста: вместо оформления — страница корзины
export const cartNotEmptyGuard: CanActivateFn = () => {
  const cart = inject(CartStore);
  const router = inject(Router);
  return cart.items().length > 0 || router.createUrlTree(['/cart']);
};

// Уходят со страницы с недописанным комментарием — спросить. false отменяет переход
export const unsavedCommentGuard: CanDeactivateFn<Checkout> = (checkout) =>
  !checkout.hasUnsavedChanges() || confirm('Комментарий к заказу не сохранится. Уйти со страницы?');
"""

# ---------- 404 ----------

NOT_FOUND_TS = """import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Страница для адресов, которых нет в карте маршрутов
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
})
export class NotFound {}
"""
NOT_FOUND_HTML = """<h1>Нет такой страницы</h1>
<p class="muted">Возможно, ссылка устарела или в адресе опечатка.</p>
<a class="button" routerLink="/">На главную</a>
"""

# ---------- хлебные крошки (практикум) ----------

CRUMBS_TS_START = """import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

// Одна крошка: подпись и адрес страницы
interface Crumb {
  label: string;
  url: string;
}

// Хлебные крошки: «Главная › Кабинет › Избранное» — путь от главной до текущей страницы
// TODO: crumbs — цепочка крошек по дереву активных маршрутов; пересчитывается после каждого перехода
@Component({
  selector: 'app-breadcrumbs',
  imports: [],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.css',
})
export class Breadcrumbs {
  private readonly router = inject(Router);
}
"""
CRUMBS_TS = """import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

// Одна крошка: подпись и адрес страницы
interface Crumb {
  label: string;
  url: string;
}

// Хлебные крошки: «Главная › Кабинет › Избранное» — путь от главной до текущей страницы
@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.css',
})
export class Breadcrumbs {
  private readonly router = inject(Router);

  protected readonly crumbs = computed(() => {
    // lastSuccessfulNavigation — сигнал: после каждого перехода crumbs пересчитается
    this.router.lastSuccessfulNavigation();
    const crumbs: Crumb[] = [{ label: 'Главная', url: '/' }];
    let route = this.router.routerState.snapshot.root;
    let url = '';
    // Спускаемся по дереву активных маршрутов от корня к текущей странице
    while (route.firstChild) {
      route = route.firstChild;
      // У маршрута с пустым путём нет своего куска адреса, а data он наследует от родителя — пропускаем
      if (route.url.length === 0) {
        continue;
      }
      url += '/' + route.url.map((segment) => segment.path).join('/');
      const label = route.data['breadcrumb'];
      if (label) {
        crumbs.push({ label, url });
      }
    }
    return crumbs;
  });
}
"""
CRUMBS_HTML_START = '<!-- TODO: крошки через «›»; последняя — не ссылка; на главной крошек нет -->\n'
CRUMBS_HTML = """@if (crumbs().length > 1) {
  <nav class="breadcrumbs" aria-label="Хлебные крошки">
    @for (crumb of crumbs(); track crumb.url; let last = $last) {
      @if (last) {
        <span aria-current="page">{{ crumb.label }}</span>
      } @else {
        <a [routerLink]="crumb.url">{{ crumb.label }}</a>
      }
    }
  </nav>
}
"""
CRUMBS_CSS = """/* Хлебные крошки над заголовком страницы */
.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--muted);
}

/* Разделитель после каждой ссылки */
.breadcrumbs a::after {
  content: ' ›';
  color: var(--muted);
}
"""

# ---------- журнал навигации (шаг «под капотом») ----------

ROUTER_LOG = """// Журнал навигации: в консоли — события роутера при каждом переходе и дерево активных маршрутов после него.
// Только для изучения: в настоящем приложении такой журнал не нужен (для отладки есть withDebugTracing()).
import { Injector } from '@angular/core';
import { ActivatedRouteSnapshot, Event, NavigationEnd, NavigationStart, Router } from '@angular/router';

// Дерево активных маршрутов: путь из карты маршрутов, параметры и компонент
function printTree(route: ActivatedRouteSnapshot, depth = 0) {
  const path = route.routeConfig ? `'${route.routeConfig.path}'` : 'корень';
  const params = Object.keys(route.params).length > 0 ? ` params ${JSON.stringify(route.params)}` : '';
  const component = route.component ? ` → ${route.component.name}` : '';
  console.log(`${'  '.repeat(depth + 1)}${path}${params}${component}`);
  route.children.forEach((child) => printTree(child, depth + 1));
}

export function logNavigation(injector: Injector) {
  const router = injector.get(Router);
  router.events.subscribe((event: Event) => {
    if (event instanceof NavigationStart) {
      console.log('────────────');
    }
    // У событий роутера есть toString(): «NavigationStart(id: 2, url: '/catalog')»
    console.log(String(event));
    if (event instanceof NavigationEnd) {
      console.log('Дерево активных маршрутов:');
      printTree(router.routerState.snapshot.root);
    }
  });
}
"""
MAIN_LOG = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logNavigation } from './router-log';

bootstrapApplication(App, appConfig)
  .then((appRef) => logNavigation(appRef.injector))
  .catch((err) => console.error(err));
"""
# Журнал подключается после запуска — первую навигацию он уже не застанет. Поэтому журнал создаётся раньше:
MAIN_LOG = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logNavigation } from './router-log';

// Журнал навигации подключается в провайдере, который выполняется при запуске приложения — до первого перехода
bootstrapApplication(App, {
  providers: [...appConfig.providers, logNavigation()],
}).catch((err) => console.error(err));
"""
ROUTER_LOG = ROUTER_LOG.replace("""import { Injector } from '@angular/core';""", """import { inject, provideAppInitializer } from '@angular/core';""")
ROUTER_LOG = ROUTER_LOG.replace("""export function logNavigation(injector: Injector) {
  const router = injector.get(Router);
  router.events.subscribe((event: Event) => {""", """// Провайдер: функция выполнится при запуске приложения, раньше первой навигации
export function logNavigation() {
  return provideAppInitializer(() => {
    const router = inject(Router);
    router.events.subscribe((event: Event) => {""")
ROUTER_LOG = ROUTER_LOG.replace("""    if (event instanceof NavigationStart) {
      console.log('────────────');
    }
    // У событий роутера есть toString(): «NavigationStart(id: 2, url: '/catalog')»
    console.log(String(event));
    if (event instanceof NavigationEnd) {
      console.log('Дерево активных маршрутов:');
      printTree(router.routerState.snapshot.root);
    }
  });
}""", """      if (event instanceof NavigationStart) {
        console.log('────────────');
      }
      // У событий роутера есть toString(): «NavigationStart(id: 2, url: '/catalog')»
      console.log(String(event));
      if (event instanceof NavigationEnd) {
        console.log('Дерево активных маршрутов:');
        printTree(router.routerState.snapshot.root);
      }
    });
  });
}""")


# ---------- шаги ----------

def solution(step):
    """Полный код решения шага (шаг 0 — старт главы без заготовок)."""
    out = dict(BASE)
    for name in ['cart/mini-cart/mini-cart.ts', 'cart/mini-cart/mini-cart.html', 'cart/mini-cart/mini-cart.css']:
        del out[name]
    out['styles.css'] = STYLES
    out['app.ts'] = app_ts(step)
    out['app.html'] = app_html(step)
    out['app.css'] = APP_CSS
    out['app.routes.ts'] = routes_ts(step)
    out['app.config.ts'] = config_ts(step)
    out['layout/header/header.ts'] = header_ts(step)
    out['layout/header/header.html'] = header_html(step)
    out['layout/header/header.css'] = HEADER_CSS
    out['home/home.ts'] = home_ts(step)
    out['home/home.html'] = home_html(step)
    out['home/home.css'] = HOME_CSS
    out['catalog/catalog.ts'] = catalog_ts(step)
    out['catalog/catalog.html'] = catalog_html(step)
    out['catalog/catalog.css'] = CAT_CSS
    out['cart/cart-page/cart-page.ts'] = cart_ts(step)
    out['cart/cart-page/cart-page.html'] = cart_html(step)
    out['cart/cart-page/cart-page.css'] = CART_CSS
    out['shared/game-card/game-card.ts'] = card_ts(step)
    out['shared/game-card/game-card.html'] = card_html(step)
    out['shared/game-card/game-card.css'] = card_css(step)
    if step >= 3:
        for name in ['shared/game-details/game-details.ts', 'shared/game-details/game-details.html',
                     'shared/game-details/game-details.css']:
            del out[name]
        out['game/game-page.ts'] = game_ts()
        out['game/game-page.html'] = GAME_HTML
        out['game/game-page.css'] = GAME_CSS
    if step >= 5:
        out['core/favorites-store.ts'] = FAV_STORE
        out['account/account.ts'] = ACCOUNT_TS
        out['account/account.html'] = ACCOUNT_HTML
        out['account/account.css'] = ACCOUNT_CSS
        out['account/favorites-page/favorites-page.ts'] = FAV_PAGE_TS
        out['account/favorites-page/favorites-page.html'] = FAV_PAGE_HTML
        out['account/orders-page/orders-page.ts'] = ORDERS_PAGE_TS
        out['account/orders-page/orders-page.html'] = ORDERS_PAGE_HTML
    if step >= 6:
        out['account/account.routes.ts'] = account_routes(step)
    if step >= 7:
        out['checkout/checkout.ts'] = CHECKOUT_TS
        out['checkout/checkout.html'] = CHECKOUT_HTML
        out['checkout/checkout.css'] = CHECKOUT_CSS
        out['checkout/checkout-guards.ts'] = GUARDS
    if step >= 8:
        out['game/game-title.ts'] = GAME_TITLE
        out['layout/shop-title-strategy.ts'] = TITLE_STRATEGY
    if step >= 9:
        out['not-found/not-found.ts'] = NOT_FOUND_TS
        out['not-found/not-found.html'] = NOT_FOUND_HTML
    if step >= 10:
        out['layout/breadcrumbs/breadcrumbs.ts'] = CRUMBS_TS
        out['layout/breadcrumbs/breadcrumbs.html'] = CRUMBS_HTML
        out['layout/breadcrumbs/breadcrumbs.css'] = CRUMBS_CSS
    return out


def start(step):
    """Старт шага: решение прошлого шага + заготовки этого."""
    out = solution(step - 1)
    out['app.routes.ts'] = routes_ts(step, start=True)
    out['app.config.ts'] = config_ts(step, start=True)
    out['app.html'] = app_html(step, start=True)
    out['layout/header/header.ts'] = header_ts(step, start=True)
    out['layout/header/header.html'] = header_html(step, start=True)
    out['home/home.ts'] = home_ts(step, start=True)
    out['home/home.html'] = home_html(step, start=True)
    out['catalog/catalog.ts'] = catalog_ts(step, start=True)
    out['catalog/catalog.html'] = catalog_html(step, start=True)
    out['cart/cart-page/cart-page.ts'] = cart_ts(step, start=True)
    out['cart/cart-page/cart-page.html'] = cart_html(step, start=True)
    out['shared/game-card/game-card.ts'] = card_ts(step, start=True)
    out['shared/game-card/game-card.html'] = card_html(step, start=True)
    out['shared/game-card/game-card.css'] = card_css(step, start=True)
    if step == 3:
        out['game/game-page.ts'] = game_ts(start=True)
        out['game/game-page.html'] = GAME_HTML
        out['game/game-page.css'] = GAME_CSS
    if step == 5:
        out['core/favorites-store.ts'] = FAV_STORE
        out['account/account.ts'] = ACCOUNT_TS_START
        out['account/account.html'] = ACCOUNT_HTML_START
        out['account/account.css'] = ACCOUNT_CSS
        out['account/favorites-page/favorites-page.ts'] = FAV_PAGE_TS
        out['account/favorites-page/favorites-page.html'] = FAV_PAGE_HTML
        out['account/orders-page/orders-page.ts'] = ORDERS_PAGE_TS
        out['account/orders-page/orders-page.html'] = ORDERS_PAGE_HTML
    if step == 6:
        out['account/account.routes.ts'] = account_routes(6, start=True)
    if step == 7:
        out['checkout/checkout.ts'] = CHECKOUT_TS
        out['checkout/checkout.html'] = CHECKOUT_HTML
        out['checkout/checkout.css'] = CHECKOUT_CSS
        out['checkout/checkout-guards.ts'] = GUARDS_START
    if step == 8:
        out['game/game-title.ts'] = GAME_TITLE_START
        out['layout/shop-title-strategy.ts'] = TITLE_STRATEGY_START
    if step == 9:
        out['not-found/not-found.ts'] = NOT_FOUND_TS
        out['not-found/not-found.html'] = NOT_FOUND_HTML
    if step == 10:
        out['layout/breadcrumbs/breadcrumbs.ts'] = CRUMBS_TS_START
        out['layout/breadcrumbs/breadcrumbs.html'] = CRUMBS_HTML_START
        out['layout/breadcrumbs/breadcrumbs.css'] = CRUMBS_CSS
    return out


S1_START = {**solution(0)}
S1_START['app.routes.ts'] = routes_ts(1, start=True)
S1_START['app.config.ts'] = config_ts(1, start=True)
S1_START['app.html'] = app_html(1, start=True)

steps = {
    '01-routes': {'start': S1_START, 'solution': solution(1)},
    '02-links': {'start': start(2), 'solution': solution(2)},
    '03-params': {'start': start(3), 'solution': solution(3)},
    '04-query-params': {'start': start(4), 'solution': solution(4)},
    '05-child-routes': {'start': start(5), 'solution': solution(5)},
    '06-lazy-loading': {'start': start(6), 'solution': solution(6)},
    '07-guards': {'start': start(7), 'solution': solution(7)},
    '08-titles': {'start': start(8), 'solution': solution(8)},
    '09-not-found': {'start': start(9), 'solution': solution(9)},
    '10-practice': {'start': start(10), 'solution': solution(10)},
    '11-router-inside': {'start': {**solution(10), 'router-log.ts': ROUTER_LOG, 'main.ts': MAIN_LOG}},
}

if __name__ == '__main__':
    # Запись на диск: start/, совпадающий с результатом предыдущего шага, не записывается (см. steps.py)
    write_steps(ROOT, steps, base='09-app-state/05-practice')
    print('ok')
