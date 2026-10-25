# Review App (frontend)

Telegram Mini App клиент на React. Go API — отдельный репозиторий.

## Стек

React 19 · TypeScript · Vite · React Router · TanStack Query · Zustand · React Hook Form + Zod · Tiptap · Radix UI

## Архитектура (FSD)

```
app → pages → widgets → features → entities → shared
```

Telegram SDK изолирован в `shared/platform` (адаптеры `telegram` / `web`).

## Запуск

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_API_BASE_URL` указывает на Go API.

## Production

Настройка `review-hub.ru` и автодеплоя описана в [deploy/README.md](deploy/README.md).

## Страница произведения и приватность

`/media-objects/:mediaId` открывается из поиска и страницы обзора. Информация
загружается через `GET /v1/media-objects/:id`, топ-5 — отдельным запросом
`GET /v1/media-objects/:id/top-reviews`. Метаданные каталога читаются из `info`.
Порядок обзоров определяет API; клиент проверяет размер списка и статус публикации.

В `/settings` доступен переключатель `isProfilePrivate`. У владельца приватного
профиля третья вкладка «Запросы» содержит входящие запросы на подписку
с принятием, отклонением и загрузкой следующих страниц. Кнопки подписки
различают `none`, `pending` и `following`; запрос не увеличивает счётчики подписок.
Уведомление `follow_request` ведёт в `/profile?tab=requests`.

Каталог, поиск, опубликованные обзоры и публичные профили доступны гостям.
Изменения, личные разделы и настройки требуют входа. Недоступный приватный
профиль отображается без его содержимого; подписка доступна через отдельный статус.
Контракты backend описаны в [frontend-api-changes.md](frontend-api-changes.md).
