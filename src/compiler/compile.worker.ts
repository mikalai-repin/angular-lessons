// Веб-воркер компиляции кода ученика: TypeScript 6 + JIT-трансформ Angular (см. shared/compile-core.js) и проверка
// шаблонов компилятором AOT (shared/template-check.js). Сам компилятор (~5 МБ) лежит в public/vendor/ts-angular.mjs,
// типы для проверки шаблонов — в public/vendor/template-types.json (собирает scripts/copy-vendor.mjs);
// они загружаются при первом запросе.
import { compileFiles } from '../../shared/compile-core.js';
import { createTemplateChecker } from '../../shared/template-check.js';

interface CompilerModule {
  ts: unknown;
  angularJitApplicationTransform: unknown;
  NgtscProgram: unknown;
  setFileSystem: unknown;
}

type Request =
  | { id: number; kind: 'compile'; files: Record<string, string>; tests?: boolean }
  | { id: number; kind: 'check-templates'; files: Record<string, string> };

const COMPILER_URL = '/vendor/ts-angular.mjs';
const TEMPLATE_TYPES_URL = '/vendor/template-types.json';
// import() через Function: иначе Vite в dev-режиме дописывает к адресу «?import», и файл из public/ не грузится
const importModule = new Function('url', 'return import(url)') as (url: string) => Promise<unknown>;
let compiler: Promise<CompilerModule> | undefined;
let templateChecker: Promise<ReturnType<typeof createTemplateChecker>> | undefined;

const loadCompiler = () =>
  (compiler ??= importModule(new URL(COMPILER_URL, self.location.origin).href) as Promise<CompilerModule>);

self.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    if (request.kind === 'compile') {
      const { ts, angularJitApplicationTransform } = await loadCompiler();
      const result = compileFiles(ts, angularJitApplicationTransform, request.files, { tests: request.tests });
      self.postMessage({ id: request.id, result });
    } else {
      templateChecker ??= Promise.all([
        loadCompiler(),
        fetch(TEMPLATE_TYPES_URL).then((response) => response.json() as Promise<Record<string, string>>),
      ]).then(([module, types]) => createTemplateChecker(module.ts, module, types));
      const result = (await templateChecker)(request.files);
      self.postMessage({ id: request.id, result });
    }
  } catch (error) {
    self.postMessage({ id: request.id, error: String((error as Error)?.stack ?? error) });
  }
};
