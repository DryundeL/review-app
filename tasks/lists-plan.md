# Топы и подборки — план реализации

> **Для агентов:** выполнять через superpowers:subagent-driven-development или superpowers:executing-plans, по задачам. Шаги — чекбоксы.

**Цель:** шаблоны и результаты (тир-лист, топ, подборка): разделы, профиль, «Мои», страницы просмотра, редакторы с автосохранением, жалобы. Админка вне плана.

**Архитектура:** FSD как в проекте. `entities/list` — типы, zod-парсеры, API и чистая логика раскладки. `features/upload-media`, `features/list-autosave`, `features/report-list` — сценарии. Страницы в `pages/*`, общие карточки и доска раскладки в `widgets/*`. Серверное состояние — react-query, пагинация — `useInfiniteQuery` по `nextCursor`.

**Стек:** React 19, react-router 7, @tanstack/react-query 5, zod 4, node:test. Новые зависимости не добавляем.

**Спека:** `../review-api/docs/frontend-lists.md` (разделы 1–6; раздел 7 «Модерация» не делаем), загрузка картинок — `../review-api/docs/frontend-media.md`.

## Глобальные ограничения

- Все маршруты API начинаются с `/v1`. Запись — с `Authorization`, чтение — `auth` по умолчанию (гость тоже читает).
- Файлы, которые тестирует `node --test`, импортируют только относительными путями с `.ts` (как `parseReports.ts`), без `@/`. Новые каталоги тестов добавить в скрипт `test` в `package.json`.
- Все ответы проходят zod-парсер; невалидный ответ — `unexpectedResponseError()`.
- Картинки (`imageUrl`, `coverUrl`, `photoUrl`) пропускать через `storageImageUrl`; не прошедшие — плейсхолдер.
- UUID в пути проверять до запроса (как `assertUuid` в `reportsApi.ts`), иначе 404 без сети.
- Поля владельца (`revision`, `status`, `visibility`, `moderation`, `createdAt`, `updatedAt`, `imageId`) в парсере необязательны; «я автор» = `revision !== undefined`.
- Лимиты: `title` шаблона/результата ≤150, `description` ≤2000, тиров 1–10, имя тира ≤30, `color` `^#[0-9a-fA-F]{6}$`, элементов ≤50, название элемента ≤150, `q` ≤100, `limit` 1–50 (по умолчанию 20), файл ≤307 200 байт, JPEG/PNG/WebP.
- Тиры по умолчанию (S `#ff7f7f` … D `#bfff7f`) выдаёт сервер при создании, клиент их не хардкодит. Новый тир в редакторе клиент создаёт с цветом `#7fbfff`.
- Ключи запросов: списки — `["lists", scope, filters]`, объекты — `["list-template", id]`, `["list-result", id]`.
- Автосохранение черновика: debounce 1500 мс, один запрос в полёте, `revision` из последнего успешного ответа.
- Тексты интерфейса — по-русски, как в остальном приложении.

## Решения и допущения

- **Навигация.** Раздел `/lists` с вкладками «Шаблоны» / «Топы пользователей» (`?tab=results`). Ссылка — в `secondaryLinks` `BottomNavigation` («Топы»). «Мои» — `/my-lists` (вкладки + фильтр `status`). В профиле — вкладка «Топы» с двумя подсписками.
- **Маршруты фронта:** `/lists`, `/list-templates/:id`, `/list-results/:id` — публичные (SSR). `/my-lists`, `/list-templates/:id/edit`, `/list-results/:id/edit` — client-only (lazy). Создание шаблона: кнопка «Создать шаблон» на `/my-lists` → `POST` → переход в редактор; отдельный маршрут `/new` не нужен.
- **Раскладка без drag-and-drop.** Библиотеки DnD нет, нативный HTML5 DnD не работает на тач-экранах Mini App. Делаем «выбрал элемент → тапнул тир/место», плюс кнопки ↑/↓ и «Убрать». Это доступно с клавиатуры и работает везде. DnD — отдельной итерацией, если понадобится.
- **Автосохранение** — новый класс `ListAutosave`, а не правка `DraftSession` обзоров: у обзора своя логика (`create`+`PUT`, пауза 2500 мс), общий знаменатель мал, а риск сломать редактор обзоров реален.
- **Жалобы** — отдельная фича `report-list`, переиспользует `listReportReasons` и `FALLBACK_REPORT_REASONS` (экспортировать их из `features/report-review/index.ts`).
- **Sitemap** для списков в этот план не входит.

