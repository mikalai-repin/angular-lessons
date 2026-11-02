# Команды и проверки

Полный список. Самые частые — в `CLAUDE.md`.

- `npm run dev` — платформа на **http://localhost:5180** (5173 и 5174 заняты курсом PixiJS)
- `npm run validate` — структура уроков, цепочка start/solution, сборка каждого шага и `ngc` по полному коду всех шагов: типы TS и шаблонов (`strictTemplates`), расширенная диагностика; предупреждение — ошибка, кроме NG8113 в старте (после любых правок в `content/`, ~40 с)
- `npm run step <…/шаг/solution> [папка]` — выгрузить полный код шага (в `content/` шаг хранит только изменения) в `tools/e2e/out/step/`
- `npm run build` — проверка типов платформы и продакшен-сборка
- `npx prettier --check .` — форматирование всего кода (`prettier.config.mjs`: код уроков — как кнопка «Формат», настройки в `shared/lesson-prettier.json`; Markdown не форматируется)
- `python3 tools/authoring/format-content.py [глава…]` — пересобрать код шагов из `content/`: все главы после изменения `shared/lesson-prettier.json`, одну — после правки последнего шага прошлой главы (новый `baseHash`)
- `npm run reference` — скачать код angular.dev (папка `adev/` на коммите `fb7711f`, релиз v22.2.1) в `reference/angular` для главы 21
- `npm run covers` — пересоздать SVG-обложки после изменения `public/backend/data/games.json`
- `node tools/e2e/run-dir.mjs <папка шага> [адрес] [мс]` — код шага в чистом превью: консоль, запросы, адрес, текст страницы, скриншот в `tools/e2e/out/`
- `node tools/e2e/run-tests.mjs <папка шага> [--with <папка>]` — тесты шага (*.spec.ts) в чистом превью; `node tools/e2e/ng-test.mjs <папка шага> [--browser]` — те же тесты в настоящем `ng test` (проект Angular CLI в `tools/e2e/out/cli`, Node 24 через nvm, пакеты NgRx — версий курса)
- `node tools/e2e/cli-overlay.mjs <папка шага> <проект> [--keep-app]` — код шага поверх проекта `ng new` (как архив «Скачать»); `node tools/e2e/cli-browse.mjs <адрес> [сценарий] [--js-off]` — приложение проекта CLI (`ng serve`, сервер SSR, статика) в Chrome; проект главы 20 для опытов — `tools/e2e/out/ch20/hod-konem` (Node 24 через nvm)
- `node tools/e2e/ng-build.mjs <папка шага> [--jit] [--dev]` — код шага в настоящей сборке `ng build` (тот же проект CLI), размеры файлов
- `node tools/e2e/run-chapter.mjs <папка главы>` — все шаги главы в интерфейсе платформы с «Решением»
- `node tools/e2e/exp.mjs <папка> <сценарий.mjs> [адрес]` — эксперимент из текста урока со своим сценарием действий
- `node tools/e2e/checks/platform.mjs` и `checks/preview.mjs` — проверки платформы на демо-магазине шага 1.1 (после любых правок в `src/`, `public/`, `shared/`); `checks/download.mjs [адрес шага]` — кнопка «Скачать» (после правок `src/app/download.ts`, `shared/cli-project.js`, `cli-project/`); `checks/chNN-*.mjs` — проверки глав 2–15, 17–19, 21, 22 (`ch14-auth.mjs` идёт ~2 минуты: ждёт истечения токенов); `checks/step-checks.mjs [глава…]` — проверки практикумов `check.ts` (старт не проходит, решение проходит); `checks/quiz.mjs` — квиз главы: перемешивание, зачёт 85 %, прогресс, оглавление (после правок в `src/quiz/`); `checks/test-runner.mjs` — отчёт тестов на шагах главы 16, переключатель «Приложение / Тесты», «Проверить» с тестами (после правок раннера и `preview-runtime.js`)
- Все проверки требуют запущенного `npm run dev` и Chrome (`CHROME_PATH`, по умолчанию путь macOS). Другой адрес — `BASE_URL=http://localhost:5181`
