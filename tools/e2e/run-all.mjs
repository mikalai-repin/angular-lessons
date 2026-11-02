// Полный прогон всех проверок курса по очереди: типы и формат, validate, проверки платформы,
// run-chapter и chNN-* каждой главы, step-checks. Лог каждой проверки — в tools/e2e/out/run-all/,
// в конце сводка: что упало, сколько шло, и шаги run-chapter с ошибками в консоли превью (к просмотру —
// многие шаги показывают ошибки нарочно, поэтому они не считаются провалом).
// node tools/e2e/run-all.mjs [часть имени…]   — например `run-all.mjs ch14 platform` (нужен npm run dev)
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT, OUT, ROOT } from './lib.mjs';

const LOGS = join(OUT, 'run-all');
mkdirSync(LOGS, { recursive: true });

const course = JSON.parse(readFileSync(join(CONTENT, 'course.json'), 'utf8'));
const checks = readdirSync(join(ROOT, 'tools/e2e/checks')).filter((f) => /^ch\d+-.*\.mjs$/.test(f));

const tasks = [
  ['typecheck', 'npx', ['tsc']],
  ['prettier', 'npx', ['prettier', '--check', '.']],
  ['validate', 'node', ['scripts/validate-content.mjs']],
  ...['platform', 'preview', 'download', 'quiz', 'test-runner'].map((name) => [
    name,
    'node',
    [`tools/e2e/checks/${name}.mjs`],
  ]),
  ...course.chapters.flatMap((chapter) => {
    const number = chapter.slice(0, 2);
    return [
      [`run-chapter ${chapter}`, 'node', ['tools/e2e/run-chapter.mjs', chapter]],
      ...checks
        .filter((f) => f.startsWith(`ch${number}-`))
        .map((f) => [f.replace('.mjs', ''), 'node', [`tools/e2e/checks/${f}`]]),
    ];
  }),
  ['step-checks', 'node', ['tools/e2e/checks/step-checks.mjs']],
];

const filters = process.argv.slice(2);
const selected = filters.length ? tasks.filter(([name]) => filters.some((f) => name.includes(f))) : tasks;

function run([name, command, args]) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, { cwd: ROOT, env: process.env });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('close', (code) => {
      writeFileSync(join(LOGS, `${name.replace(/\s+/g, '_')}.log`), output);
      resolve({ name, code, output, seconds: Math.round((Date.now() - started) / 1000) });
    });
  });
}

/** Шаги из лога run-chapter, у которых в консоли превью есть строки ошибок */
function stepsWithErrors(output) {
  const steps = [];
  let step = null;
  for (const line of output.split('\n')) {
    if (line.startsWith('# ')) step = line.slice(2).split(' — ')[0];
    else if (step && line.startsWith('  error:') && steps.at(-1) !== step) steps.push(step);
  }
  return steps;
}

const results = [];
for (const task of selected) {
  process.stdout.write(`${task[0]} … `);
  const result = await run(task);
  results.push(result);
  console.log(`${result.code === 0 ? '✓' : '✗'} ${result.seconds} с`);
}

const failed = results.filter((r) => r.code !== 0);
const total = results.reduce((sum, r) => sum + r.seconds, 0);
console.log(`\nПроверок: ${results.length}, упало: ${failed.length}, время: ${Math.round(total / 60)} мин`);
for (const r of failed) {
  const lines = r.output.split('\n').filter((l) => l.startsWith('✗') || l.includes('!!') || /Ошиб/.test(l));
  console.log(`\n✗ ${r.name} (лог: tools/e2e/out/run-all/${r.name.replace(/\s+/g, '_')}.log)`);
  for (const line of (lines.length ? lines : r.output.trim().split('\n').slice(-5)).slice(0, 15))
    console.log('  ' + line.slice(0, 300));
}
const review = results
  .filter((r) => r.name.startsWith('run-chapter'))
  .map((r) => [r.name.replace('run-chapter ', ''), stepsWithErrors(r.output)])
  .filter(([, steps]) => steps.length);
if (review.length) {
  console.log('\nК просмотру — ошибки в консоли превью на «Решении» (бывают нарочно):');
  for (const [chapter, steps] of review) console.log(`  ${chapter}: ${steps.join(', ')}`);
}
process.exit(failed.length ? 1 : 0);
