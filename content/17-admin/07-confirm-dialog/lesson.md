---
title: Подтверждение удаления
startFrom: custom
focus: core/confirmation.ts
url: /admin/games
api: [createComponent, inputBinding, outputBinding, ApplicationRef.attachView, hostView, ComponentRef.destroy, EnvironmentInjector, 'method="dialog"', CanDeactivateFn]
---

Удаление игры не отменить. Перед ним нужно спросить «Вы уверены?». Проще всего — `confirm()`, как в гарде оформления заказа в главе 10. Но окно `confirm` рисует браузер: его не оформить, кнопки в нём — «ОК» и «Отмена» (а не «Удалить»), и пока оно открыто, страница стоит. Сделаем своё окно — и так, чтобы спрашивать им было так же просто, как `confirm`:

```ts
if (await this.confirmation.ask('Удалить «Маяк»?', 'Удалить')) { … }
```

## Что изменилось в коде

- `shared/confirm-dialog/` — готовый компонент окна `ConfirmDialog`: вход `question` (вопрос), вход `action` (подпись кнопки «да»), выход `answer` (`true` или `false`). Внутри — `<dialog>` и `showModal()` в `afterNextRender`, как в главе 6.
- `core/confirmation.ts` — заготовка сервиса `Confirmation` с методом `ask`.
- В `styles.css` — класс `visually-hidden`: текст, который слышит экранный диктор, но не видно на экране.

Окно закрывается само, без кода в компоненте:

```html shared/confirm-dialog/confirm-dialog.html
<dialog #dialog (close)="answer.emit(dialog.returnValue === 'yes')">
  <p>{{ question() }}</p>
  <form method="dialog" class="actions">
    <button class="link-button" value="no">Отмена</button>
    <button class="button" value="yes">{{ action() }}</button>
  </form>
</dialog>
```

`<form method="dialog">` — возможность самого браузера: кнопка такой формы закрывает окно, и её `value` становится `returnValue` окна. Esc тоже закрывает окно, но `returnValue` остаётся пустым. Событие `close` бывает в обоих случаях — по нему компонент и отвечает.

## Где разместить окно

Компоненты до сих пор появлялись из шаблонов: `<app-game-card>` в каталоге, страница в `<router-outlet>`. Можно и окно положить в шаблон таблицы: `@if (asking()) { <app-confirm-dialog … /> }`, сигнал с вопросом, обработчик ответа. А потом то же — в форме редактирования, в форме новой игры… Каждая страница держала бы у себя кусок чужой работы.

Хочется другого: вызвал функцию — получил промис ответа. Значит, окно нужно создать **из кода**, без шаблона-родителя. Это **динамический компонент**: его создаёт функция `createComponent`.

## Окно из кода

```ts core/confirmation.ts {4-15,17,19}
ask(question: string, action = 'Да'): Promise<boolean> {
  return new Promise((resolve) => {
    // 1. Создать компонент и привязать входы и выход
    const dialog = createComponent(ConfirmDialog, {
      environmentInjector: this.injector,
      bindings: [
        inputBinding('question', () => question),
        inputBinding('action', () => action),
        outputBinding<boolean>('answer', (yes) => {
          resolve(yes);
          // 4. Ответ получен — убрать окно
          dialog.destroy();
        }),
      ],
    });
    // 2. Положить хост-элемент на страницу
    document.body.append(dialog.location.nativeElement);
    // 3. Включить окно в обнаружение изменений
    this.appRef.attachView(dialog.hostView);
  });
}
```

Разберём по шагам.

