# Формат уроков

Формат взят из курса PixiJS (`../pixi-js/docs/lesson-format.md`) с дополнениями для Angular: файлы `.html` и `.css`, учебный бэкенд, начальный адрес в превью, тесты.

## Структура на диске

```
content/
  course.json                     — порядок глав
  01-first-app/
    chapter.json                  — название, описание, часть
    01-what-is-angular/
      lesson.md
      start/
        main.ts
        app.ts
        app.html
        app.css
      solution/
        …
    02-first-component/
      lesson.md
      start/…
      solution/…
      check.ts                    — необязательно
  02-templates/
    …
```

Правила именования:

- Папки глав и шагов: `NN-slug`, где `slug` — латиница в kebab-case. Номер задаёт порядок, slug идёт в URL (`/templates/property-binding`).
- Точка входа всегда `main.ts`. Импорты между файлами — **без расширения**: `import { GameCard } from './game-card'`.
- Файлы могут лежать в подпапках (`core/cart.ts`, `catalog/catalog.html`) — так же, как в проекте Angular CLI. В редакторе вкладка показывает путь.
- Имена файлов — по стилю Angular CLI 22 (`fileNameStyleGuide: 2025`, проверено по `@schematics/angular@22.2.1`): компонент `game-card.ts` + `game-card.html` + `game-card.css`, сервис `cart-store.ts`, без суффиксов `.component`/`.service`. Корень шага соответствует `src/app/` проекта CLI плюс `main.ts` и `styles.css` (в CLI они лежат в `src/`).
- `styles.css` в корне шага — **глобальные стили** (в превью вставляются `<style>` до запуска, как `styles` в `angular.json`). Стили компонентов — через `styleUrl`.
- Вкладки идут в порядке `files` из frontmatter, иначе: `main.ts`, затем по алфавиту; `.ts`, `.html`, `.css` одного компонента — рядом.

## `course.json`

```json
{
  "title": "Angular",
  "angularVersion": "22.2.1",
  "chapters": ["01-first-app", "02-templates"]
}
```

Служебные главы (песочница для проверок платформы) перечисляются в `"devChapters"`: они видны только в режиме разработки, в оглавлении — в разделе «Для разработки», вне «Назад / Далее» и не попадают в продакшен-сборку. Чтобы файлы служебной главы не попали в бандл, её путь исключён в `import.meta.glob` в `src/content/course.ts` (сейчас там явно указан `00-sandbox`; новую служебную главу нужно добавить туда же).

## `chapter.json`

```json
{
  "title": "Шаблоны и привязки",
  "description": "Связываем данные класса с разметкой и обрабатываем действия пользователя.",
  "part": 1
}
```

## `lesson.md`

### Frontmatter

```yaml
---
title: Привязка свойств
files: [main.ts, app.ts, app.html]   # видимые вкладки и их порядок (необязательно)
readonly: [main.ts]                  # видны, но не редактируются
focus: app.html                      # какая вкладка открыта при входе
startFrom: previous                  # previous (по умолчанию) | custom
api: ['[property]', 'DOM-свойство']  # что вводит шаг — для оглавления и поиска
noSolution: true                     # шаг без задания (теория, демо): папки solution/ нет
brokenStart: true                    # старт намеренно с ошибками (шаг про отладку): start/ — в exclude tsconfig.content.json
url: /catalog?category=family        # начальный адрес приложения в превью (по умолчанию /)
backend: { latency: 800, failRate: 0 }   # учебный бэкенд: задержка (по умолчанию 300 мс) и доля ответов 500
preview: app                         # app (по умолчанию) | tests — что показывает превью (план, этап 4)
---
```

YAML: элементы с фигурными или квадратными скобками, `@`, `:` — в кавычках: `api: ['@if', 'input.required()']` (ловушка из курса PixiJS).

`startFrom: previous` — `start/` совпадает с `solution/` предыдущего шага (проверяет валидатор). `custom` — в начале главы или когда между шагами есть «закадровая» подготовка (новый файл с заготовкой, вынесенный код). Такая подготовка обязательно описывается в тексте шага.

### Тело

Markdown и контейнеры (как в курсе PixiJS) плюс один новый:

```md
::: tip
Короткий совет.
:::

::: warning
Частая ошибка или ловушка.
:::

::: deep Под капотом: как работает track
Необязательный подробный блок. По умолчанию свёрнут.
:::

::: legacy Вы встретите в старом коде: *ngFor
Как то же самое писали раньше. По умолчанию свёрнут. Только для чтения, не для повторения.
:::

::: task
Что ученик должен сделать в редакторе в этом шаге.
:::

::: hint Подсказка 1: где хранить выбранную категорию
Сворачиваемая подсказка к практикуму. Подсказки идут от общей к конкретной.
:::
```

Блоки кода с указанием файла и выделением строк:

````md
```ts app.ts {4}
export class App {
  protected readonly title = 'Ход конём';
  protected readonly price = 1290;
  protected readonly cover = '/assets/covers/treasure-island.svg';
}
```

```html app.html {1}
<img [src]="cover" alt="Обложка" />
```
````

Для шаблонов — язык `html` (подсветка Angular-синтаксиса — `angular-html` в Shiki, проверить при переносе платформы).

Ссылки на API ведут на официальную документацию: `[signal](https://angular.dev/api/core/signal)`. Ссылку проверяем перед публикацией.

Внутренние ссылки на другие шаги: `[шаг про сигналы](step:03-signals/02-signal)`.

## `start/` и `solution/`

- Полные снимки всех файлов шага, без диффов.
- `start/` — с чего ученик начинает. Места, которые нужно дописать, отмечаются комментарием `// TODO: …` (в `.ts`) или `<!-- TODO: … -->` (в `.html`) на русском.
- `solution/` — эталон. Должен запускаться без ошибок, без предупреждений TypeScript и без ошибок шаблонов (`strictTemplates`, когда проверка появится — этап 5).
- Файлы, которые не меняются в шаге, всё равно лежат в обеих папках.

## `check.ts` (необязательно, план — этап 3)

```ts
import type { CheckContext, CheckResult } from '@course/check';

export default async function check({ document, navigate, backend }: CheckContext): Promise<CheckResult> {
  await navigate('/cart');
  const total = document.querySelector('[data-test=total]')?.textContent;
  if (!total?.includes('2 580')) return { pass: false, hint: 'Итог не пересчитался: сумма должна зависеть от количества' };
  return { pass: true };
}
```

- Проверяем **результат** (DOM, URL, запросы к бэкенду), а не текст кода.
- Атрибуты `data-test` в коде уроков допустимы, когда без них проверка хрупкая; в тексте объясняем, зачем они.
- Каждый `pass: false` содержит `hint` на русском: что не так и куда смотреть, без готового ответа.

## Тесты в шаге (глава 16)

Файлы `*.spec.ts` в шаге запускаются во вкладке «Тесты», если `preview: tests`. Синтаксис — совместимый с Vitest (`describe`, `it`, `expect`, `beforeEach`, `vi.fn`), чтобы тесты переносились в проект Angular CLI без изменений (глава 20).

## Ресурсы

- Картинки — `public/assets/`, в коде — абсолютный путь `/assets/covers/<slug>.svg`.
- Данные бэкенда — `public/backend/data/*.json`, обработчики — `public/backend/backend.js`. Шаг не меняет данные бэкенда: если главе нужен другой набор, это отдельный файл и настройка в `chapter.json` (решить при необходимости).
- Происхождение каждого файла — в `public/assets/CREDITS.md`.
