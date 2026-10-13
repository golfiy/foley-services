# Foley – Services (фото + аккордеон с автоплеем)

HTML-прототип секции «Driver Qualification Files / Drug & Alcohol Testing / MVR Monitoring / Background Checks / DOT Compliance». Собрано по скриншоту (Figma не открывали), геометрия под фрейм 1440: паддинг 72, фото 750×631, зазор 90, список 456.

```bash
python3 -m http.server 4966 --bind 127.0.0.1 --directory /Users/pc-38/Claude/foley-services
```

Только локально, без remote (как остальные Foley-прототипы).

## Поведение

- **Автоплей**: каждый пункт 6s. Тёмная полоса на верхнем разделителе открытого пункта заполняется слева направо, по окончании открывается следующий, после последнего снова первый
- **Переход** (~0.65s, ease-in-out):
  - открытый пункт закрывается, новый раскрывается: высота через `flex-grow` + `grid-template-rows 0fr → 1fr`, последний пункт всё время стоит на нижней кромке фото
  - заголовок растёт 23.5 → 36px через `transform: scale` (без reflow), цвет `#70707D → #111117`, вес 400 → 500 (variable Inter, плавно)
  - текст и «Learn more» поднимаются по очереди (stagger 70ms) после того, как высота начала открываться
  - фото: новое проявляется шторкой снизу вверх (вниз по списку) или сверху вниз (если кликнули пункт выше) + лёгкий zoom-out 1.12 → 1. Пока пункт открыт, фото медленно наезжает (Ken Burns 1 → 1.05)
- **Пауза**: курсор над секцией (полоса и Ken Burns замирают), фокус с клавиатуры внутри, секция вне экрана, вкладка скрыта
- **Клик** по пункту открывает его и перезапускает таймер. На тач-экране первый тап выключает автоплей, чтобы текст не уехал, пока его читают
- **Клавиатура**: пункты – кнопки с `aria-expanded`, ↑/↓/Home/End переходят между ними
- **Reduced motion**: без автоплея, фото меняется fade без zoom, текст без сдвигов
- **Mobile (<860)**: фото 4:3 сверху, список под ним, тот же автоплей

## Режимы для ревью

| Параметр | Что делает |
|---|---|
| `.` (клавиша) | Demo panel: автоплей on/off, шаг 4/6/8s, фото Wipe/Fade, скорость ×1/×4 |
| `?shot=4` | Статичный кадр как в макете: открыт Background Checks, полоса 27% (1–5 – номер пункта) |
| `?dwell=4000` | Длительность шага, мс |
| `?autoplay=0` | Без автоплея |
| `?fx=fade` | Фото через fade вместо шторки |
| `?slow=4` | Замедлить переходы |
| `?panel` | Открыть demo panel сразу |

## Сверка со скрином

Headless Chrome 1536×871, `?shot=4`, кроп секции против скрина, приведённого к 1440: совпадают кроп фото (тот же кадр Unsplash, `object-fit: cover` по центру), шаг закрытых пунктов 59px, ширина строк текста (Inter Display 20px: 427.5 vs 428px), размер кнопки 180×56.

## Отличия и допущения

- Тексты для Driver Qualification Files, Drug & Alcohol Testing, MVR Monitoring и DOT Compliance написаны мной как плейсхолдеры, в макете был только Background Checks
- Цвета сняты пипеткой со скрина: фон секции `#F8FAFB`, разделитель `#C8D1DC`, текст `#1A3946`, кнопка `#2A4C5A` (hover `#1A3946`)
- Вокруг секции белый фон страницы (по просьбе)
- Видимой кнопки паузы нет (в макете её нет). Для WCAG 2.2.2 автоплей длиннее 5s лучше снабдить явной паузой, как у Instrument

## Фото (Unsplash License)

| Пункт | Автор | Ссылка |
|---|---|---|
| Driver Qualification Files | Igor Hnes | https://unsplash.com/photos/99qmhJmSWTw |
| Drug & Alcohol Testing | Julia Koblitz | https://unsplash.com/photos/RlOAwXt2fEA |
| MVR Monitoring | Eddy Billard | https://unsplash.com/photos/lrjKKoW42MA |
| Background Checks | Polina Kuzovkova | https://unsplash.com/photos/zxsh85YyplA |
| DOT Compliance | Esteban Zapata | https://unsplash.com/photos/f8Nb18iHdPo |
