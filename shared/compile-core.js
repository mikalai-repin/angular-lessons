// Компиляция кода ученика для превью. Общий модуль для трёх мест:
//   - веб-воркер платформы (src/compiler/compile.worker.ts) — TypeScript и трансформ из /vendor/ts-angular.mjs;
//   - браузерные проверки (tools/e2e/lib.mjs) и валидатор (scripts/validate-content.mjs) — те же пакеты из node_modules.
// Поэтому здесь чистый JS без зависимостей: TypeScript и трансформ Angular передаются параметрами.
//
// Шаги:
//   1. В .ts-файлах `templateUrl` / `styleUrl` / `styleUrls` в @Component заменяются содержимым файлов
//      (`template: "…"`, `styles: ["…"]`). Замена делается в тексте по позициям из AST, а содержимое
//      записывается одной строкой JSON — поэтому номера строк не сдвигаются и source map остаётся верной.
//   2. TypeScript компилирует все .ts в JS с трансформом angularJitApplicationTransform: он превращает
//      input(), output(), model(), viewChild() и т. п. в метаданные, которые читает JIT-компилятор Angular.
//      Без трансформа сигнальные входы в JIT не работают.
//   3. Файл styles.css в корне шага — глобальные стили (как "styles" в angular.json).

/** Корень виртуальной файловой системы: файлы шага лежат в /, как в src/app настоящего проекта */
const ROOT = '/';

export const GLOBAL_STYLES = 'styles.css';

const COMPILER_OPTIONS = {
  // ts.ScriptTarget.ES2022 и ts.ModuleKind.ESNext — числа берём из переданного ts
  experimentalDecorators: true,
  // Angular CLI тоже компилирует поля классов «по-старому» (присваиванием в конструкторе)
  useDefineForClassFields: false,
  // Для emit типы не нужны: ошибки типов показывает редактор (Monaco) и `npm run validate`
  noResolve: true,
  noLib: true,
  isolatedModules: true,
  inlineSourceMap: true,
  inlineSources: true,
};

function dirOf(file) {
  const index = file.lastIndexOf('/');
  return index === -1 ? '' : file.slice(0, index + 1);
}

/** './game-card.html' относительно 'shared/game-card/game-card.ts' → 'shared/game-card/game-card.html' */
export function resolvePath(fromFile, specifier) {
  const parts = dirOf(fromFile).split('/').filter(Boolean);
  for (const part of specifier.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

/** Находит вызовы декоратора @Component({...}) и их объект метаданных */
function findComponentMetadata(ts, sourceFile) {
  const result = [];
  const visit = (node) => {
    if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
      const call = node.expression;
      const name = ts.isIdentifier(call.expression)
        ? call.expression.text
        : ts.isPropertyAccessExpression(call.expression)
          ? call.expression.name.text
          : '';
      const arg = call.arguments[0];
      if (name === 'Component' && arg && ts.isObjectLiteralExpression(arg)) result.push(arg);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

/**
 * Подставляет содержимое templateUrl/styleUrl(s) в код компонента.
 * Возвращает новый текст и список ошибок (не найден файл и т. п.).
 */
export function inlineResources(ts, file, code, files) {
  const errors = [];
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const replacements = [];

  const readResource = (property, specifier) => {
    const path = resolvePath(file, specifier);
    if (path in files) return files[path];
    const line = sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile)).line + 1;
    errors.push(`${file}:${line} — не найден файл «${specifier}» (${property.name.getText(sourceFile)})`);
    return '';
  };

  for (const metadata of findComponentMetadata(ts, sourceFile)) {
    for (const property of metadata.properties) {
      if (!ts.isPropertyAssignment(property) || !property.name) continue;
      const key = property.name.getText(sourceFile).replace(/['"]/g, '');
      const value = property.initializer;
      let text = null;
      if (key === 'templateUrl' && ts.isStringLiteralLike(value)) {
        text = `template: ${JSON.stringify(readResource(property, value.text))}`;
      } else if (key === 'styleUrl' && ts.isStringLiteralLike(value)) {
        text = `styles: [${JSON.stringify(readResource(property, value.text))}]`;
      } else if (key === 'styleUrls' && ts.isArrayLiteralExpression(value)) {
        const styles = value.elements
          .filter(ts.isStringLiteralLike)
          .map((e) => JSON.stringify(readResource(property, e.text)));
        text = `styles: [${styles.join(', ')}]`;
      }
      if (text !== null) {
        // Многострочное значение (styleUrls на нескольких строках) сохраняет число строк
        const original = code.slice(property.getStart(sourceFile), property.end);
        const lineBreaks = original.split('\n').length - 1;
        replacements.push({
          start: property.getStart(sourceFile),
          end: property.end,
          text: text + '\n'.repeat(lineBreaks),
        });
      }
    }
  }

  let result = code;
  for (const r of replacements.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, r.start) + r.text + result.slice(r.end);
  }
  return { code: result, errors };
}

/**
 * Компилирует файлы шага.
 * @param {typeof import('typescript')} ts
 * @param {(program: unknown) => unknown} angularJitApplicationTransform
 * @param {Record<string, string>} files — путь относительно корня шага → содержимое (.ts, .html, .css, …)
 * @returns {{ files: Record<string, string>, styles: string[], errors: string[] }}
 *   files — скомпилированные модули ('app.js', 'core/cart.js'), styles — глобальные стили, errors — ошибки сборки
 */
export function compileFiles(ts, angularJitApplicationTransform, files) {
  const errors = [];
  const sources = {};
  for (const [file, code] of Object.entries(files)) {
    if (!file.endsWith('.ts') || file.endsWith('.d.ts') || file.endsWith('.spec.ts')) continue;
    const inlined = inlineResources(ts, file, code, files);
    errors.push(...inlined.errors);
    sources[ROOT + file] = inlined.code;
  }

  const options = {
    ...COMPILER_OPTIONS,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  };
  const output = {};
  const host = {
    getSourceFile: (name, languageVersion) =>
      name in sources ? ts.createSourceFile(name, sources[name], languageVersion, true) : undefined,
    writeFile: (name, text) => {
      output[name] = text;
    },
    getDefaultLibFileName: () => '/lib.d.ts',
    useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => ROOT,
    getNewLine: () => '\n',
    fileExists: (name) => name in sources,
    readFile: (name) => sources[name],
  };

  const program = ts.createProgram(Object.keys(sources), options, host);
  for (const diagnostic of program.getSyntacticDiagnostics()) {
    const file = diagnostic.file?.fileName.slice(ROOT.length) ?? '';
    const line = diagnostic.file ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1 : 0;
    errors.push(`${file}:${line} — ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
  }
  program.emit(undefined, undefined, undefined, false, { before: [angularJitApplicationTransform(program)] });

  const compiled = {};
  for (const [name, text] of Object.entries(output)) {
    if (name.endsWith('.js')) compiled[name.slice(ROOT.length)] = text;
  }
  const styles = GLOBAL_STYLES in files ? [files[GLOBAL_STYLES]] : [];
  return { files: compiled, styles, errors };
}
