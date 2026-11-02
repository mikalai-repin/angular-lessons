// Проверка шаблонов кода ученика компилятором AOT (ngtsc): то же, что `ng build` со `strictTemplates`, но только
// диагностика Angular — ошибки типов в шаблонах, неизвестные элементы и свойства, расширенная диагностика,
// ошибки в метаданных @Component. Обычные ошибки TypeScript показывает TS-воркер Monaco, их здесь нет.
// Общий модуль для веб-воркера платформы (src/compiler/compile.worker.ts: пакеты из /vendor/ts-angular.mjs) и Node
// (те же пакеты из node_modules): TypeScript и ngtsc передаются параметрами, файлы лежат в памяти.
//
// Типы библиотек (.d.ts и package.json пакетов, lib.*.d.ts TypeScript) — карта «путь от /node_modules/ → текст»;
// в браузере её собирает scripts/copy-vendor.mjs в /vendor/template-types.json.

/** Файлы шага лежат в /app/, как в src/app настоящего проекта; библиотеки — в /node_modules/ */
const APP = '/app/';
const NODE_MODULES = '/node_modules/';
const LIB_DIR = '/node_modules/typescript/lib';

// ---------- Пути POSIX: ngtsc работает с файлами через свою файловую систему (setFileSystem) ----------

function normalize(path) {
  const parts = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

function dirname(path) {
  const normalized = normalize(path);
  return normalized.slice(0, normalized.lastIndexOf('/')) || '/';
}

function basename(path, extension) {
  const name = normalize(path).split('/').pop();
  return extension && name.endsWith(extension) ? name.slice(0, -extension.length) : name;
}

function extname(path) {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot);
}

function resolve(...paths) {
  let result = APP;
  for (const path of paths) result = path.startsWith('/') ? path : `${result}/${path}`;
  return normalize(result);
}

function relative(from, to) {
  const a = normalize(from).split('/').filter(Boolean);
  const b = normalize(to).split('/').filter(Boolean);
  let common = 0;
  while (common < a.length && common < b.length && a[common] === b[common]) common++;
  return [...a.slice(common).map(() => '..'), ...b.slice(common)].join('/');
}

/** Файловая система ngtsc (интерфейс FileSystem из @angular/compiler-cli) поверх карты «путь → текст»; только чтение */
class MemoryFileSystem {
  constructor(files) {
    this.files = files;
    this.dirs = new Set(['/']);
    for (const file of files.keys()) {
      for (let dir = dirname(file); !this.dirs.has(dir); dir = dirname(dir)) this.dirs.add(dir);
    }
  }
  isCaseSensitive = () => true;
  exists = (path) => this.files.has(path) || this.dirs.has(path);
  readFile = (path) => {
    const text = this.files.get(path);
    if (text === undefined) throw new Error(`ENOENT: ${path}`);
    return text;
  };
  readFileBuffer = (path) => new TextEncoder().encode(this.readFile(path));
  readdir = (path) => {
    const prefix = path === '/' ? '/' : `${path}/`;
    const names = new Set();
    for (const entry of [...this.files.keys(), ...this.dirs]) {
      if (entry.startsWith(prefix) && entry !== path) names.add(entry.slice(prefix.length).split('/')[0]);
    }
    return [...names];
  };
  stat = (path) => {
    const isFile = this.files.has(path);
    const isDirectory = this.dirs.has(path);
    if (!isFile && !isDirectory) throw new Error(`ENOENT: ${path}`);
    return { isFile: () => isFile, isDirectory: () => isDirectory, isSymbolicLink: () => false };
  };
  lstat = this.stat;
  realpath = (path) => path;
  getDefaultLibLocation = () => LIB_DIR;
  pwd = () => APP.slice(0, -1);
  chdir() {}
  isRoot = (path) => path === '/';
  isRooted = (path) => path.startsWith('/');
  resolve = resolve;
  dirname = dirname;
  join = (...paths) => normalize(paths.join('/'));
  relative = relative;
  basename = basename;
  extname = extname;
  normalize = normalize;
  // Запись ngtsc не нужна: noEmit
  writeFile() {}
  removeFile() {}
  symlink() {}
  copyFile() {}
  moveFile() {}
  ensureDir() {}
  removeDeep() {}
}

