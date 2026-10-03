import type * as Monaco from 'monaco-editor';

// Подсветка шаблонов Angular в редакторе. Встроенная грамматика HTML в Monaco ничего не знает об Angular:
// @if, {{ }}, [prop], (event) выглядят как обычный текст. Эта грамматика Monarch — HTML плюс синтаксис
// шаблонов Angular. Регистрируется для языка `html` (см. monaco.ts), поэтому автодополнение и форматирование
// HTML продолжают работать. Цвета токенов — в темах `course-light` / `course-dark` ниже.
//
// Токены (к ним Monaco добавляет постфикс `.html`):
//   keyword.control.angular  — @if, @for, @else, @switch, @case, @defer, @let…, а также { } блоков
//   delimiter.interpolation  — {{ и }}
//   attribute.name.binding   — [prop], [(model)], [class.x], *ngIf, animate.enter
//   attribute.name.event     — (click), (keydown.enter)
//   attribute.name.ref       — #search
//   variable.expr / function.expr / type.pipe / variable.predefined ($event, $index) — внутри выражений

// В регулярных выражениях Monarch «@имя» — ссылка на атрибут грамматики, литеральный @ пишется «@@».
// «@(» и «@]» безопасны: подстановка срабатывает только на @ + буквы
const BLOCKS_WITH_PARAMS = /@(?:else\s+if|if|for|switch|case|defer|placeholder|loading)/;
const BLOCKS = /@(?:else|empty|default|placeholder|loading|error|defer)\b/;
const BINDING = /\[\(?[\w.\-@]+\)?\]|\*[\w\-]+|animate\.(?:enter|leave)/;
const EVENT = /\([\w.\-:@]+\)/;

/** Правила выражения шаблона: подключаются через include в состояниях-выражениях */
const expression: Monaco.languages.IMonarchLanguageRule[] = [
  [/'([^'\\]|\\.)*'/, 'string'],
  [/`([^`\\]|\\.)*`/, 'string'],
  [/\d+(\.\d+)?/, 'number'],
  [/\b(?:true|false|null|undefined|this|typeof|void|in|of|as|let|track)\b/, 'keyword'],
  [/\$[\w$]+/, 'variable.predefined'],
  // Пайп: «| currency», но не «||»
  [/\|\|/, 'delimiter'],
  [/(\|)(\s*)([A-Za-z_$][\w$]*)/, ['delimiter', '', 'type.pipe']],
  [/[A-Za-z_$][\w$]*(?=\s*\()/, 'function.expr'],
  [/[A-Za-z_$][\w$]*/, 'variable.expr'],
  [/[([]/, 'delimiter.parenthesis', '@nested'],
  [/\{/, 'delimiter.bracket', '@nestedBrace'],
  [/[=!<>+\-*/%&?:.,;|]+/, 'delimiter'],
  [/\s+/, ''],
];

export const angularHtmlLanguage: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.html',
  ignoreCase: false,

  tokenizer: {
    root: [
      [/<!DOCTYPE/, 'metatag', '@doctype'],
      [/<!--/, 'comment', '@comment'],
      [/\{\{/, 'delimiter.interpolation', '@interpolation'],
      // @let total = expr;
      [
        /(@@let)(\s+)([\w$]+)(\s*)(=)/,
        ['keyword.control.angular', '', 'variable.expr', '', { token: 'delimiter', next: '@letExpression' }],
      ],
      // @if (expr) / @for (item of items; track item.id) / @case (value) / @defer (on viewport)
      [
        new RegExp(`(${BLOCKS_WITH_PARAMS.source})(\\s*)(\\()`),
        ['keyword.control.angular', '', { token: 'delimiter.parenthesis', next: '@blockParams' }],
      ],
      [BLOCKS, 'keyword.control.angular'],
      [/[{}]/, 'keyword.control.angular'],
      [/(<)((?:[\w\-]+:)?[\w\-]+)(\s*)(\/>)/, ['delimiter', 'tag', '', 'delimiter']],
      [/(<)(script)/, ['delimiter', { token: 'tag', next: '@script' }]],
      [/(<)(style)/, ['delimiter', { token: 'tag', next: '@style' }]],
      [/(<)((?:[\w\-]+:)?[\w\-]+)/, ['delimiter', { token: 'tag', next: '@otherTag' }]],
      [/(<\/)((?:[\w\-]+:)?[\w\-]+)/, ['delimiter', { token: 'tag', next: '@otherTag' }]],
      [/</, 'delimiter'],
      [/@/, ''],
      // Текст: до тега, интерполяции, блока или скобки блока
      [/[^<@{}]+/, ''],
    ],

    doctype: [
      [/[^>]+/, 'metatag.content'],
      [/>/, 'metatag', '@pop'],
    ],

    comment: [
      [/-->/, 'comment', '@pop'],
      [/[^-]+/, 'comment.content'],
      [/./, 'comment.content'],
    ],

    otherTag: [
      [/\/?>/, 'delimiter', '@pop'],
      // [prop]="expr", (event)="handler()", *ngIf="expr": значение — выражение Angular
      [
        new RegExp(`(${BINDING.source})(\\s*=\\s*)(")`),
        ['attribute.name.binding', 'delimiter', { token: 'attribute.value', next: '@attributeExpression' }],
      ],
      [
        new RegExp(`(${EVENT.source})(\\s*=\\s*)(")`),
        ['attribute.name.event', 'delimiter', { token: 'attribute.value', next: '@attributeExpression' }],
      ],
      [BINDING, 'attribute.name.binding'],
      [EVENT, 'attribute.name.event'],
      [/#[\w\-]+/, 'attribute.name.ref'],
      // Обычный атрибут: внутри значения может быть интерполяция alt="{{ game.title }}"
      [/"/, 'attribute.value', '@attributeString'],
      [/'([^']*)'/, 'attribute.value'],
      [/[\w\-.:@]+/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/[ \t\r\n]+/, ''],
    ],

    attributeString: [
      [/\{\{/, 'delimiter.interpolation', '@interpolation'],
      [/[^"{]+/, 'attribute.value'],
      [/\{/, 'attribute.value'],
      [/"/, 'attribute.value', '@pop'],
    ],

    attributeExpression: [[/"/, 'attribute.value', '@pop'], { include: '@expression' }],

    interpolation: [
      [/\}\}/, 'delimiter.interpolation', '@pop'],
      [/"([^"\\]|\\.)*"/, 'string'],
      { include: '@expression' },
    ],

    blockParams: [
      [/\)/, 'delimiter.parenthesis', '@pop'],
      [/"([^"\\]|\\.)*"/, 'string'],
      // Триггеры @defer: on viewport, on idle, prefetch on hover, when cond
      [/\b(?:on|when|prefetch|hydrate|never)\b/, 'keyword'],
      { include: '@expression' },
    ],

    letExpression: [[/;/, 'delimiter', '@pop'], [/"([^"\\]|\\.)*"/, 'string'], { include: '@expression' }],

    nested: [[/[)\]]/, 'delimiter.parenthesis', '@pop'], [/"([^"\\]|\\.)*"/, 'string'], { include: '@expression' }],

    nestedBrace: [[/\}/, 'delimiter.bracket', '@pop'], [/"([^"\\]|\\.)*"/, 'string'], { include: '@expression' }],

    expression,

    // <script> и <style> в шаблонах Angular почти не встречаются: встроенные JS и CSS без тонкостей с атрибутом type
    script: [
      [/"([^"]*)"/, 'attribute.value'],
      [/'([^']*)'/, 'attribute.value'],
      [/[\w\-]+/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/>/, { token: 'delimiter', next: '@scriptEmbedded', nextEmbedded: 'text/javascript' }],
      [/[ \t\r\n]+/, ''],
    ],
    scriptEmbedded: [
      [/<\/script/, { token: '@rematch', switchTo: '@scriptEnd', nextEmbedded: '@pop' }],
      [/[^<]+/, ''],
    ],
    scriptEnd: [[/(<\/)(script\s*)(>)/, ['delimiter', 'tag', { token: 'delimiter', next: '@pop' }]]],

    style: [
      [/"([^"]*)"/, 'attribute.value'],
      [/'([^']*)'/, 'attribute.value'],
      [/[\w\-]+/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/>/, { token: 'delimiter', next: '@styleEmbedded', nextEmbedded: 'text/css' }],
      [/[ \t\r\n]+/, ''],
    ],
    styleEmbedded: [
      [/<\/style/, { token: '@rematch', switchTo: '@styleEnd', nextEmbedded: '@pop' }],
      [/[^<]+/, ''],
    ],
    styleEnd: [[/(<\/)(style\s*)(>)/, ['delimiter', 'tag', { token: 'delimiter', next: '@pop' }]]],
  },
};

