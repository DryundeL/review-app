#!/bin/sh
set -eu
image=${1:?Image required}
fixture=$(mktemp -d)
container=
trap 'if [ -n "$container" ]; then docker rm -f "$container" >/dev/null; fi; rm -rf "$fixture"' EXIT
chmod 755 "$fixture"
cp public/favicon.png "$fixture/test.png"
container=$(docker run -d --network none --read-only --cap-drop ALL \
  --mount "type=bind,source=$fixture,target=/app/storage,readonly" \
  -e SSR_API_BASE_URL=http://127.0.0.1:1 \
  --security-opt no-new-privileges:true --tmpfs /tmp:size=16m,mode=1777 "$image")
attempt=0
until docker exec "$container" wget -q -O /dev/null http://127.0.0.1:8080/healthz; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 10 ]; then
    docker logs "$container"
    exit 1
  fi
  sleep 1
done
docker exec "$container" node server/smoke.mjs
test "$(docker inspect "$container" --format '{{range .Mounts}}{{if eq .Destination "/app/storage"}}{{.RW}}{{end}}{{end}}')" = false
