import { readdirSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

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

export default defineConfig({
  plugins: [react(), publicFiles()],
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