## Фокус ревью

1. **Гость получает объект без полей владельца** → парсер не падает, кнопки редактирования и статусы не показываются, «Пожаловаться» показывается.
2. **409 `REVISION_CONFLICT` во время набора** → локальные правки не теряются; автосохранение останавливается до выбора «Загрузить актуальную» / «Перезаписать своей».
3. **Результат по удалённому/снятому шаблону** (`template.id` нет, `canCreateOwn: false`) → название и автор без ссылки, кнопки «Составить свой» нет.
4. **Смена фильтра или вкладки при загруженных страницах** → старый `cursor` не уходит в новый запрос (фильтры входят в `queryKey`).
5. **Уход из редактора опубликованного объекта с несохранёнными правками** → предупреждение (`beforeunload` + блокировка перехода роутера).

---

### Task 1: `index` в деталях ошибки и загрузка картинок

**Файлы:**
- Изменить: `src/shared/api/errors.ts` (тип `details` + `index?: number`), `src/shared/api/authPayload.ts:177` (`index: z.number().int().min(0).optional()`)
- Изменить: `src/shared/api/client.ts` — опция `formData?: FormData`: тело уходит как есть, `Content-Type` не ставится (boundary задаёт браузер)
- Создать: `src/features/upload-media/api/uploadImage.ts`, `src/features/upload-media/model/validateImageFile.ts`, `src/features/upload-media/index.ts`
- Тесты: `src/shared/api/boundary.test.ts` (дополнить), `src/features/upload-media/api/uploadImage.test.ts`, `src/features/upload-media/model/validateImageFile.test.ts`

**Интерфейсы:**
- Производит: `ApiError.details?: { field?: string; reason?: string; index?: number }`
- Производит: `uploadImage(file: File, signal?: AbortSignal): Promise<UploadedImage>`, `type UploadedImage = { id: string; url: string; width: number; height: number }`
- Производит: `validateImageFile(file: { size: number; type: string }): string | null` — текст ошибки или `null`

- [ ] Тест: `errorFromPayload(422, {error:{code:"VALIDATION_ERROR",message:"x",details:{field:"items.title",reason:"required",index:2}}}).details` → `{field:"items.title",reason:"required",index:2}`.
- [ ] Тест `uploadImage`: мок `fetch` проверяет URL `/v1/media/images`, `init.body instanceof FormData` с частью `file`, заголовок `Content-Type` отсутствует; ответ 201 парсится; `url` не из `/storage/` → `unexpectedResponseError`.
- [ ] Тест `validateImageFile`: 307 200 байт `image/png` → `null`; 307 201 → «Файл больше 300 КБ»; `image/gif` → «Поддерживаются JPEG, PNG и WebP».
- [ ] Прогнать тесты — падают. Реализовать. Прогнать — проходят. Добавить `src/features/upload-media/**/*.test.ts` в `npm test`.
- [ ] Коммит `feat(upload-media): загрузка картинок и index в деталях ошибок`.

### Task 2: `entities/list` — типы и парсеры

**Файлы:**
- Создать: `src/entities/list/model/types.ts` — типы из раздела 2 спеки дословно (`Format`, `Status`, `Visibility`, `Author`, `Tier`, `Item`, `Template`, `Entry`, `Result`, `Card`, `ListPage`, `ListReport`)
- Создать: `src/entities/list/api/parseLists.ts`, тест `parseLists.test.ts`

**Интерфейсы:**
- Производит: `parseTemplateText(text): Template`, `parseResultText(text): Result`, `parseListPageText(text): ListPage`, `parseListReportText(text): ListReport`
- Производит: `isOwnerView(obj: { revision?: number }): boolean`

