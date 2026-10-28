#!/bin/sh
set -eu
image=${1:?Image required}
container=$(docker run -d --network none --read-only --cap-drop ALL \
  -e SSR_API_BASE_URL=http://127.0.0.1:1 \
  --security-opt no-new-privileges:true --tmpfs /tmp:size=16m,mode=1777 "$image")
trap 'docker rm -f "$container" >/dev/null' EXIT
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
