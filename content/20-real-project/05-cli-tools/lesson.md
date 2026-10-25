---
title: Генераторы и линтер
focus: shared/rating/rating.html
api: [ng generate, '--dry-run', '@Service()', ng add, angular-eslint, ng lint, ng update]
---

В превью каждый новый компонент мы создавали руками: три файла, декоратор, селектор, `imports`. В проекте CLI это делает команда. Кроме генераторов у CLI есть `ng add` — подключить библиотеку вместе с её настройкой — и `ng update` — обновить Angular и поправить код под новую версию. А с `ng add` в проект приходит **линтер**: он проверит магазин на то, чего не ловит компилятор.

## `ng generate`

```bash
ng generate component shared/badge --dry-run
```

```text
CREATE src/app/shared/badge/badge.css (0 bytes)
CREATE src/app/shared/badge/badge.spec.ts (525 bytes)
CREATE src/app/shared/badge/badge.ts (181 bytes)
CREATE src/app/shared/badge/badge.html (20 bytes)

NOTE: The "--dry-run" option means no changes were made.
```

`--dry-run` показывает, что команда сделает, ничего не записывая. Путь считается от `src/app`. Без флага появятся четыре файла, и класс в них — ровно в стиле курса:

```ts src/app/shared/badge/badge.ts
@Component({
  imports: [],
  selector: 'app-badge',
  styleUrl: './badge.css',
  templateUrl: './badge.html',
})
export class Badge {}
```

Тест `badge.spec.ts` создаёт компонент через `TestBed` и проверяет, что он создался, — с этого же мы начинали в главе 16.

Генераторы есть почти для всего, что встречалось в курсе. Сокращения — в скобках:

| Команда | Что создаёт |
|---|---|
| `ng g component` (`c`) | компонент: `.ts`, `.html`, `.css`, `.spec.ts` |
| `ng g service` (`s`) | сервис с `@Service()` и тест |
| `ng g directive` (`d`), `ng g pipe` (`p`) | директиву, пайп |
| `ng g guard` (`g`), `ng g resolver` (`r`) | функцию-гард `CanActivateFn`, резолвер |
| `ng g interceptor` | функцию-интерцептор |
| `ng g environments` | файлы окружений (шаг 9) |

Полный список — `ng generate --help`. Например, `ng g s core/stock-alerts` создаёт:

```ts src/app/core/stock-alerts.ts
import { Service } from '@angular/core';

@Service()
export class StockAlerts {}
```

Генератор — это **схема** (schematic): небольшая программа, которая создаёт и меняет файлы проекта. Схемы `ng generate` лежат в пакете `@schematics/angular`, и именно оттуда курс брал соглашения по именам. Значения по умолчанию для схем можно задать в `angular.json`:

```json angular.json
"schematics": {
  "@schematics/angular:component": { "skipTests": true }
}
```

С такой настройкой `ng g c` больше не создаёт `.spec.ts` — мы проверили. Флаг в командной строке по-прежнему главнее.

## `ng add`

`ng add <пакет>` ставит пакет npm и запускает его схему `ng-add`: она настраивает проект. Мы воспользуемся ею дважды: сейчас — для линтера, в шаге 7 — для рендеринга на сервере.

```bash
ng add angular-eslint
```

CLI найдёт версию, совместимую с вашим Angular, спросит подтверждение и выполнит схему:

```text
✔ Searching for compatible package version
  › Found compatible package version: 22.6.0.
    angular-eslint v22 matches this workspace's Angular v22.
CREATE eslint.config.js (1004 bytes)
UPDATE package.json (1284 bytes)
UPDATE angular.json (2549 bytes)
```

Схема создала настройки ESLint (`eslint.config.js`), добавила пакеты (`eslint`, `typescript-eslint`, `angular-eslint`), скрипт `"lint": "ng lint"` и цель `lint` в `angular.json` со сборщиком `@angular-eslint/builder:lint`. В `eslint.config.js` подключены рекомендованные правила для `.ts` и для шаблонов — в том числе правила доступности (`templateAccessibility`).

## `ng lint`

**Линтер** проверяет не «скомпилируется ли», а «стоит ли так писать»: неиспользуемые переменные, пустые функции, соглашения об именах, доступность. Запускаем на магазине:

```bash
ng lint
```

```text
src/app/app.ts
  38:24  error  Unexpected empty arrow function  @typescript-eslint/no-empty-function

src/app/core/auth-store.ts
  95:35  error  Unexpected empty method 'error'  @typescript-eslint/no-empty-function

src/app/core/cart-store.ts
  178:22  error  Unexpected empty arrow function  @typescript-eslint/no-empty-function

src/app/layout/quick-search/quick-search.ts
  16:10  error  'Game' is defined but never used  @typescript-eslint/no-unused-vars

src/app/shared/field-aria.ts
  13:13  error  The selector should start with one of these prefixes: "app"
                @angular-eslint/directive-selector

src/app/shared/rating/rating.html
  2:3  error  click must be accompanied by either keyup, keydown or keypress
              event for accessibility  @angular-eslint/template/click-events-have-key-events
  2:3  error  Elements with interaction handlers must be focusable
              @angular-eslint/template/interactive-supports-focus

✖ 7 problems (7 errors, 0 warnings)
```

