import type { CompiledStep } from '../../shared/compile-core.js';
import type { TemplateDiagnostic } from '../../shared/template-check.js';
import type { FileMap } from '../content/course';
import CompileWorker from './compile.worker.ts?worker';

export type { CompiledStep, TemplateDiagnostic };

let worker: Worker | undefined;
let nextId = 1;
const pending = new Map<number, { resolve: (result: never) => void; reject: (error: Error) => void }>();

function getWorker() {
  if (worker) return worker;
  worker = new CompileWorker();
  worker.onmessage = (event: MessageEvent<{ id: number; result?: never; error?: string }>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    if (event.data.result) request.resolve(event.data.result);
    else request.reject(new Error(event.data.error));
  };
  return worker;
}

function send<T>(message: object): Promise<T> {
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, ...message });
  });
}

/** Компилирует файлы шага (.ts, .html, .css) в модули для превью; tests — вместе с файлами тестов *.spec.ts */
export function compileStep(files: FileMap, { tests = false } = {}): Promise<CompiledStep> {
  return send({ kind: 'compile', files, tests });
}

/** Проверка шаблонов компилятором AOT (как `ng build`): только диагностика Angular, без обычных ошибок TypeScript */
export function checkTemplates(files: FileMap): Promise<TemplateDiagnostic[]> {
  return send({ kind: 'check-templates', files });
}