1. **`createComponent(ConfirmDialog, { environmentInjector, bindings })`** создаёт экземпляр компонента, его хост-элемент `<app-confirm-dialog>` и шаблон. Возвращает `ComponentRef` — пульт управления. Инжектор окружения нужен, чтобы компоненту было из чего внедрять зависимости: у компонента из шаблона он есть от родителя, у этого — только тот, что передали. `inject(EnvironmentInjector)` в сервисе из `root` даёт `root`.
2. **`bindings`** — то, что в шаблоне было бы `[question]="…"` и `(answer)="…"`. `inputBinding(имя, функция)` — привязка входа: Angular вызывает функцию, когда проверяет представление компонента, — как выражение привязки в шаблоне. Подойдёт и сигнал. `outputBinding(имя, обработчик)` — подписка на выход.
3. **`dialog.location.nativeElement`** — хост-элемент. `createComponent` его создал, но в документ не вставил: куда — решаем мы. Окну место в конце `<body>`.
4. **`appRef.attachView(dialog.hostView)`** — включить представление окна в обнаружение изменений приложения. У компонента из шаблона родитель проверяет детей сам. У этого родителя нет — без `attachView` его не проверит никто.
5. **`dialog.destroy()`** — уничтожить компонент: Angular убирает хост-элемент из DOM и отключает представление от приложения.

`Confirmation` — обычный `@Service()` в `root`: спрашивать «вы уверены?» может любая часть магазина.

## Удаление

В `AdminGames` — метод `remove(game)`: `DELETE /api/games/:id` и запись «Удалена игра «…»» в журнал. В таблице — колонка с кнопкой:

```ts admin/games-table/games-table.ts
protected async remove(game: Game) {
  const yes = await this.confirmation.ask(
    `Удалить «${game.title}» из каталога?`,
    'Удалить',
  );
  if (yes) {
    await this.admin.remove(game);
    this.games.reload();
  }
}
```

У кнопки `[attr.aria-label]="'Удалить ' + game.title"`: на экране в каждой строке «Удалить», а диктор прочитает, что именно. У заголовка колонки — скрытый текст «Действия» (`visually-hidden`): пустой заголовок диктор не назовёт никак.

## Второе применение: гард несохранённой формы

Админ поменял цену и щёлкнул «← Игры» — изменения пропадут молча. В оформлении заказа такой гард уже есть, на `confirm()`. Для админки — тот же гард, но с нашим окном. Гард `canDeactivate` может вернуть промис: роутер дождётся ответа.

```ts admin/admin-guards.ts
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (page) =>
  !page.hasUnsavedChanges() ||
  inject(Confirmation).ask('Изменения не сохранятся. Уйти со страницы?', 'Уйти');
```

`HasUnsavedChanges` — интерфейс с одним методом: гард подойдёт любой странице, у которой он есть. У `GameEdit` «есть что терять» — форма тронута: `this.gameForm().dirty()`. И после удачного сохранения форму нужно «отпустить» — `this.gameForm().reset()` снимает `dirty` и `touched`, не трогая значения. Иначе гард спросит и после «Сохранить».

::: task
1. Допишите `Confirmation.ask` по четырём шагам: создать (`createComponent` с `inputBinding` и `outputBinding`), положить хост-элемент в `body`, `attachView`, после ответа — `resolve` и `destroy`.
2. В `AdminGames` — `remove(game)`: `DELETE /api/games/:id` и запись в журнал.
3. В таблице — колонка «Удалить» (заголовок `visually-hidden` «Действия», кнопка `.link-button` с `aria-label`) и метод `remove`: спросить, удалить, перезагрузить ресурс. Не забудьте `colspan="4"` у «Ничего не найдено».
4. В `admin/admin-guards.ts` — `HasUnsavedChanges` и `unsavedChangesGuard`. У `GameEdit` — `hasUnsavedChanges()` и `reset()` после сохранения; у маршрута `:id` — `canDeactivate`.
:::

## Что получилось

Щёлкните «Удалить» у «Весёлой фермы»: страница затемнилась, окно «Удалить «Весёлая ферма» из каталога?», фокус на «Отмене» — `showModal` переносит его на первую кнопку. Нажмите Esc: окно исчезло, игра на месте. Снова «Удалить» и «Удалить» в окне: в «Сети» `DELETE /api/games/20` → `204`, «Найдено игр: 39». На сводке — «Удалена игра «Весёлая ферма»».

Откройте игру, поменяйте название и щёлкните «← Игры»: окно «Изменения не сохранятся». «Отмена» — вы на странице игры, «Уйти» — в таблице. Сохраните изменения — уйдёте без вопроса.

