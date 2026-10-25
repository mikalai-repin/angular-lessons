/** Файлы public/assets (пути от public/) — их перечисляет плагин public-files в vite.config.ts */
declare module 'virtual:public-files' {
  const files: string[];
  export default files;
}
