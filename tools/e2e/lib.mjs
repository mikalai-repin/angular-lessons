// Общие помощники браузерных проверок курса.
// Нужен запущенный dev-сервер (npm run dev) и установленный Chrome.
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { angularJitApplicationTransform } from '@angular/compiler-cli';
import puppeteer from 'puppeteer-core';
import { compileFiles } from '../../shared/compile-core.js';
import { readStepDir } from '../../scripts/step-files.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const CONTENT = resolve(ROOT, 'content');
export const OUT = resolve(ROOT, 'tools/e2e/out');
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5180';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SOURCE = 'angular-course-preview';

mkdirSync(OUT, { recursive: true });

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function launch() {
  return puppeteer.launch({ executablePath: CHROME, headless: true });
}

/**
 * Полный код шага (с подпапками): 'core/cart-store.ts' → текст.
 * Путь …/<шаг>/start у шага со startFrom: previous (папки нет) даёт решение предыдущего шага
 */
export { readStepDir as readDir };

/** Все файлы обычной папки (не шага): { 'core/x.spec.ts': '…' } — например, фикстуры поверх кода шага */
export function readFolder(dir) {
  const files = {};
  const walk = (sub) => {
    for (const entry of readdirSync(join(dir, sub), { withFileTypes: true })) {
      const rel = sub ? `${sub}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(rel);
      else files[rel] = readFileSync(join(dir, rel), 'utf8');
    }
  };
  walk('');
  return files;
}

/** Компилирует папку шага (start/ или solution/) тем же кодом, что и воркер платформы */
export function compileDir(dir, options) {
  return compileMap(readStepDir(dir), options);
}

/** Компилирует набор файлов из памяти ({ 'main.ts': '…', 'app.ts': '…' }) — для экспериментов */
export function compileMap(files, options) {
  return compileFiles(ts, angularJitApplicationTransform, files, options);
}

/**
 * Открывает чистую среду превью (без интерфейса платформы) размером 500 × 600 — как превью по умолчанию —
 * и запускает в ней скомпилированный шаг. Возвращает страницу, логи консоли и запросы к учебному бэкенду.
 */
export async function openPreview(
  browser,
  compiled,
  { waitMs = 2000, width = 500, height = 600, url = '/', backend = { latency: 0 }, mode = 'app' } = {},
) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  const logs = compiled.errors.map((e) => `[build-error] ${e}`);
  const network = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(`${BASE_URL}/preview.html`, { waitUntil: 'networkidle0' });
  // В чистом превью «родитель» — само окно: сообщения среды превью приходят сюда же.
  // Ошибки и запросы копим в массивах: через console нельзя — перехваченный console.error сам шлёт сообщение
  await page.evaluate((source) => {
    window.__runtimeErrors = [];
    window.__network = [];
    window.__url = '/';
    window.__tests = [];
    window.addEventListener('message', (e) => {
      if (e.data?.source !== source) return;
      if (e.data.type === 'error') window.__runtimeErrors.push(e.data.text);
      if (e.data.type === 'network' && e.data.entry.status !== 'pending') window.__network.push(e.data.entry);
      if (e.data.type === 'url') window.__url = e.data.url;
      if (e.data.type === 'tests') window.__tests.push(e.data.event);
    });
  }, SOURCE);
  await page.evaluate((run) => window.postMessage({ type: 'run', entry: 'main.js', ...run }, '*'), {
    files: compiled.files,
    styles: compiled.styles,
    url,
    backend,
    mode,
  });
  await wait(waitMs);
  await collect(page, logs, network);
  return { page, logs, network };
}

/** Забирает накопленные ошибки среды и запросы бэкенда в массивы logs и network */
export async function collect(page, logs, network) {
  for (const text of await page.evaluate(() => window.__runtimeErrors.splice(0))) logs.push(`[runtime-error] ${text}`);
  for (const entry of await page.evaluate(() => window.__network.splice(0))) {
    network.push(entry);
    logs.push(`[network] ${entry.method} ${entry.url} → ${entry.status} (${entry.ms} мс)`);
  }
}

/** Текст страницы превью одной строкой — для проверки результата */
export const pageText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());

/** Текущий адрес приложения в превью (как в адресной строке) */
export const appUrl = (page) => page.evaluate(() => window.__url);

/** Переход по адресу внутри приложения — как ввод в адресную строку превью */
export async function navigate(page, url, waitMs = 500) {
  await page.evaluate((url) => window.postMessage({ type: 'navigate', url }, '*'), url);
  await wait(waitMs);
}

/** Ключ сохранённого прогресса платформы (src/progress/storage.ts) */
export const PROGRESS_KEY = 'angular-course:v1';

/** Строки консоли превью, которые считаются ошибкой */
const CONSOLE_ERRORS = /ERROR|NG0\d+|Error:|Cannot find|TS\d+/;

/** Текст без неразрывных пробелов и лишних переводов строк: «1 990 ₽» пайпы пишут через U+00A0 и U+202F */
export const clean = (s) => s.replace(/ | /g, ' ').replace(/\s+/g, ' ').trim();

/** Счётчик проверок: expect печатает ✓/✗, report — итог и код выхода процесса */
export function createChecks() {
  const failures = [];
  return {
    expect(ok, message) {
      console.log(`${ok ? '✓' : '✗'} ${message}`);
      if (!ok) failures.push(message);
    },
    report() {
      console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
      process.exit(failures.length ? 1 : 0);
    },
  };
}

/**
 * Открывает интерфейс платформы (1600 × 900) на шаге startPath ('/signals/problem') с чистым прогрессом
 * и возвращает помощники проверки главы. Диалоги по умолчанию принимаются («Решение» спрашивает подтверждение);
 * ignoreConsole(line) — строки консоли, которые не считаются ошибкой
 */
export async function openCourse(startPath, { onDialog = (d) => d.accept(), ignoreConsole = () => false } = {}) {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  page.on('dialog', onDialog);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}${startPath}`, { waitUntil: 'networkidle0' });
  await wait(3000);

  const { expect, report } = createChecks();
  // После перезапуска старый iframe может ещё числиться в списке — берём последний
  const frame = () =>
    page
      .frames()
      .filter((f) => f.url().includes('/app'))
      .at(-1);
  const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent ?? '').join('\n'));

  return {
    browser,
    page,
    expect,
    frame,
    consoleText,
    /** Заголовок открытого шага */
    title: () => page.$eval('.lesson-title-row h1', (e) => e.textContent),
    /** Число элементов в приложении */
    count: (selector) => frame().$$eval(selector, (els) => els.length),

    /** Кнопка «Решение», если она есть у шага */
    async showSolution() {
      const button = await page.$('.lesson-footer-middle .button');
      if (button && (await button.evaluate((e) => e.textContent)) === 'Решение') {
        await button.click();
        await wait(3500);
      }
    },

    /** Кнопка «Далее» */
    async nextStep() {
      await page.click('.lesson-footer .button.primary');
      await wait(3500);
    },

    async checkConsoleClean(step) {
      const lines = (await consoleText()).split('\n').filter((line) => !ignoreConsole(line));
      // Строки с ошибками — в вывод проверки: так сразу видно, что именно не так
      const errors = lines.filter((line) => CONSOLE_ERRORS.test(line));
      if (errors.length) console.log(errors.join('\n'));
      expect(!CONSOLE_ERRORS.test(lines.join('\n')), `${step}: консоль без ошибок`);
    },

    /** Эксперимент: код подкладывается в сохранённый прогресс шага, как его сохранил бы редактор */
    async runWithCode(stepKey, files, waitMs = 4000) {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
      await page.evaluate(
        (storageKey, key, code) => localStorage.setItem(storageKey, JSON.stringify({ steps: { [key]: { code } } })),
        PROGRESS_KEY,
        stepKey,
        files,
      );
      await page.goto(`${BASE_URL}/${stepKey}`, { waitUntil: 'networkidle0' });
      await wait(waitMs);
      return consoleText();
    },

    /** Итог: ошибки страницы, закрытие браузера, код выхода */
    async finish() {
      expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
      await browser.close();
      report();
    },
  };
}
