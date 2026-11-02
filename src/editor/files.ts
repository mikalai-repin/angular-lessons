import type { FileMap } from '../content/course';

/** Какие файлы ученик может создать: их понимают компиляция, редактор и «Скачать» */
const FILE_NAME = /^([\w-][\w.-]*\/)*[\w-][\w.-]*\.(ts|html|css)$/;

/** Имя нового файла без пробелов и ведущих «./» и «/» */
export const normalizeFileName = (name: string) => name.trim().replace(/^(\.?\/)+/, '');

/** Почему имя не подходит для нового файла (или null, если подходит) */
export function fileNameError(name: string, existing: string[]): string | null {
  if (!name) return 'Имя файла пустое.';
  if (!FILE_NAME.test(name)) {
    return `Имя «${name}» не подходит: нужен путь вида catalog/filter.ts — латиница, цифры, «-», «_», «.», расширение .ts, .html или .css.`;
  }
  if (existing.includes(name)) return `Файл «${name}» уже есть.`;
  const asFolder = `${name}/`;
  if (existing.some((file) => file.startsWith(asFolder))) return `«${name}» — это папка.`;
  return null;
}

const folderOf = (file: string) => file.slice(0, file.lastIndexOf('/') + 1);

/**
 * Порядок вкладок: файлы шага в его порядке, затем созданные учеником — каждый после последнего файла
 * своей папки (компонент из трёх файлов окажется рядом), файл новой папки — в конце
 */
export function orderFiles(stepOrder: string[], files: FileMap): string[] {
  const list = stepOrder.filter((file) => file in files);
  for (const file of Object.keys(files)) {
    if (list.includes(file)) continue;
    const folder = folderOf(file);
    const last = list.map(folderOf).lastIndexOf(folder);
    list.splice(last === -1 ? list.length : last + 1, 0, file);
  }
  return list;
}
