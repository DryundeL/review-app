#!/bin/sh
# Usage: pull.sh [commit-sha]  — activate a release (default: current), then prune old ones.
set -eu
[ "$(id -un)" = wapp ] || { echo 'Run as wapp only (without sudo).' >&2; exit 1; }
[ "$#" -le 1 ] || { echo 'Usage: pull.sh [commit-sha]' >&2; exit 1; }

state=/home/wapp/.local/share/review-app
keep=${KEEP_RELEASES:-3}
export DOCKER_CONTEXT=rootless

case "$keep" in ''|*[!0-9]*|0) echo 'KEEP_RELEASES must be >= 1.' >&2; exit 1 ;; esac

# One lock for both manual restarts and GitHub Actions deployments.
exec 9>"$state/deploy.lock"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }

revision=${1:-$(cat "$state/current/.release-version")}
case "$revision" in ''|*[!0-9a-f]*) echo 'Invalid commit SHA.' >&2; exit 1 ;; esac
[ "${#revision}" -eq 40 ] || { echo 'Invalid commit SHA length.' >&2; exit 1; }

release="$state/releases/$revision"
test "$(cat "$release/.release-version")" = "$revision"
export APP_VERSION="$revision"
cd "$release"
compose() { docker compose -f "$release/compose.yaml" "$@"; }

compose config --quiet
storage=${STORAGE_HOST_PATH:-/home/wapp/apps/review-api/storage}
test -d "$storage" || { echo "Storage directory $storage does not exist." >&2; exit 1; }
docker image inspect "review-app:$revision" >/dev/null

compose up -d --no-build --wait --wait-timeout 60 app
ln -sfn "$release" "$state/current.next"
mv -Tf "$state/current.next" "$state/current"
# mtime marks the last activation: it orders releases for pruning.
touch "$release"

# Keep the $keep most recently activated releases (current is always first)
# together with their images; remove everything else.
kept=$(ls -1t "$state/releases" | head -n "$keep")
for dir in $(ls -1t "$state/releases" | tail -n +"$((keep + 1))"); do
  case "$dir" in *[!0-9a-f]*) continue ;; esac
  rm -rf "${state:?}/releases/$dir"
done
for tag in $(docker image ls review-app --format '{{.Tag}}'); do
  case "$tag" in *[!0-9a-f]*) continue ;; esac
  [ "${#tag}" -eq 40 ] || continue
  printf '%s\n' "$kept" | grep -qx "$tag" && continue
  docker image rm "review-app:$tag" >/dev/null || echo "Cannot remove review-app:$tag" >&2
done
docker image prune -f >/dev/null

compose ps