- [ ] Тесты:
  - гостевой шаблон без owner-полей парсится, `isOwnerView` → `false`;
  - `tiers` с `color: "red"` → бросает;
  - `imageUrl: "https://evil/x.png"` → поле отбрасывается (не ошибка), `"/storage/images/a.webp"` сохраняется;
  - `Result` без `template.id` и `canCreateOwn: false` парсится;
  - `ListPage` без `nextCursor` → `nextCursor: undefined`;
  - неизвестный `format` → бросает.
- [ ] Красный → реализация (zod, `storageImageUrl` через `.transform`) → зелёный. Добавить `src/entities/list/**/*.test.ts` в `npm test`.
- [ ] Коммит `feat(lists): типы и парсеры шаблонов и результатов`.

### Task 3: `entities/list` — API

**Файлы:**
- Создать: `src/entities/list/api/listsApi.ts`, `src/entities/list/api/listQuery.ts`, тест `listQuery.test.ts`, `src/entities/list/index.ts`

**Интерфейсы:**
- Производит `listQuery.ts`:
  - `type ListScope = { kind: "templates" | "results"; owner: "all" | { userId: string } | "me" }`
  - `type ListFilters = { q?: string; type?: string; format?: Format; status?: "draft" | "published" | "unlisted" | "hidden"; limit?: number; cursor?: string }`
  - `listPath(scope): string` — `/v1/list-templates`, `/v1/profiles/:id/list-results`, `/v1/profile/list-templates`…
  - `listQueryParams(scope, filters): ApiQuery` — пустые и пробельные значения выкидываются, `q` обрезается до 100, `status` только для `"me"`, `q/type/format` только не для `"me"`, `limit` зажимается в 1–50
- Производит `listsApi.ts` (все через `apiClient`, UUID проверяется):
  - `fetchLists(scope, filters, signal): Promise<ListPage>`
  - `fetchTemplate(id, signal)`, `fetchResult(id, signal)`
  - `createTemplate({ typeCode, format?, title? })`, `saveTemplate(id, TemplateInput)`, `createResult(templateId)`, `saveResult(id, ResultInput)`
  - `publishList(kind, id, revision, visibility)`, `unpublishList(kind, id)`, `setListVisibility(kind, id, visibility)`, `copyList(kind, id)`, `deleteList(kind, id): Promise<void>`
  - `refreshItemFromCatalog(templateId, itemId, revision): Promise<Template>`
  - `reportList(kind, id, reasonCode): Promise<ListReport>`
  - `TemplateInput` и `ResultInput` — тела `PUT` из 3.4 и 3.5 спеки; `kind: "templates" | "results"`

- [ ] Тесты `listQuery`: `{owner:"me"}` + `q` → `q` отброшен; `limit: 500` → `50`; `q: "  "` → нет ключа; `{owner:{userId:"bad"}}` → бросает `ApiError` 404.
- [ ] Красный → реализация → зелёный.
- [ ] `npm run build` без ошибок типов. Коммит `feat(lists): API модуля lists`.

### Task 4: раскладка и готовность к публикации (чистая логика)

**Файлы:**
- Создать: `src/entities/list/model/layout.ts`, `src/entities/list/model/readiness.ts`, тесты рядом

**Интерфейсы:**
- Производит `layout.ts`:
  - `type Layout = { groups: Map<string | null, string[]>; unplaced: string[] }` — ключ `null` для `ranked`/`collection`
  - `layoutFromResult(result: Result): Layout` — неразложенные = `items` без записи в `entries`, в порядке `items`
  - `placeItem(layout, itemId, groupKey, index?): Layout` — снимает с прежнего места, вставляет (по умолчанию в конец)
  - `unplaceItem(layout, itemId): Layout`, `moveWithinGroup(layout, itemId, delta: -1 | 1): Layout`
  - `entriesFromLayout(layout, tiers: Tier[]): Entry[]` — позиции `1..n` в каждой группе, канонический порядок: тиры сверху вниз
