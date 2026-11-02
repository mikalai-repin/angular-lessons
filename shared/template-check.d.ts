// Типы для shared/template-check.js (модуль на чистом JS: его можно запускать и в Node)
/** Замечание компилятора AOT к коду шага; позиции — с единицы */
export interface TemplateDiagnostic {
  /** Путь от корня шага: 'catalog/catalog.html' */
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  /** 'NG8001' или 'TS2339' (ошибка типов в шаблоне) */
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Проверка шаблонов (ngtsc) поверх файлов в памяти. ts и ngtsc — пакеты typescript и @angular/compiler-cli
 * (в браузере — из /vendor/ts-angular.mjs); libraries — .d.ts и package.json: путь от node_modules/ → текст
 */
export declare function createTemplateChecker(
  ts: unknown,
  ngtsc: { NgtscProgram: unknown; setFileSystem: unknown },
  libraries: Record<string, string>,
): (files: Record<string, string>) => TemplateDiagnostic[];