Номера строк — у кода на конец шага 3. Разберём каждое замечание: линтер не всегда прав, но каждое стоит понять.

- **Пустые функции** — два `.catch(() => {})` и `error: () => {}`: аналитика и выход глушили ошибки молча. Мы сделали это сознательно, но «молча» — плохо: если аналитика сломается, никто не узнает. Линтер прав — пишем ошибку в консоль.
- **Неиспользуемый импорт** `Game` в быстром поиске — остался от прошлых правок. Просто удаляем.
- **Префикс селектора.** Правило требует, чтобы селекторы директив начинались с `app`. Но `FieldAria` сознательно цепляется к чужому атрибуту `[formField]`, чтобы дополнить директиву форм (глава 13). Здесь линтер не знает замысла — отключаем правило для одной строки и пишем почему.
- **Доступность звёзд.** У `<span>` звезды есть `(click)`, но нет клавиатуры и фокуса. Правило не видит, что клавиатура у рейтинга есть — на хосте: `role="slider"`, `tabindex`, стрелки (глава 5). Звёзды — только для мыши. Тоже отключаем для строки, с объяснением.

::: task
Исправьте замечания линтера в редакторе:

1. В `app.ts` и `core/cart-store.ts` вместо пустого `.catch(() => {})` пишите ошибку в консоль: `console.warn('Аналитика недоступна:', error)`.
2. В `core/auth-store.ts` (выход) вместо `error: () => {}` — `console.warn('Выход: сервер не ответил', error)`.
3. В `layout/quick-search/quick-search.ts` уберите неиспользуемый импорт `Game`.
4. В `shared/field-aria.ts` над `selector` отключите правило для строки:
   `// eslint-disable-next-line @angular-eslint/directive-selector -- селектор чужой директивы FormField: дополняем её`.
5. В `shared/rating/rating.html` над `<span>` добавьте объяснение и отключение двух правил:
   `<!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->`.
:::

## Что получилось

В превью всё работает как раньше: правки не меняют поведения, только честнее обходятся с ошибками. В проекте CLI:

```bash
ng lint
```

```text
Linting "hod-konem"...

All files pass linting.
```

Комментарий `eslint-disable-next-line` действует ровно на одну следующую строку и одно (или перечисленные) правило. Текст после `--` — пояснение для читателя, ESLint его пропускает. Отключать правила на весь файл или проект ради одного места не стоит: в следующий раз правило поймает настоящую ошибку.

::: tip
Линтер и компилятор дополняют друг друга. Компилятор отвечает на вопрос «корректен ли код», линтер — «так ли его стоит писать». Многие команды запускают `ng lint` и `ng build` вместе перед каждым коммитом и в CI.
:::

## `ng update`

```bash
ng update
```

```text
Using package manager: npm
Collecting installed dependencies...
Found 31 dependencies.
We analyzed your package.json and everything seems to be in order. Good work!
```

Без аргументов `ng update` только проверяет, есть ли обновления для пакетов, которые умеют обновляться через него (Angular, CLI, библиотеки со своими схемами). Когда выйдет Angular 23, команда предложит `ng update @angular/core @angular/cli`. Обновление — больше, чем `npm install`: пакет может принести **схемы миграции**, которые `ng update` выполнит сам и поправит ваш код под новую версию. Обновляют обычно по одной основной версии за раз: с 22 на 23, потом на 24.

Есть и миграции, которые запускают по желанию, когда команда готова переписать код. В `@angular/core` 22 их полтора десятка, например:

```bash
ng generate @angular/core:control-flow-migration   # *ngIf, *ngFor → @if, @for
ng generate @angular/core:signal-input-migration   # @Input() → input()
ng generate @angular/core:inject-migration         # DI в конструкторе → inject()
```

Так старые проекты переходят на то, чему учит курс.

::: deep Под капотом: схема — это виртуальное дерево файлов
Схема не пишет на диск напрямую. Она получает **дерево** (`Tree`) — виртуальную копию проекта — и меняет его: создаёт файлы по шаблонам, правит `angular.json`, вставляет импорты в код (через разбор TypeScript, а не поиском строк). CLI применяет изменения к диску, только если вся схема отработала без ошибок. Поэтому `--dry-run` безопасен: он печатает изменения дерева и ничего не применяет.
:::