- Производит `readiness.ts`:
  - `templatePublishIssues(t: TemplateInput): { field: string; index?: number }[]` — нет названия; нет элементов; у элемента нет `title` или картинки; у тира пустое имя
  - `resultPublishIssues(title: string, entries: Entry[]): { field: string }[]`

- [ ] Тесты:
  - `entriesFromLayout` после `placeItem` в тир B и затем A → позиции в каждом тире с 1, без пропусков, A раньше B;
  - повторный `placeItem` того же элемента не дублирует его;
  - `moveWithinGroup` на краю не меняет layout;
  - `layoutFromResult` игнорирует `entries` с `itemId`, которого нет в `items`;
  - `templatePublishIssues` для элемента без картинки → `{field:"items.image", index}`.
- [ ] Красный → реализация (immutable, новые массивы) → зелёный. Коммит `feat(lists): модель раскладки и проверки публикации`.

### Task 5: автосохранение `ListAutosave`

**Файлы:**
- Создать: `src/features/list-autosave/model/listAutosave.ts`, тест `listAutosave.test.ts`, `src/features/list-autosave/index.ts`, `src/features/list-autosave/useListAutosave.ts`

**Интерфейсы:**
- Производит:
  ```ts
  type AutosaveState<D, S> = { draft: D; saved: S; dirty: boolean; saving: boolean;
    conflict: boolean; error: ApiError | null };
  class ListAutosave<D, S extends { revision?: number }> {
    constructor(saved: S, toDraft: (s: S) => D,
      save: (revision: number, draft: D) => Promise<S>,
      opts: { auto: boolean; delayMs?: number /* 1500 */ });
    subscribe(fn): () => void; snapshot(): AutosaveState<D, S>;
    change(patch: Partial<D>): void;   // auto → debounce
    flush(): Promise<void>;            // кнопка «Сохранить» и перед publish
    reload(fresh: S): void;            // «Загрузить актуальную»
    overwrite(fresh: S): Promise<void>;// «Перезаписать своей»: revision из fresh, повтор PUT с локальным draft
    dispose(): void;
  }
  function useListAutosave<D, S>(session: ListAutosave<D, S>): AutosaveState<D, S> // useSyncExternalStore
  ```
- `auto` = `saved.status === "draft"`. Для опубликованного `change` только помечает `dirty`.

- [ ] Тесты (`mock.timers`):
  - три `change` за 1 с → один `save` через 1500 мс после последнего;
  - `change` во время запроса → второй `save` только после ответа первого, с `revision` из ответа;
  - ответ на старую версию draft не затирает новые локальные правки (`draft` остаётся, `dirty: true`);
  - 409 `REVISION_CONFLICT` → `conflict: true`, дальнейшие `change` не шлют запросы; `overwrite(fresh)` шлёт `PUT` с `fresh.revision` и локальным draft;
  - `auto: false` → `change` не шлёт запрос, `flush` шлёт;
  - 422 → `error` с `details`, автосохранение ждёт следующего `change`.
- [ ] Красный → реализация → зелёный. Добавить в `npm test`. Коммит `feat(lists): автосохранение с ревизиями`.

### Task 6: карточки и разделы `/lists`

**Файлы:**
- Создать: `src/widgets/ListCard/` (`ListCard.tsx`, `.css`, `index.ts`), `src/widgets/ListsFeed/ListsFeed.tsx` (бесконечный список по `scope` + `filters`, «Показать ещё», пустое состояние), `src/pages/ListsPage/`
- Изменить: `src/app/router.tsx`, `src/shared/lib/publicRoutes.ts` (+ тест в `publicRoutes.test.ts`), `src/widgets/BottomNavigation/BottomNavigation.tsx` (`secondaryLinks` + «Топы»)

**Интерфейсы:**
- Потребляет: `fetchLists`, `ListScope`, `ListFilters`, `Card`
- Производит: `<ListsFeed scope filters />`, `queryKey: ["lists", scope, filters]` без `cursor`; `<ListCard card href />` — для «Моих» бейджи `status`/`visibility`/`moderation`