/** Цвета токенов Angular поверх стандартных тем Monaco (палитра — как у TypeScript в тех же темах) */
export function defineCourseThemes(monaco: typeof Monaco) {
  monaco.editor.defineTheme('course-light', {
    base: 'vs',
    inherit: true,
    colors: {},
    rules: [
      { token: 'keyword.control.angular', foreground: 'AF00DB', fontStyle: 'bold' },
      { token: 'delimiter.interpolation', foreground: 'AF00DB' },
      { token: 'attribute.name.binding', foreground: '0070C1' },
      { token: 'attribute.name.event', foreground: '795E26' },
      { token: 'attribute.name.ref', foreground: '267F99' },
      { token: 'variable.expr', foreground: '001080' },
      { token: 'variable.predefined', foreground: '0070C1' },
      { token: 'function.expr', foreground: '795E26' },
      { token: 'type.pipe', foreground: '267F99' },
    ],
  });
  monaco.editor.defineTheme('course-dark', {
    base: 'vs-dark',
    inherit: true,
    colors: {},
    rules: [
      { token: 'keyword.control.angular', foreground: 'C586C0', fontStyle: 'bold' },
      { token: 'delimiter.interpolation', foreground: 'C586C0' },
      { token: 'attribute.name.binding', foreground: '4FC1FF' },
      { token: 'attribute.name.event', foreground: 'DCDCAA' },
      { token: 'attribute.name.ref', foreground: '4EC9B0' },
      { token: 'variable.expr', foreground: '9CDCFE' },
      { token: 'variable.predefined', foreground: '4FC1FF' },
      { token: 'function.expr', foreground: 'DCDCAA' },
      { token: 'type.pipe', foreground: '4EC9B0' },
    ],
  });
}
