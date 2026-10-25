// Приложение проекта Angular CLI в Chrome (глава 20): ng serve, собранный dist/ или сервер SSR.
// node tools/e2e/cli-browse.mjs <адрес> [сценарий.mjs] [--js-off] [--width=500] [--height=600]
//
// Печатает консоль страницы, запросы (кроме файлов сборки — только /api/…, документы и чанки по флагу),
// итоговый адрес и текст страницы, сохраняет скриншот в tools/e2e/out/cli-browse.png.
// Сценарий — как у exp.mjs: export default async ({ page, pageText, wait, log }) => { … }.
// --js-off — страница без JavaScript: то, что прислал сервер (SSR, пререндеринг).
// --all-requests — печатать все запросы, включая .js/.css.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT, launch, wait } from './lib.mjs';

const args = process.argv.slice(2);
const [url, scenarioPath] = args.filter((a) => !a.startsWith('--'));
const option = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
if (!url) {
  console.error('Использование: node tools/e2e/cli-browse.mjs <адрес> [сценарий.mjs] [--js-off] [--all-requests]');
  process.exit(1);
}

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: Number(option('width', 500)), height: Number(option('height', 600)) });
if (args.includes('--js-off')) await page.setJavaScriptEnabled(false);

const started = Date.now();
const time = () => `${String(Date.now() - started).padStart(5)} мс`;
const log = (...parts) => console.log(time(), ...parts);
page.on('console', (message) => log(`[${message.type()}]`, message.text()));
page.on('pageerror', (error) => log('[pageerror]', error.message));
const allRequests = args.includes('--all-requests');
page.on('requestfinished', (request) => {
  const path = new URL(request.url()).pathname;
  const asset = /\.(js|css|svg|ico|png|woff2?)$/.test(path) || path.startsWith('/@');
  if (allRequests || !asset)
    log(`[net] ${request.method()} ${path}${new URL(request.url()).search} → ${request.response()?.status()}`);
});
page.on('requestfailed', (request) =>
  log(`[net] ${request.method()} ${request.url()} → ${request.failure()?.errorText}`),
);

await page.goto(url, { waitUntil: 'networkidle0' });
const pageText = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
if (scenarioPath) {
  const scenario = (await import(pathToFileURL(resolve(scenarioPath)).href)).default;
  await scenario({ page, pageText, wait, log });
} else {
  await wait(1000);
}
console.log(`\nАдрес: ${page.url()}`);
console.log(`Текст: ${(await pageText()).slice(0, 1500)}`);
await page.screenshot({ path: resolve(OUT, 'cli-browse.png') });
await browser.close();