В DOM после каждого ответа `<app-confirm-dialog>` нет: `destroy` убрал его.

## Эксперименты

**Без `attachView`.** Уберите строку `this.appRef.attachView(dialog.hostView)` и щёлкните «Удалить». Ничего не открылось. В DOM в конце `<body>` — `<app-confirm-dialog>` с закрытым `<dialog>` внутри, и в нём только «Отмена»: статичный текст шаблона создан, а вопроса и подписи «Удалить» нет — привязки ни разу не проверялись. `afterNextRender` тоже не сработал: функции, которые компонент зарегистрировал, Angular ставит в очередь, когда проверяет его представление (`addAfterRenderSequencesForView` в `@angular/core`), а это представление не проверяется никогда. Щёлкните ещё раз — второй такой же элемент. Верните строку.

**Без `append`.** Уберите `document.body.append(…)`: в консоли `InvalidStateError: Failed to execute 'showModal' on 'HTMLDialogElement': The element is not in a Document.` Обнаружение изменений до окна дошло, `afterNextRender` сработал — а элемента на странице нет. Верните.

**Без `destroy`.** Уберите `dialog.destroy()`, откройте и закройте окно два раза: в `<body>` два `<app-confirm-dialog>`. Закрытые окна не видны, но живут: компоненты, их представления в приложении, обработчик ответа. Каждый вопрос добавляет ещё один. Верните.

**Без `reset`.** Уберите `this.gameForm().reset()` из `save` и сохраните игру: после «Сохранить» — окно «Изменения не сохранятся». Форма всё ещё `dirty`, гард о сохранении не знает. Верните.

## Как в настоящем проекте

Тест для `Confirmation` в превью пройдёт, а в `ng test` с jsdom — нет: `TypeError: this.dialog(...).nativeElement.showModal is not a function`. В jsdom у `<dialog>` нет `showModal`. Такие тесты запускают в настоящем браузере — `ng test --browsers` (глава 16, шаг про `ng test`).

Своё окно на двадцать строк — хорошо для понимания. В больших проектах обычно берут готовое: в Angular CDK есть `Dialog` (`@angular/cdk/dialog`). В превью CDK нет, поэтому только для чтения:

```ts
import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-confirm',
  template: `
    <p>{{ data.question }}</p>
    <button (click)="ref.close(false)">Отмена</button>
    <button (click)="ref.close(true)">{{ data.action }}</button>
  `,
})
export class CdkConfirm {
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly data = inject<Question>(DIALOG_DATA);
}

// в сервисе
const ref = this.dialog.open<boolean, Question>(CdkConfirm, {
  data: { question, action },
});
// closed: ответ, а при Esc или щелчке мимо окна — undefined
return (await firstValueFrom(ref.closed)) === true;
```

Идея та же: `open` создаёт компонент из кода и возвращает пульт `DialogRef`. Данные вместо входов передаются токеном `DIALOG_DATA`. Окно CDK — не `<dialog>`, а слой поверх страницы (overlay): фокус в нём удерживает «ловушка фокуса» CDK, после закрытия он возвращается на прежнее место (`restoreFocus`), а Esc и щелчок по затемнению закрывают окно, если не указать `disableClose`. Пример проверен `ngc --strictTemplates` с `@angular/cdk` 22.2.1: `ref.close(1)` в шаблоне — ошибка TS2345.

::: deep Под капотом: компонент из шаблона и из кода
Для компонента в шаблоне Angular делает то же, что мы руками: создаёт хост-элемент и представление компонента, привязывает входы (в шаблоне — инструкциями `ɵɵproperty`, у нас — `inputBinding`), вставляет элемент в DOM родителя и включает представление в дерево представлений родителя — поэтому его проверяют вместе с родителем. У динамического компонента родителя в дереве нет, и его место в дереве — корень: `attachView` делает его ещё одним корнем приложения, рядом с `App`.

Есть и второй способ: `ViewContainerRef.createComponent(Компонент, { bindings })` — вставить компонент в определённое место шаблона. Так работает `<router-outlet>`: страница маршрута — тоже динамический компонент, созданный в контейнере на месте outlet.
:::
