// Тесты шага (*.spec.ts) в чистом превью: отчёт как у Vitest, консоль и ошибки.
// node tools/e2e/run-tests.mjs <папка шага> [--with <папка с файлами поверх шага>] [ждатьМс=20000]
// Образец: node tools/e2e/run-tests.mjs content/15-performance/08-practice/solution --with tools/e2e/fixtures/test-runner
import { resolve } from 'node:path';
import { collect, compileMap, launch, openPreview, readDir, readFolder, ROOT, wait } from './lib.mjs';

const args = process.argv.slice(2);
const withIndex = args.indexOf('--with');
const overlay = withIndex === -1 ? null : args.splice(withIndex, 2)[1];
const [dir, waitMs = '20000'] = args;
if (!dir) {
  console.error('Использование: node tools/e2e/run-tests.mjs <папка шага> [ждатьМс]');
  process.exit(1);
}
const browser = await launch();
const { page, logs, network } = await openPreview(
  browser,
  compileMap(
    { ...readDir(resolve(ROOT, dir)), ...(overlay ? readFolder(resolve(ROOT, overlay)) : {}) },
    { tests: true },
  ),
  {
    mode: 'tests',
    waitMs: 500,
  },
);
const deadline = Date.now() + Number(waitMs);
while (Date.now() < deadline && !(await page.evaluate(() => window.__tests.some((e) => e.type === 'done'))))
  await wait(100);
const events = await page.evaluate(() => window.__tests);
await collect(page, logs, network);
await browser.close();

const results = new Map(events.filter((e) => e.type === 'result').map((e) => [e.id, e]));
const icon = { pass: '✓', fail: '✗', skip: '↓', todo: '…' };
const counts = { pass: 0, fail: 0, skip: 0, todo: 0 };
function print(node, depth) {
  const pad = '  '.repeat(depth);
  if (node.type === 'test') {
    const r = results.get(node.id);
    const state = r?.state ?? 'нет результата';
    counts[state] = (counts[state] ?? 0) + 1;
    console.log(`${pad}${icon[state] ?? '?'} ${node.name}${r?.duration !== undefined ? ` (${r.duration} мс)` : ''}`);
    for (const e of r?.errors ?? []) {
      console.log(`${pad}    ${e.name}: ${e.message}`.replace(/\n/g, `\n${pad}    `));
      if (e.diff) console.log(`${pad}    ${e.diff.replace(/\n/g, `\n${pad}    `)}`);
      if (e.stack) console.log(`${pad}    ${e.stack.replace(/\n/g, `\n${pad}    `)}`);
    }
    return;
  }
  console.log(`${pad}${node.name}`);
  for (const r of results.get(node.id)?.errors ?? []) console.log(`${pad}  ✗ ${r.message}`);
  for (const child of node.children) print(child, depth + 1);
}
for (const file of events.find((e) => e.type === 'collected')?.files ?? []) {
  print(file, 0);
  if (file.error) console.log(`  ✗ не загрузился: ${file.error.message}\n  ${file.error.stack}`);
}
const done = events.find((e) => e.type === 'done');
console.log(
  `\nТесты: ${counts.pass} прошли, ${counts.fail} упали, ${counts.skip} пропущены, ${counts.todo} todo · ${done?.duration ?? '?'} мс`,
);
for (const u of done?.unhandled ?? [])
  console.log(`${u.kind}: ${u.message} (файл ${u.file || '—'}, после теста «${u.test || '—'}»)`);
if (!done) console.log('Прогон не закончился');
console.log(logs.filter((l) => !l.startsWith('[network]')).join('\n'));
process.exit(counts.fail || !done || done.unhandled?.length ? 1 : 0);
