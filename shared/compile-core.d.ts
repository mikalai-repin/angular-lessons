// Типы для shared/compile-core.js (модуль на чистом JS: его импортируют и Node-скрипты)
export declare const GLOBAL_STYLES: string;

export declare function resolvePath(fromFile: string, specifier: string): string;

export declare function inlineResources(
  ts: unknown,
  file: string,
  code: string,
  files: Record<string, string>,
): { code: string; errors: string[] };

export interface CompiledStep {
  /** Скомпилированные модули: 'app.js', 'core/cart.js' */
  files: Record<string, string>;
  /** Глобальные стили (styles.css шага) */
  styles: string[];
  /** Ошибки сборки: не найден файл шаблона, синтаксис */
  errors: string[];
}

export declare function compileFiles(
  ts: unknown,
  angularJitApplicationTransform: unknown,
  files: Record<string, string>,
): CompiledStep;
