import { readdirSync, rmSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { courseContent } from './scripts/vite-course-content.mjs';

/** Список файлов public/assets (пути от public/: 'assets/covers/…') — для кнопки «Скачать» (src/app/download.ts) */
function publicFiles(): Plugin {
  const id = 'virtual:public-files';
  return {
    name: 'public-files',
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load(resolved) {
      if (resolved !== `\0${id}`) return;
      const files = readdirSync('public/assets', { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
        .map((entry) => `${entry.parentPath}/${entry.name}`.replace(/^public\//, ''))
        .sort();
      return `export default ${JSON.stringify(files)};`;
    },
  };
}

/**
 * Monaco регистрирует подсветку ~80 языков, а редактору курса нужны только эти. Каждая регистрация — отдельный
 * ленивый чанк в dist/, поэтому при сборке убираем лишние импорты из точки входа monaco-editor.
 * В dev Vite предварительно собирает monaco-editor целиком (optimizeDeps) — там языки остаются
 */
const MONACO_LANGUAGES = ['css', 'html', 'javascript', 'typescript'];

function monacoLanguages(): Plugin {
  return {
    name: 'monaco-languages',
    apply: 'build',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/monaco-editor/esm/vs/index.js')) return;
      return code.replace(/^import '\.\/languages\/definitions\/([\w-]+)\/register\.js';\n/gm, (line, language) =>
        MONACO_LANGUAGES.includes(language) ? line : '',
      );
    },
  };
}

/** Карты кода пакетов Angular и NgRx (public/vendor/**\/*.map) нужны только при отладке — в dist/ их не кладём */
function dropVendorMaps(): Plugin {
  return {
    name: 'drop-vendor-maps',
    apply: 'build',
    writeBundle(options) {
      const vendor = `${options.dir}/vendor`;
      for (const entry of readdirSync(vendor, { recursive: true, withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.map')) rmSync(`${entry.parentPath}/${entry.name}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), courseContent(), publicFiles(), monacoLanguages(), dropVendorMaps()],
  // 5173 и 5174 обычно заняты курсом PixiJS
  server: { port: 5180, strictPort: true },
  worker: { format: 'es' },
  optimizeDeps: {
    entries: ['index.html'],
    // Модули, которые грузятся динамически: без явного списка Vite находит их уже после старта,
    // пересобирает зависимости и ломает открытую страницу
    include: [
      'monaco-editor',
      'shiki/core',
      'shiki/engine/javascript',
      'shiki/themes/github-light.mjs',
      'shiki/themes/github-dark.mjs',
      'shiki/langs/angular-ts.mjs',
      'shiki/langs/angular-html.mjs',
      'shiki/langs/javascript.mjs',
      'shiki/langs/json.mjs',
      'shiki/langs/css.mjs',
      'shiki/langs/bash.mjs',
      // Prettier грузится лениво при первом форматировании
      'prettier/standalone',
      'prettier/plugins/typescript',
      'prettier/plugins/estree',
      'prettier/plugins/html',
      'prettier/plugins/postcss',
    ],
  },
});
