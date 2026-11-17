#!/bin/sh
# Executed over SSH by GitHub Actions; receives a tested image and configuration.
set -eu
[ "$(id -un)" = wapp ] || { echo 'Run as wapp only.' >&2; exit 1; }
revision=${1:?Commit SHA required}
case "$revision" in
  *[!0-9a-f]*) echo 'Invalid commit SHA.' >&2; exit 1 ;;
esac
[ "${#revision}" -eq 40 ] || exit 1
root=/home/wapp/apps/review-app
share=/home/wapp/.local/share
state="$share/review-app"
release="$state/releases/$revision"
incoming="$state/incoming/$revision"
export DOCKER_CONTEXT=rootless

# Hold the shared lock from image load to cleanup, so a concurrent pull.sh
# cannot prune the freshly loaded image. pull.sh reuses this lock.
exec 9>>"$share/review-deploy.lock"
flock -w 900 9 || { echo 'Timed out waiting for the Review deployment lock.' >&2; exit 1; }
export REVIEW_DEPLOY_LOCKED=1

# The upload is never needed again, even if activation fails.
trap 'rm -rf -- "$incoming" "$release/image.tar"' EXIT
mkdir -p "$root" "$release"
tar --no-same-owner -xzf "$incoming/release.tar.gz" -C "$release"
test "$(cat "$release/.release-version")" = "$revision"
# CI streams this script through stdin, so no child may read it.
docker load -q -i "$release/image.tar" </dev/null
rm -f -- "$release/image.tar"
install -m 700 "$release/pull.sh" "$root/pull.sh.next"
mv -Tf "$root/pull.sh.next" "$root/pull.sh"
sh "$root/pull.sh" "$revision" </dev/null
