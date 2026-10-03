---
title: Поиск
startFrom: custom
focus: catalog/catalog.ts
api: [signal, 'httpResource({ url, params })']
backend: { latency: 800 }
---

Второй шаг песочницы проверяет цепочку «старт → решение» и реактивные параметры запроса.

```ts catalog/catalog.ts {1,3-6}
protected readonly query = signal('');
// Ресурс перечитывается сам, когда меняется query
protected readonly games = httpResource<Page<Game>>(() => ({
  url: '/api/games',
  params: { q: this.query() },
}));
```

```html catalog/catalog.html
<input #search placeholder="Поиск" [value]="query()" (input)="query.set(search.value)" />
```

::: task
Добавьте поиск по каталогу. Задержка бэкенда в этом шаге — 800 мс: во вкладке «Сеть» видно, как устаревшие запросы отменяются.
:::
