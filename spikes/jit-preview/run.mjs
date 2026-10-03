// Открывает index.html в headless Chrome, кликает и печатает текст страницы.
// Нужен запущенный `npm run serve` и Chrome (CHROME_PATH, по умолчанию путь macOS).
import puppeteer from 'puppeteer-core';

const page_ = process.argv[2] ?? 'index.html';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('response', (r) => r.status() >= 400 && !r.url().endsWith('favicon.ico') && console.log('[http]', r.status(), r.url()));

const t0 = Date.now();
await page.goto(`http://localhost:8765/${page_}`);
if (page_ !== 'index.html') {
  await new Promise((r) => setTimeout(r, 4000));
} else {
  await page.waitForSelector('h1', { timeout: 10000 });
  console.log('render ms', Date.now() - t0);
  const dump = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('before:', await dump());
  await page.click('#inc');
  await page.click('#inc');
  await page.click('app-todo-item li');
  await page.type('#name', 'Ann');
  await new Promise((r) => setTimeout(r, 200));
  console.log('after: ', await dump());
}
await browser.close();
