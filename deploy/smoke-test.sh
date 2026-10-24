#!/bin/sh
set -eu
image=${1:?Image required}
container=$(docker run -d --network none --read-only --cap-drop ALL \
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
docker exec "$container" sh -ec '
  wget -q -O /tmp/index.html http://127.0.0.1:8080/
  wget -q -O /tmp/profile.html http://127.0.0.1:8080/profile
  cmp /tmp/index.html /tmp/profile.html
  for path in robots.txt sitemap.xml; do
    response=$(wget -S -O "/tmp/$path" "http://127.0.0.1:8080/$path" 2>&1)
    printf "%s\n" "$response" | grep -q "HTTP/1.1 200"
    if printf "%s\n" "$response" | grep -qi "location:"; then exit 1; fi
  done
  grep -q "User-agent:" /tmp/robots.txt
  grep -q "<urlset" /tmp/sitemap.xml
  for path in /assets/missing.js /api/v1/auth/identity /ribots.txt /missing.xml; do
    response=$(wget -S -O /dev/null "http://127.0.0.1:8080$path" 2>&1) && exit 1
    printf "%s\n" "$response" | grep -q "HTTP/1.1 404"
  done
'
