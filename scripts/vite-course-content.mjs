// Плагин Vite: уроки курса для платформы (src/content/course.ts). Два вида модулей:
// - `virtual:course` — course.json, названия глав и frontmatter шагов. Он входит в бандл страницы: из него строятся
//   оглавление, начальный экран и адреса шагов. Ещё он отдаёт `sources` — загрузчики модулей глав;
// - `virtual:course-chapter/<папка главы>` — тексты уроков, собственные файлы start/ и solution/ шагов, check.ts,
//   квиз и база первого шага (полный код шага прошлой главы из `base`). Это отдельный чанк главы, его грузит
//   страница шага или квиза;
// - `virtual:course-page/<slug>` — текст справочной страницы content/pages/<slug>.md (адрес /<slug>). Её название
//   и описание — в `virtual:course`, текст — отдельный чанк.
// YAML (frontmatter, квизы) разбирается здесь, в Node: в браузер он приходит готовым JSON.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { parseLesson } from '../shared/step-chain.js';
import { chapterSteps, clearChapterCache, readFiles, readResult } from './step-files.mjs';

const COURSE = 'virtual:course';
const CHAPTER = 'virtual:course-chapter/';
const PAGE = 'virtual:course-page/';

function readLesson(stepPath) {
  const path = join(stepPath, 'lesson.md');
  if (!existsSync(path)) throw new Error(`[content] не найден файл ${path}`);
  let lesson;
  try {
    lesson = parseLesson(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`[content] ошибка YAML во frontmatter ${path}: ${error.message}`);
  }
  if (!lesson) throw new Error(`[content] нет frontmatter в ${path}`);
  return lesson;
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

// Справочные страницы: content/pages/<slug>.md с frontmatter (title, description)
function pageSlugs(content) {
  const dir = join(content, 'pages');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
    .sort();
}

function readPage(content, slug) {
  const path = join(content, 'pages', `${slug}.md`);
  let page;
  try {
    page = parseLesson(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`[content] ошибка YAML во frontmatter ${path}: ${error.message}`);
  }
  if (!page) throw new Error(`[content] нет frontmatter в ${path}`);
  return page;
}

function courseModule(content) {
  const course = readJson(join(content, 'course.json'));
  const chapters = course.chapters.map((dir) => {
    const chapterPath = join(content, dir);
    return {
      dir,
      ...readJson(join(chapterPath, 'chapter.json')),
      hasQuiz: existsSync(join(chapterPath, 'quiz.yaml')),
      steps: chapterSteps(chapterPath).map((stepPath) => ({
        dir: stepPath.slice(chapterPath.length + 1),
        meta: readLesson(stepPath).meta,
      })),
    };
  });
  const loaders = course.chapters.map((dir) => `  ${JSON.stringify(dir)}: () => import('${CHAPTER}${dir}'),`);
  const slugs = pageSlugs(content);
  const pages = slugs.map((slug) => {
    const { title, description } = readPage(content, slug).meta;
    return { slug, title, description };
  });
  const pageLoaders = slugs.map((slug) => `  ${JSON.stringify(slug)}: () => import('${PAGE}${slug}'),`);
  return [
    `export default ${JSON.stringify({ ...course, chapters, pages })};`,
    `export const sources = {\n${loaders.join('\n')}\n};`,
    `export const pageSources = {\n${pageLoaders.join('\n')}\n};`,
  ].join('\n');
}

function chapterModule(chapterPath) {
  const stepPaths = chapterSteps(chapterPath);
  const first = stepPaths[0] && readLesson(stepPaths[0]).meta;
  const quizPath = join(chapterPath, 'quiz.yaml');
  const checkOf = (stepPath) => {
    const path = join(stepPath, 'check.ts');
    return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
  };
  const source = {
    base: first?.base ? readResult(join(chapterPath, '..', first.base)) : undefined,
    quiz: existsSync(quizPath) ? parseYaml(readFileSync(quizPath, 'utf8')) : undefined,
    steps: stepPaths.map((stepPath) => ({
      body: readLesson(stepPath).body,
      start: readFiles(join(stepPath, 'start')),
      solution: readFiles(join(stepPath, 'solution')),
      check: checkOf(stepPath),
    })),
  };
  return `export default ${JSON.stringify(source)};`;
}

export function courseContent() {
  let content;
  return {
    name: 'course-content',
    configResolved(config) {
      content = resolve(config.root, 'content');
    },
    resolveId(id) {
      if (id === COURSE || id.startsWith(CHAPTER) || id.startsWith(PAGE)) return `\0${id}`;
    },
    load(id) {
      if (id === `\0${COURSE}`) return courseModule(content);
      if (id.startsWith(`\0${CHAPTER}`)) return chapterModule(join(content, id.slice(CHAPTER.length + 1)));
      if (id.startsWith(`\0${PAGE}`)) {
        return `export default ${JSON.stringify(readPage(content, id.slice(PAGE.length + 1)).body)};`;
      }
    },
    // Модули читают файлы мимо графа модулей Vite. Любая правка в content/ может поменять и следующие главы
    // (база первого шага), поэтому сбрасываем все модули курса и перезагружаем страницу
    configureServer(server) {
      server.watcher.on('all', (_event, file) => {
        if (!resolve(file).startsWith(content + '/')) return;
        clearChapterCache();
        const graph = server.environments.client.moduleGraph;
        for (const [id, module] of graph.idToModuleMap) {
          if (id === `\0${COURSE}` || id.startsWith(`\0${CHAPTER}`) || id.startsWith(`\0${PAGE}`)) {
            graph.invalidateModule(module);
          }
        }
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
