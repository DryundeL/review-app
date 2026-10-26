# API для фронтенда: обзоры и подписки

Базовый путь: `/v1`.  
JSON, поля в **camelCase**.

Заголовок авторизации (где в таблице Auth = да):

```http
Authorization: Bearer <jwt>
```

`limit` в списках: optional query, default `20`, максимум `50`. Невалидный → `20`.

---

## Типы

### Review

```ts
type ReviewStatus = "draft" | "published";

type ReviewBlock = {
  id: string;       // uuid
  position: number; // 1..10
  title: string;
  body: string;
};

type ReviewAuthor = {
  id: string;       // uuid, === authorId
  username: string; // ник TG без @; может быть ""
  isFollowing: boolean;
};

type Review = {
  id: string;
  authorId: string;
  author: ReviewAuthor; // тот же shape, что в feed
  mediaObjectId: string;
  title: string;
  rating: number; // 1..10
  status: ReviewStatus;
  blocks: ReviewBlock[];
  likesCount: number;
  dislikesCount: number;
  viewsCount: number;
};

type ReviewList = { items: Review[] };
```

### Follow list item

```ts
type FollowItem = {
  userId: string;      // uuid другого пользователя
  createdAt: string;   // ISO timestamptz
};

type FollowList = { items: FollowItem[] };
```

### Ошибка API

```ts
type ApiError = {
  code: string;
  message: string;
  details?: { field?: string };
};
```

---

## Правила для UI

| Правило | Что делать на фронте |
|---|---|
| Один published-обзор на тайтл | Если повторно публикуешь тот же `mediaObjectId` → `409 CONFLICT` |
| Блоков максимум 10 | Валидировать до отправки |
| Title обзора | 1…256 символов |
| Title блока | 1…50 |
| Body блока | 1…500 Unicode-кодовых точек текста при POST/PATCH; теги и атрибуты не учитываются, HTML-сущности декодируются; без лимита при чтении |
| Текст блока | HTML с разрешённым форматированием; DOMPurify удаляет опасные теги и атрибуты; сервер также обязан очищать HTML |
| `published` | нужен ≥1 блок |
| Draft | виден только автору; чужой GET → `404` |
| Блоки при PATCH | приходят целиком — сервер **заменяет** весь список |
| Голос | один на пользователя: like / dislike; повторный PUT перезаписывает |
| Просмотр | `PUT .../view` можно звать каждый раз; учтётся один раз |
| Self-follow | нельзя |

Справочники статусов: `GET /v1/review-statuses` → `publication: draft | published`.

---

## Обзоры

### Создать

`POST /v1/reviews` — Auth

```json
{
  "mediaObjectId": "uuid",
  "title": "Мой обзор",
  "rating": 8,
  "status": "draft",
  "blocks": [
    { "title": "Плюсы", "body": "Сюжет и темп 🙂" }
  ]
}
```

- `mediaObjectId` — обязателен  
- `status` — optional, default `draft`  
- `blocks` — optional (пустой ок для draft)

**201** → `Review` (включая `author: { id, username, isFollowing }`)  
**422** / **409** — см. ошибки ниже

---

### Обновить

`PATCH /v1/reviews/:id` — Auth (только автор)

Тело как у create, но:

- `mediaObjectId` **не меняется** (можно не слать)
- если `status` не передан — остаётся как был
- `blocks` — полный новый список

**200** → `Review` (включая `author`, как в feed)  
**403** — не свой  
**404** — нет обзора

---

### Получить один

`GET /v1/reviews/:id` — Auth

**200** → `Review` с `author: { id, username, isFollowing }` (тот же shape, что list-item в feed)  
**404** — нет / чужой draft

---

### Список по тайтлу

`GET /v1/reviews?mediaObjectId=<uuid>&limit=20` — без auth

Только `published`.

**200** → `ReviewList`

---

### Мои обзоры (ЛК)

`GET /v1/profile/reviews?limit=20` — Auth

