# Прототип: Angular 22 в браузере без сборщика

Отвечает на вопрос «можно ли сделать превью как в курсе PixiJS, только для Angular». Ответ — да. Это справочный код, не часть платформы.

## Что проверено (2026-10-03)

1. `compile.mjs` (Node): TypeScript 6.0.3 + `angularJitApplicationTransform` из `@angular/compiler-cli@22.2.1` компилирует `app/*.ts` в `out/*.js`. Трансформ превращает `input()`/`output()` в `propDecorators`, которые читает JIT-компилятор (см. `out/todo-item.js`).
2. `index.html`: import map на `fesm2022` пакетов Angular + `rxjs` одним файлом, `import '@angular/compiler'`, затем `out/main.js`. Результат в headless Chrome (`run.mjs`):
   ```
   render ms 217
   before: Счёт: 0 / 0 +1 Учить сигналы Учить DI ✓ valid=false name=
   [console] log toggled Учить сигналы h1= Счёт: 2 / 4
   after:  Счёт: 2 / 4 +1 Учить сигналы ✓ Учить DI ✓ valid=true name=Ann
   ```
   Работают: зонлесс-бутстрап, сервис через `inject()`, `signal`/`computed`, `input.required()`, `input()`, `output()`, `@if`, `@for … track`, `viewChild.required()`, Signal Forms (`form`, `required`, `[formField]`).
3. `browser-compile.html`: тот же трансформ **в браузере**. TS + compiler-cli собраны esbuild-ом в `vendor/ng-transform.mjs` (4,2 МБ, 1,2 МБ gzip) с заглушками Node-модулей (`stub.mjs`). Emit трёх файлов — ~40 мс, трансформ применяется (`TRANSFORM OK`).
4. TypeScript 5.9 (версия внутри Monaco 0.57) и 6.0 проверяют `app/main.ts` с типами Angular 22 без ошибок.

## Запуск

```bash
npm install
npm run vendor      # rxjs.mjs и ng-transform.mjs
npm run compile     # app/*.ts → out/*.js
npm run serve       # http://localhost:8765
# во втором терминале:
npm run check                          # index.html: запуск приложения и клики
node run.mjs browser-compile.html      # компиляция в браузере
```

Нужен Chrome (`CHROME_PATH`, по умолчанию путь macOS). Ошибка 404 в логе — `favicon.ico`, безвредна.

## Что прототип не проверял (этап 0.5 в roadmap)

- `templateUrl`/`styleUrl` (подстановка содержимого трансформом);
- роутер внутри iframe и ленивые маршруты через blob-модули;
- перехват `fetch` для учебного бэкенда и `HttpClient`/`httpResource`;
- вид ошибок шаблонов в JIT.

## Замечания

- Относительные ключи в import map (`"./todo-item"`) разрешаются от адреса **документа**, поэтому в `index.html` ключи — `/out/todo-item`. В платформе относительные импорты переписываются на blob-URL, как в курсе PixiJS.
- В `browser-compile.html` программа строится с `noResolve`/`noLib`: для emit типы не нужны, ошибки типов показывает Monaco.
