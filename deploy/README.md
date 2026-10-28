# Деплой review-app

Схема совпадает с review-api: GitHub Actions собирает образ, передаёт его
по SSH и запускает rootless Docker пользователя `wapp` на `194.146.223.221`.
Frontend слушает только `127.0.0.1:8081`, API — `127.0.0.1:8080`.
Хостовый nginx обслуживает `review-hub.ru`:

- `/` — Node.js SSR для публичных страниц и React-клиент для личных разделов;
- `/api/v1/...` — `/v1/...` существующего review-api;
- остальные `/api/...` — 404, служебные endpoints API наружу не публикуются.

## Первоначальная настройка

1. DNS: A-запись `review-hub.ru` → `194.146.223.221`.
   Не добавляйте AAAA без настроенного IPv6 сервера.
2. В GitHub-репозитории `DryundeL/review-app` задайте Actions Secrets:
   `DEPLOY_SSH_KEY` (ключ доступа пользователя wapp); проверенные публичные SSH-ключи
   сервера сохранены в `deploy/known_hosts`. При легитимной смене ключей
   обновите этот файл после проверки отпечатка через консоль провайдера.
3. Запустите workflow на `main`. Push в `main` также запускает деплой;
   pull request выполняет только сборку с lint и проверкой TypeScript.
4. Администратор сервера устанавливает `deploy/nginx.conf` в
   `/etc/nginx/sites-available/review-hub.ru`, включает сайт ссылкой в
   `sites-enabled`, проверяет `nginx -t` и выполняет reload.
   Сначала проверьте существующие виртуальные хосты: не создавайте второй
   server-блок с тем же доменом.
5. После настройки DNS выпустите TLS-сертификат:
   `sudo certbot --nginx -d review-hub.ru --redirect`.
   Проверьте автоматическое продление: `sudo certbot renew --dry-run`.

Production API URL `/api` задаётся во время сборки Docker-образа.
Vite встраивает `VITE_*` в браузерный JavaScript: секреты туда не помещать.
Контейнер теперь запускает Node.js SSR вместо nginx. `SSR_API_BASE_URL`
задаётся во время запуска через compose; по умолчанию используется
`https://review-hub.ru/api` — существующий хостовый nginx передаёт запросы в Go API.
Поэтому этот URL должен быть доступен из контейнера. При изменении адреса укажите
фиксированный URL доступного API, без токенов, логина и пароля. `127.0.0.1:8080`
внутри контейнера относится к самому frontend, а не к Go API на хосте.

Хостовый nginx менять не требуется: порты frontend и маршрут `/api/v1/` сохранены.
Healthcheck `/healthz` проверяет процесс frontend независимо от доступности API.
HTML имеет `Cache-Control: no-store`; файлы `/assets/` кэшируются как immutable.

## Перезапуск и откат

От `wapp`, без sudo:

```sh
sh /home/wapp/apps/review-app/pull.sh
sh /home/wapp/apps/review-app/pull.sh <PREVIOUS_COMMIT_SHA>
```

Релизы и образы должны быть сохранены для отката. Деплой блокирует параллельный
запуск `pull.sh`; ссылка `current` меняется только после успешного healthcheck.
При ошибке контейнер может уже быть заменён: запускайте откат явно.
Это не zero-downtime деплой.

Служебные файлы: `/home/wapp/.local/share/review-app/{releases,incoming,current}`.
В `/home/wapp/apps/review-app` хранится только `pull.sh`.

## Проверка

```sh
curl --fail http://127.0.0.1:8081/healthz
curl --fail https://review-hub.ru/
curl --fail https://review-hub.ru/profile
curl -i https://review-hub.ru/api/v1/auth/identity
curl -i https://review-hub.ru/api/metrics
```

Запрос identity без авторизации должен вернуть ответ API об отсутствии
авторизации; `/api/metrics` должен вернуть 404, а не HTML React.
Порт frontend не открывайте в firewall; снаружи нужны только HTTP/HTTPS.

## Поисковая индексация

Главная, поиск, произведения, опубликованные обзоры и публичные профили
рендерятся на сервере и гидратируются в браузере. HTML содержит данные страницы,
canonical, title/description, Open Graph и JSON-LD `WebSite`.
Приватные профили, черновики и отсутствующие объекты получают настоящий 404.
Личные разделы получают `noindex`; API не получает входящие cookies/Authorization
SSR-запроса. При ошибке основного API сервер возвращает 503 с `Retry-After: 30`.
Запросы к API ограничены таймаутом 5 секунд; кэш разделён между SSR-запросами.

`robots.txt` разрешает обход HTML-страниц, чтобы робот мог прочитать `noindex`.
В нём заблокированы только `/api/` и `/healthz`. Личные разделы и внутренний поиск
исключены из индекса через серверные метатеги и `X-Robots-Tag`; черновики и закрытые
профили дополнительно не выдаются гостям. `robots.txt` не является механизмом защиты данных.

`/robots.txt` отдаётся статически, `/sitemap.xml` — динамический sitemap index.
Он ссылается на `/sitemap-pages.xml` и `/sitemap-{media-objects|reviews|authors}-N.xml`.
Данные берутся из `GET /v1/sitemap/:entity` полным обходом курсоров с `limit=1000`.
Отдельный XML ограничен 50 000 URL и 50 МБ; `lastmod` отсутствует по контракту API.
Готовый набор XML кэшируется в памяти процесса на 5 минут, обновляется при обращении
и публикуется целиком только после успешной генерации. При ошибке API устаревшие
данные не выдаются: sitemap отвечает 503 с `Retry-After: 30`. Внешнее кэширование
отключено через `Cache-Control: no-store`, чтобы закрытые профили и снятые с публикации
обзоры исчезали после обновления. Кэш сбрасывается при перезапуске контейнера.

Перед деплоем frontend нужно обновить backend с новым sitemap-контрактом.
В Search Console достаточно оставить существующий адрес `/sitemap.xml`.
Отсутствующие статические файлы возвращают 404.
Переход HTTP → HTTPS с кодом 301 на хостовом nginx ожидаем.

После публикации:

1. Подтвердите домен в Google Search Console и Яндекс Вебмастере.
2. Отправьте `https://review-hub.ru/sitemap.xml` в обе системы.
3. Проверьте главную через инструмент проверки URL и запросите переобход.
4. Проверьте фактические показы, запросы и индексацию после переобхода.

Название сайта и рекомендации Google:
[WebSite](https://developers.google.com/search/docs/appearance/site-names),
[сниппеты](https://developers.google.com/search/docs/appearance/snippet).

## Проверка SSR до публикации

`npm test`, `npm run build`, `npm run test:ssr` и `npm run lint`.
Docker-сборка также запускает unit- и SSR-тесты с локальным API-стабом.
`deploy/smoke-test.sh` проверяет production-контейнер без сети: healthcheck,
личный маршрут с noindex, 503 страницы и sitemap при недоступном API, robots.txt и отсутствие SPA
fallback для неизвестных assets/API путей. Для публичной страницы с данными:

```sh
curl --fail https://review-hub.ru/media-objects/<UUID>
curl --fail https://review-hub.ru/reviews/<UUID>
curl -i https://review-hub.ru/reviews/not-a-uuid
```

В ответе первых двух запросов должны быть название/текст и метаданные без запуска
JavaScript. Последний должен вернуть 404. Для черновика автор сможет войти и
прочитать его в браузере; SSR не публикует его содержимое.