- [ ] Тест `publicRoutes`: `/lists`, `/list-templates/<uuid>`, `/list-results/<uuid>` — публичные; `/my-lists`, `/list-templates/x/edit` — client-only, не публичные.
- [ ] Реализовать: вкладки через `?tab=`, фильтры `q` (через `useDebouncedValue`), `type` (из `GET /v1/review-types`, переиспользовать запрос `["review-types"]`), `format` — в search params.
- [ ] `npm test && npm run lint && npm run build`; вручную: смена фильтра сбрасывает подгруженные страницы, последняя страница без кнопки «Показать ещё».
- [ ] Коммит `feat(lists): раздел топов и шаблонов`.

### Task 7: «Мои» и вкладка в профиле

**Файлы:**
- Создать: `src/pages/MyListsPage/` (вкладки, фильтр `status` с подписями «Все / Черновики / Опубликованные / По ссылке / Скрытые модератором», кнопка «Создать шаблон»)
- Изменить: `src/pages/ProfilePage/ui/ProfilePage.tsx` — вкладка `tab=lists`: два `ListsFeed` с `owner: { userId }` (свой профиль — `owner: "me"` не нужен, только опубликованное); 404 → «Списки недоступны: профиль закрыт»
- Изменить: `src/app/router.tsx` (lazy `MyListsPage`), `publicRoutes.ts`

- [ ] «Создать шаблон»: модалка с выбором типа и формата → `createTemplate` → `navigate("/list-templates/:id/edit")`. 422 `QUOTA_EXCEEDED` → «Достигнут лимит: 50 шаблонов».
- [ ] `npm run lint && npm run build`; вручную гостем `/my-lists` → вход.
- [ ] Коммит `feat(lists): мои списки и вкладка в профиле`.

### Task 8: страницы шаблона и результата

**Файлы:**
- Создать: `src/widgets/ListBoard/` — только отрисовка: `tiers` (строки тиров с цветом + неразложенные не показываем), `ranked` (нумерованный список), `collection` (сетка); элемент ищется по `itemId` через `Map`
- Создать: `src/features/manage-list/ui/OwnerActions.tsx` — «Редактировать», «Опубликовать» (с выбором видимости), «Снять», «Видимость», «Копировать», «Удалить» (подтверждение в `Modal`); после мутации — `queryClient.setQueryData` объектом из ответа и инвалидация `["lists"]`
- Создать: `src/features/report-list/` — копия поведения `ReportReviewControl` для `reportList(kind, id, reason)`; 409 `ALREADY_REPORTED` → «Жалоба уже отправлена», 403 → скрыть
- Создать: `src/pages/ListTemplatePage/`, `src/pages/ListResultPage/`
- Изменить: `src/features/report-review/index.ts` — экспорт `listReportReasons`, `FALLBACK_REPORT_REASONS`; `router.tsx`

- [ ] Шаблон: «Составить свой топ» при `canCreateResult`; гостю — переход ко входу; `createResult` → `/list-results/:id/edit`; 409 → «Сначала опубликуйте шаблон», 403 `HIDDEN_BY_MODERATOR` → «Шаблон скрыт модератором». `moderation: "hidden"` → плашка «Скрыто модератором». `status: "draft"` → плашка «Черновик».
- [ ] Результат: ссылка на шаблон и «Составить свой» только при `canCreateOwn && template.id`; иначе название и автор текстом.
- [ ] Кнопка «Пожаловаться» не рендерится при `isOwnerView`.
- [ ] `usePageMeta` с `title` и `coverUrl`; 404 → «Не найдено» без различия причин.
- [ ] `npm run lint && npm run build && npm run test:ssr`; вручную: гость, автор, чужой пользователь, черновик по прямой ссылке у чужого → 404.
- [ ] Коммит `feat(lists): страницы шаблона и результата`.

### Task 9: редактор шаблона

**Файлы:**
- Создать: `src/pages/ListTemplateEditorPage/` и внутри `ui/TiersEditor.tsx`, `ui/ItemsEditor.tsx`, `ui/CatalogItemPicker.tsx` (поиск через `fetchSearch` из `entities/search`, фильтр по `typeCode`), `ui/ConflictDialog.tsx`, `model/templateDraft.ts` (+ тест)
- Изменить: `router.tsx`, `src/shared/hooks/` — `useUnsavedChangesGuard(dirty: boolean)` (`beforeunload` + `useBlocker`)

