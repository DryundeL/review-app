# Деплой review-app

Схема совпадает с review-api: GitHub Actions собирает образ, передаёт его
по SSH и запускает rootless Docker пользователя `wapp` на `194.146.223.221`.
Frontend слушает только `127.0.0.1:8081`, API — `127.0.0.1:8080`.
Хостовый nginx обслуживает `review-hub.ru`:

- `/` — React SPA, включая прямое открытие вложенных страниц;
- `/api/v1/...` — `/v1/...` существующего review-api;
- остальные `/api/...` — 404, служебные endpoints API наружу не публикуются.

## Первоначальная настройка

1. DNS: A-запись `review-hub.ru` → `194.146.223.221`.
   Не добавляйте AAAA без настроенного IPv6 сервера.
2. В GitHub-репозитории `DryundeL/review-app` задайте Actions Secrets:
   `SERVER_SSH_KEY` (ключ доступа пользователя wapp) ; проверенные публичные SSH-ключи
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
Серверный `.env` для этого статического приложения не требуется.

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
