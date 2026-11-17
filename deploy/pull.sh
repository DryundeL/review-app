#!/bin/sh
# Usage: pull.sh [commit-sha]  — activate a release (default: current).
# Only the current and previous releases and their images are kept.
set -eu
[ "$(id -un)" = wapp ] || { echo 'Run as wapp only (without sudo).' >&2; exit 1; }
[ "$#" -le 1 ] || { echo 'Usage: pull.sh [commit-sha]' >&2; exit 1; }

project=review-app
share=/home/wapp/.local/share
state="$share/$project"
export DOCKER_CONTEXT=rootless

die() { echo "$*" >&2; exit 1; }
valid_sha() {
  case "$1" in ''|*[!0-9a-f]*) return 1 ;; esac
  [ "${#1}" -eq 40 ]
}
release_of() {
  [ -L "$state/$1" ] || return 0
  sha=$(basename "$(readlink "$state/$1")")
  valid_sha "$sha" || die "Invalid $1 release reference."
  echo "$sha"
}

# Shared with review-api. activate.sh already holds it during CI deploys.
if [ "${REVIEW_DEPLOY_LOCKED:-}" != 1 ]; then
  exec 9>>"$share/review-deploy.lock"
  flock -w 900 9 || die 'Timed out waiting for the Review deployment lock.'
fi

revision=${1:-$(release_of current)}
valid_sha "$revision" || die 'Invalid commit SHA.'
release="$state/releases/$revision"
[ "$(cat "$release/.release-version")" = "$revision" ] || die "Release $revision is not installed."
docker image inspect "$project:$revision" >/dev/null 2>&1 || die "Image $project:$revision is not loaded."

storage=${STORAGE_HOST_PATH:-/home/wapp/apps/review-api/storage}
test -d "$storage" || die "Storage directory $storage does not exist."

export APP_VERSION="$revision"
cd "$release"
compose() { docker compose -f "$release/compose.yaml" "$@"; }
compose config --quiet
compose up -d --no-build --pull never --wait --wait-timeout 180 app

set_ref() {
  ln -sfn "$state/releases/$2" "$state/$1.next"
  mv -Tf "$state/$1.next" "$state/$1"
}
current=$(release_of current)
previous=$(release_of previous)
if [ -n "$current" ] && [ "$current" != "$revision" ]; then
  previous=$current
  set_ref previous "$previous"
fi
set_ref current "$revision"

# Keep only the current and previous releases and images. Docker refuses to
# remove an image used by a container, so a failed removal is only reported.
for dir in "$state"/releases/*; do
  name=${dir##*/}
  case "$name" in "$revision"|"$previous") continue ;; esac
  if valid_sha "$name"; then rm -rf -- "$dir"; fi
done
docker image ls --format '{{.Tag}}' "$project" | while read -r tag; do
  case "$tag" in "$revision"|"$previous"|'<none>') continue ;; esac
  docker image rm "$project:$tag" >/dev/null || echo "Warning: kept $project:$tag." >&2
done
docker image prune -f >/dev/null || echo 'Warning: dangling image cleanup failed.' >&2

# Uploads left by failed deployments.
[ ! -d "$state/incoming" ] ||
  find "$state/incoming" -mindepth 1 -maxdepth 1 -type d -mmin +1440 -exec rm -rf -- {} + ||
  echo 'Warning: incoming cleanup failed.' >&2

compose ps