**Интерфейсы:**
- Потребляет: `ListAutosave`, `saveTemplate`, `uploadImage`, `validateImageFile`, `templatePublishIssues`, `refreshItemFromCatalog`
- Производит `templateDraft.ts`: `toTemplateInput(t: Template): TemplateInput` — существующие тиры и элементы с `id`, у элемента всегда `title`, `imageId` только если был заменён; `fieldErrorKey(details): string` — `"items.title:2"` для подсветки

- [ ] Тест `toTemplateInput`: существующий элемент несёт `id` и `title`, без `imageId`; новый элемент из каталога — только `mediaObjectId`; для `ranked` → `tiers: []`.
- [ ] Красный → реализация → зелёный.
- [ ] UI: тиры (добавить ≤10 с цветом `#7fbfff`, переименовать ≤30, цвет `<input type="color">`, ↑/↓, удалить; не показывать для `ranked`/`collection`); элементы (≤50, из каталога / своя картинка, переименовать ≤150, ↑/↓, удалить, «Обновить из каталога» только у `mediaObjectId`); `typeCode` и `format` заблокированы при `firstPublishedAt`.
- [ ] Ошибки 422: подсветка по `details.field` + `details.index`, сообщения по `reason` (`required`, `too_long`, `too_many`, `duplicate`, `immutable`, `invalid`, `type_mismatch`).
- [ ] Конфликт: `ConflictDialog` с «Загрузить актуальную версию» / «Перезаписать своей».
- [ ] Публикация: `flush()` → `templatePublishIssues` → `publishList` с текущей `revision`. Опубликованный — кнопка «Сохранить» + `useUnsavedChangesGuard`.
- [ ] `npm test && npm run lint && npm run build`; вручную: две вкладки → конфликт; загрузка файла 400 КБ отклоняется до отправки.
- [ ] Коммит `feat(lists): редактор шаблона`.

### Task 10: редактор результата

**Файлы:**
- Создать: `src/pages/ListResultEditorPage/` (`ui/LayoutEditor.tsx` поверх `ListBoard` в режиме редактирования + блок «Неразложенные»)
- Изменить: `router.tsx`

**Интерфейсы:**
- Потребляет: `layoutFromResult`, `placeItem`, `unplaceItem`, `moveWithinGroup`, `entriesFromLayout`, `resultPublishIssues`, `ListAutosave`, `saveResult`, `ConflictDialog`, `useUnsavedChangesGuard`

- [ ] Взаимодействие: тап по элементу выделяет его (`aria-pressed`), тап по тиру/списку кладёт в конец; у разложенного — ↑/↓ и «Убрать». Всё доступно с клавиатуры.
- [ ] Поля `title`, `description`; каждое изменение раскладки → `session.change({ entries })`.
- [ ] Ошибки `entries.itemId|tierId|position` → тост «Раскладка устарела, обновите страницу» (не должно случаться, т.к. id берутся из снимка).
- [ ] Публикация: «Нужно название и хотя бы один разложенный элемент»; 403 → «Шаблон скрыт модератором».
- [ ] `npm run lint && npm run build`; вручную: тир-лист, топ и подборка; обложка в карточке после публикации совпадает с таблицей из раздела 4 спеки.
- [ ] Коммит `feat(lists): редактор результата`.

### Task 11: сессия и кеш

**Файлы:**
- Изменить: место, где обрабатывается вход/выход (`src/features/auth/model/authController.ts` или `refreshHome.ts`)

- [ ] При смене сессии `queryClient.removeQueries({ queryKey: ["lists"] })` и для `["list-template"]`, `["list-result"]` — ответы зависят от входа (`Vary: Authorization`).
- [ ] Вручную: открыть свой черновик, выйти → 404; войти обратно → открывается.
- [ ] `npm test && npm run test:ssr && npm run lint && npm run build`. Коммит `feat(lists): сброс кеша списков при смене сессии`.