Все свои: `draft` + `published`.

**200** → `ReviewList`

---

### Обзоры пользователя

`GET /v1/profiles/:id/reviews?limit=20` — без auth

`:id` — uuid пользователя. Только `published`.

**200** → `ReviewList`

---

### Лайк / дизлайк

`PUT /v1/reviews/:id/vote` — Auth

```json
{ "isLike": true }
```

`true` — лайк, `false` — дизлайк. Только для `published`.

**204** пустое тело  
**404** — нет / не published

> Снять голос отдельным DELETE пока нельзя.

---

### Просмотр

`PUT /v1/reviews/:id/view` — Auth

Тела нет. Звать при открытии карточки (published).

**204**  
**404** — нет / не published

Счётчик `viewsCount` растёт только на первый просмотр этим юзером.

---

## Подписки

### Подписаться

`PUT /v1/follows/:userId` — Auth

`:userId` — uuid пользователя.

**204**  
**409** — уже подписан  
**422** — сам на себя / нет пользователя

---

### Отписаться

`DELETE /v1/follows/:userId` — Auth

**204**  
**404** — подписки не было

---

### На кого я подписан

`GET /v1/follows/following?limit=20` — Auth

**200** → `FollowList` (`userId` = followee)

---

### Кто подписан на меня

`GET /v1/follows/followers?limit=20` — Auth

**200** → `FollowList` (`userId` = follower)

> В списках только `userId` + `createdAt`. Профили подтягивать отдельно (`GET /v1/profile` — свой; чужой профиль по id пока отдельного публичного эп нет).

---

## Сводка эндпоинтов

| Method | Path | Auth | Ответ |
|---|---|---|---|
| `POST` | `/v1/reviews` | да | 201 Review |
| `PATCH` | `/v1/reviews/:id` | да | 200 Review |
| `GET` | `/v1/reviews/:id` | да | 200 Review |
| `GET` | `/v1/reviews?mediaObjectId=` | нет | 200 ReviewList |
| `GET` | `/v1/profile/reviews` | да | 200 ReviewList |
| `GET` | `/v1/profiles/:id/reviews` | нет | 200 ReviewList |
| `PUT` | `/v1/reviews/:id/vote` | да | 204 |
| `PUT` | `/v1/reviews/:id/view` | да | 204 |
| `PUT` | `/v1/follows/:userId` | да | 204 |
| `DELETE` | `/v1/follows/:userId` | да | 204 |
| `GET` | `/v1/follows/following` | да | 200 FollowList |
| `GET` | `/v1/follows/followers` | да | 200 FollowList |

Рядом (уже было): `GET /v1/profile`, `GET /v1/review-types`, `GET /v1/review-statuses`, каталог `GET /v1/media-objects`.

---

## Коды ошибок

| HTTP | code | Когда |
|---|---|---|
| 401 | — | нет/просрочен JWT |
| 403 | `FORBIDDEN` | PATCH чужого обзора |
| 404 | `NOT_FOUND` | нет сущности / чужой draft / unfollow без связи |
| 409 | `CONFLICT` | второй published на тот же тайтл; уже подписан |
| 422 | `VALIDATION_ERROR` | поля, лимиты, `<>` в тексте, self-follow |

В `details.field` часто: `title`, `rating`, `status`, `blocks`, `mediaObjectId`, `followeeId`, `limit`.

---

## Типичные сценарии UI

1. **Редактор обзора** → `POST` draft → правки `PATCH` → `PATCH` с `"status":"published"`.
2. **Карточка тайтла** → `GET /reviews?mediaObjectId=...`.
3. **Открыл обзор** → `GET /reviews/:id` + `PUT .../view` + кнопки `PUT .../vote`.
4. **Мой профиль** → `GET /profile/reviews` (видишь черновики).
5. **Чужой профиль** → `GET /profiles/:id/reviews` + `PUT /follows/:id`.
6. **Лента подписок** (позже feed) — пока только списки `following` / `followers`.
