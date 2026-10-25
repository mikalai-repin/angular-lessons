import publicFiles from 'virtual:public-files';
import coursePackage from '../../package.json';
import apiServer from '../../cli-project/server/api.mjs?raw';
import proxyConfig from '../../cli-project/proxy.conf.json?raw';
import { BACKEND_DATA, extraPackages, projectReadme, toProjectFiles, usesBackend } from '../../shared/cli-project.js';
import { course, type FileMap, type Step } from '../content/course';
import { createZip, type ZipEntry } from './zip';

const VERSIONS: Record<string, string> = { ...coursePackage.devDependencies, ...coursePackage.dependencies };

/** Файл из public/ платформы — как его отдаёт сервер */
async function fetchPublic(path: string) {
  const response = await fetch(`/${path}`);
  if (!response.ok) throw new Error(`Не удалось загрузить /${path}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Собирает код шага в архив, который кладётся поверх проекта `ng new` (глава 20), и отдаёт браузеру на скачивание:
 * код — в src/ и src/app/, обложки — в public/assets/, учебный бэкенд — в server/ (если код ходит на /api/…)
 */
export async function downloadProject(step: Step, files: FileMap) {
  const encoder = new TextEncoder();
  const text = (path: string, content: string): ZipEntry => ({ path, data: encoder.encode(content) });
  const root = `hod-konem-${step.chapter.slug}-${step.slug}`;

  const backend = usesBackend(files);
  const packages = extraPackages(files).map((name) => `${name}@${VERSIONS[name]?.replace(/^[\^~]/, '') ?? 'latest'}`);
  const entries: ZipEntry[] = [
    text(
      'README.md',
      projectReadme({
        chapter: step.chapter.title,
        step: step.meta.title,
        packages,
        backend,
        angular: course.angularVersion,
      }),
    ),
    ...Object.entries(toProjectFiles(files)).map(([path, code]) => text(path, code)),
  ];

  // Обложки нужны всегда, когда есть бэкенд: адреса картинок приходят в его данных
  const usesAssets = backend || Object.values(files).some((code) => code.includes('/assets/'));
  const assets = usesAssets ? publicFiles : [];
  const downloads = assets.map(async (path) => ({ path: `public/${path}`, data: await fetchPublic(path) }));
  if (backend) {
    entries.push(text('server/api.mjs', apiServer), text('proxy.conf.json', proxyConfig));
    downloads.push(
      fetchPublic('backend/backend.js').then((data) => ({ path: 'server/backend.mjs', data })),
      ...BACKEND_DATA.map(async (name) => ({
        path: `server/data/${name}.json`,
        data: await fetchPublic(`backend/data/${name}.json`),
      })),
    );
  }
  entries.push(...(await Promise.all(downloads)));

  const zip = createZip(entries.map((entry) => ({ ...entry, path: `${root}/${entry.path}` })));
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zip);
  link.download = `${root}.zip`;
  link.click();
  // Ссылка уже отработала: освобождаем память архива чуть позже, когда браузер начал скачивание
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}
