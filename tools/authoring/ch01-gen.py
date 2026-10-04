# Генератор кода шагов главы 1: общие куски — константы, шаги — их комбинации.
# Запуск: python3 tools/authoring/ch01-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 1.
# Шаг 01 копирует демо-магазин из песочницы (content/00-sandbox/02-search/solution).
# После запуска: npm run validate, проверка Prettier (см. docs/authoring-process.md).
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, shutil

ROOT = '/Users/mr/Desktop/Experimental/angular-learn/content/01-first-app'
SANDBOX = '/Users/mr/Desktop/Experimental/angular-learn/content/00-sandbox/02-search/solution'

MAIN_BASIC = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';

bootstrapApplication(App).catch((err) => console.error(err));
"""

MAIN_THEN = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';

bootstrapApplication(App)
  .then((appRef) => console.log('Магазин запущен. Корневых компонентов:', appRef.components.length))
  .catch((err) => console.error(err));
"""

MAIN_CONFIG = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';

bootstrapApplication(App, appConfig)
  .then((appRef) => console.log('Магазин запущен. Корневых компонентов:', appRef.components.length))
  .catch((err) => console.error(err));
"""

MAIN_CONFIG_BUG = MAIN_CONFIG.replace('appRef.components.length', 'appRef.component.length')

APP_NO_DECORATOR = """import { Component } from '@angular/core';

// TODO: превратите класс в компонент: селектор app-root, шаблон — заголовок «Ход конём»
// и абзац «Магазин настольных игр»
export class App {}
"""

APP_INLINE = """import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <h1>Ход конём</h1>
    <p>Магазин настольных игр</p>
  `,
})
export class App {}
"""

APP_INLINE_TODO = APP_INLINE.replace("@Component({", "// TODO: замените template на templateUrl: './app.html' и подключите стили styleUrl: './app.css'\n@Component({")

APP_FILES = """import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
"""

APP_FILES_BUG = APP_FILES.replace("styleUrl: './app.css'", "styleUrl: './app.scss'")

APP_HTML_TODO = """<!-- TODO: перенесите сюда шаблон компонента — шапку и основную часть страницы -->
"""

APP_HTML = """<header class="header">
  <span class="logo">♞ Ход конём</span>
</header>
<main class="page">
  <h1>Магазин настольных игр</h1>
  <p class="muted">Скоро здесь появится каталог.</p>
</main>
"""

APP_HTML_BUG = APP_HTML.replace('<h1>Магазин настольных игр</h1>', '<h1>Магазин настольных игр</h2>')

APP_CSS = """/* Стили компонента App: действуют только внутри его шаблона */
.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--brand);
  color: #fff;
}

.logo {
  font-size: 20px;
  font-weight: 700;
}

.page {
  padding: 16px;
}

h1 {
  color: var(--brand);
}
"""

STYLES_CSS = """/* Глобальные стили магазина: действуют на всю страницу (как styles.css в проекте Angular CLI) */
:root {
  --brand: #c3002f;
  --text: #1d1d1f;
  --muted: #6e6e73;
  --surface: #f5f5f7;
  --radius: 10px;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--text);
  background: #fff;
}

h1 {
  margin: 0 0 12px;
  font-size: 22px;
}

.muted {
  color: var(--muted);
}

.button {
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  background: var(--brand);
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.button:disabled {
  background: #bbb;
  cursor: default;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
"""

CONFIG_TODO = """import { ApplicationConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  // TODO: добавьте провайдер provideBrowserGlobalErrorListeners()
  providers: [],
};
"""

CONFIG = """import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};
"""

def files_after_04():
    return {'main.ts': MAIN_THEN, 'app.ts': APP_FILES, 'app.html': APP_HTML, 'app.css': APP_CSS, 'styles.css': STYLES_CSS}

def files_final():
    return {'main.ts': MAIN_CONFIG, 'app.ts': APP_FILES, 'app.html': APP_HTML, 'app.css': APP_CSS,
            'app.config.ts': CONFIG, 'styles.css': STYLES_CSS}

steps = {
    '01-what-is-angular': {'start': 'SANDBOX'},
    '02-first-component': {
        'start': {'main.ts': MAIN_BASIC, 'app.ts': APP_NO_DECORATOR},
        'solution': {'main.ts': MAIN_BASIC, 'app.ts': APP_INLINE},
    },
    '03-bootstrap': {
        'start': {'main.ts': MAIN_BASIC, 'app.ts': APP_INLINE},
        'solution': {'main.ts': MAIN_THEN, 'app.ts': APP_INLINE},
    },
    '04-template-files': {
        'start': {'main.ts': MAIN_THEN, 'app.ts': APP_INLINE_TODO, 'app.html': APP_HTML_TODO, 'app.css': APP_CSS, 'styles.css': STYLES_CSS},
        'solution': files_after_04(),
    },
    '05-app-config': {
        'start': {**files_after_04(), 'app.config.ts': CONFIG_TODO},
        'solution': files_final(),
    },
    '06-debugging': {
        'start': {**files_final(), 'main.ts': MAIN_CONFIG_BUG, 'app.ts': APP_FILES_BUG, 'app.html': APP_HTML_BUG},
        'solution': files_final(),
    },
    '07-compiler': {'start': files_final()},
}

for step, spec in steps.items():
    base = os.path.join(ROOT, step)
    for kind in ('start', 'solution'):
        path = os.path.join(base, kind)
        if os.path.isdir(path):
            shutil.rmtree(path)
        if kind not in spec:
            continue
        if spec[kind] == 'SANDBOX':
            shutil.copytree(SANDBOX, path)
            continue
        os.makedirs(path)
        for name, code in spec[kind].items():
            with open(os.path.join(path, name), 'w') as f:
                f.write(code)
print('ok')
