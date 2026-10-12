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