/** Настройки — как в tsconfig.content.json (проверка `npm run validate`) и в tsconfig.json проекта `ng new` */
function compilerOptions(ts) {
  return {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    noImplicitOverride: true,
    noPropertyAccessFromIndexSignature: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    experimentalDecorators: true,
    noEmit: true,
    skipLibCheck: true,
    isolatedModules: true,
    types: [],
    // angularCompilerOptions; strictTemplates в Angular 22 включён по умолчанию — пишем явно, как CLI
    strictTemplates: true,
    strictInjectionParameters: true,
    strictInputAccessModifiers: true,
  };
}

/**
 * Состояние между проверками: разобранные .d.ts не меняются (их SourceFile переиспользуются), а прошлая программа
 * даёт ngtsc проверить заново только изменённое. Первая проверка магазина — около 0,5 с, следующие — около 0,2 с
 */
export function createTemplateChecker(ts, { NgtscProgram, setFileSystem }, libraries) {
  const libraryFiles = new Map(Object.entries(libraries).map(([path, text]) => [NODE_MODULES + path, text]));
  const librarySources = new Map();
  let oldProgram;

  /** files — код шага: 'catalog/catalog.html' → текст. Возвращает диагностику Angular с позициями (с единицы) */
  return function checkTemplates(files) {
    const all = new Map(libraryFiles);
    for (const [name, text] of Object.entries(files)) all.set(APP + name, text);
    const fileSystem = new MemoryFileSystem(all);
    setFileSystem(fileSystem);

    const host = {
      getSourceFile(fileName, languageVersion) {
        const text = all.get(fileName);
        if (text === undefined) return undefined;
        if (!fileName.startsWith(NODE_MODULES)) return ts.createSourceFile(fileName, text, languageVersion, true);
        let source = librarySources.get(fileName);
        if (!source)
          librarySources.set(fileName, (source = ts.createSourceFile(fileName, text, languageVersion, true)));
        return source;
      },
      getDefaultLibFileName: (options) => `${LIB_DIR}/${ts.getDefaultLibFileName(options)}`,
      getDefaultLibLocation: () => LIB_DIR,
      writeFile() {},
      getCurrentDirectory: fileSystem.pwd,
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (fileName) => all.has(fileName),
      readFile: (fileName) => all.get(fileName),
      directoryExists: (dir) => fileSystem.dirs.has(dir),
      getDirectories: (dir) => fileSystem.readdir(dir).filter((name) => fileSystem.dirs.has(`${dir}/${name}`)),
      realpath: (fileName) => fileName,
    };

    // Тесты (*.spec.ts) в сборку приложения не входят — как в `ng build`
    const rootNames = Object.keys(files)
      .filter((name) => name.endsWith('.ts') && !name.endsWith('.spec.ts'))
      .map((name) => APP + name);
    const program = new NgtscProgram(rootNames, compilerOptions(ts), host, oldProgram);
    oldProgram = program;

    const diagnostics = [...program.getNgStructuralDiagnostics(), ...program.getNgSemanticDiagnostics()];
    return diagnostics
      .filter((d) => d.file?.fileName.startsWith(APP) && d.start !== undefined)
      .map((d) => {
        const start = d.file.getLineAndCharacterOfPosition(d.start);
        const end = d.file.getLineAndCharacterOfPosition(d.start + (d.length ?? 0));
        // Коды ngtsc — отрицательные: -998001 → NG8001
        const code = String(d.code).startsWith('-99') ? `NG${String(d.code).slice(3)}` : `TS${d.code}`;
        return {
          file: d.file.fileName.slice(APP.length),
          line: start.line + 1,
          column: start.character + 1,
          endLine: end.line + 1,
          endColumn: end.character + 1,
          code,
          // Расширенная диагностика сама начинает текст с кода («NG8109: count is a function…»)
          message: ts.flattenDiagnosticMessageText(d.messageText, '\n').replace(`${code}: `, ''),
          severity: d.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
        };
      });
  };
}
