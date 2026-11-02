// Типы библиотек для подсказок и проверки TypeScript в редакторе. Это несколько мегабайт .d.ts, поэтому
// src/editor/monaco.ts грузит модуль отдельным чанком: редактор и превью появляются, не дожидаясь его.
//
// TS-воркер Monaco (TypeScript 5.9) ищет модули по схеме node10 и не понимает поле `exports` в package.json.
// Поэтому кладём .d.ts пакетов по их настоящим путям, а для каждого подпути (`@angular/core/rxjs-interop`)
// добавляем файл-заглушку `<подпуть>/index.d.ts` с `export * from '<настоящий файл>'`.
import type * as Monaco from 'monaco-editor';

const angularTypes = import.meta.glob(
  [
    '../../node_modules/@angular/{core,common,compiler,platform-browser,forms,router}/types/*.d.ts',
    // NgRx (глава 18) — тот же список, что NGRX_PACKAGES в scripts/copy-vendor.mjs
    '../../node_modules/@ngrx/{signals,store,effects,operators,store-devtools}/types/*.d.ts',
  ],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
) as Record<string, string>;

const angularPackages = import.meta.glob(
  [
    '../../node_modules/@angular/{core,common,compiler,platform-browser,forms,router}/package.json',
    '../../node_modules/@ngrx/{signals,store,effects,operators,store-devtools}/package.json',
  ],
  { import: 'default', eager: true },
) as Record<string, { exports: Record<string, string | { types?: string }> }>;

const rxjsTypes = import.meta.glob('../../node_modules/rxjs/dist/types/**/*.d.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// zone.js (глава 19): `import 'zone.js'` и глобальный Zone
const zoneTypes = import.meta.glob('../../node_modules/zone.js/{zone.d.ts,lib/*.d.ts}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Данные локалей для пайпов (`import localeRu from '@angular/common/locales/ru'`) — те же, что копирует
// scripts/copy-vendor.mjs (LOCALES). Подпуть `./locales/*` в `exports` — шаблон, заглушки для него не строятся
const localeTypes = import.meta.glob('../../node_modules/@angular/common/locales/{ru,en}.d.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Signal Forms ссылаются на типы Standard Schema
import standardSchemaTypes from '../../node_modules/@standard-schema/spec/dist/index.d.ts?raw';
// Тесты (*.spec.ts): API Vitest — свои объявления модуля 'vitest' и глобальных describe/it/expect/vi
// поверх настоящих типов @vitest/expect и @vitest/spy (и того, на что они ссылаются)
import vitestTypes from '../../shared/vitest.d.ts?raw';

const vitestDependencyTypes = import.meta.glob(
  [
    '../../node_modules/@vitest/{expect,spy,pretty-format}/**/*.d.ts',
    '../../node_modules/@vitest/utils/{,dist/}*.d.ts',
    '../../node_modules/tinyrainbow/dist/*.d.ts',
    '../../node_modules/@types/chai/index.d.ts',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

/** Кладёт типы библиотек в TS-воркер Monaco */
export function addLibraryTypes(ts: typeof Monaco.typescript) {
  const NODE_MODULES = 'file:///node_modules/';
  const relativeToNodeModules = (path: string) => path.slice(path.indexOf('/node_modules/') + '/node_modules/'.length);

  for (const [path, source] of Object.entries(angularTypes)) {
    ts.typescriptDefaults.addExtraLib(source, NODE_MODULES + relativeToNodeModules(path));
  }
  for (const [path, pkg] of Object.entries(angularPackages)) {
    const name = relativeToNodeModules(path).replace(/\/package\.json$/, '');
    for (const [subpath, entry] of Object.entries(pkg.exports)) {
      const types = typeof entry === 'string' ? undefined : entry.types;
      if (!types || subpath.includes('*')) continue;
      const stubDir = `${name}${subpath.slice(1)}`;
      // Путь к .d.ts относительно заглушки: из '@angular/core/rxjs-interop/index.d.ts' в '@angular/core/types/…'
      const depth = subpath === '.' ? 0 : subpath.slice(2).split('/').length;
      const target = `${'../'.repeat(depth) || './'}${types.slice(2).replace(/\.d\.ts$/, '')}`;
      ts.typescriptDefaults.addExtraLib(`export * from '${target}';`, `${NODE_MODULES}${stubDir}/index.d.ts`);
    }
  }
  for (const [path, source] of Object.entries(localeTypes)) {
    ts.typescriptDefaults.addExtraLib(source, NODE_MODULES + relativeToNodeModules(path));
  }
  for (const [path, source] of Object.entries(zoneTypes)) {
    ts.typescriptDefaults.addExtraLib(source, NODE_MODULES + relativeToNodeModules(path));
  }
  ts.typescriptDefaults.addExtraLib(`import './zone';`, `${NODE_MODULES}zone.js/index.d.ts`);
  for (const [path, source] of Object.entries(rxjsTypes)) {
    ts.typescriptDefaults.addExtraLib(source, NODE_MODULES + relativeToNodeModules(path));
  }
  ts.typescriptDefaults.addExtraLib(`export * from './dist/types/index';`, `${NODE_MODULES}rxjs/index.d.ts`);
  ts.typescriptDefaults.addExtraLib(
    `export * from '../dist/types/operators/index';`,
    `${NODE_MODULES}rxjs/operators/index.d.ts`,
  );
  ts.typescriptDefaults.addExtraLib(standardSchemaTypes, `${NODE_MODULES}@standard-schema/spec/index.d.ts`);
  for (const [path, source] of Object.entries(vitestDependencyTypes)) {
    ts.typescriptDefaults.addExtraLib(source, NODE_MODULES + relativeToNodeModules(path));
  }
  // Корни пакетов: воркер ищет `<пакет>/index.d.ts` (поле exports он не читает)
  for (const pkg of ['@vitest/expect', '@vitest/spy', '@vitest/utils', '@vitest/pretty-format', 'tinyrainbow']) {
    ts.typescriptDefaults.addExtraLib(`export * from './dist/index';`, `${NODE_MODULES}${pkg}/index.d.ts`);
  }
  ts.typescriptDefaults.addExtraLib(vitestTypes, 'file:///course-types/vitest.d.ts');
}
