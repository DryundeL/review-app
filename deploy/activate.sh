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
state=/home/wapp/.local/share/review-app
release="$state/releases/$revision"
export DOCKER_CONTEXT=rootless
incoming="$state/incoming/$revision"
# The uploaded archive is never needed again, even if activation fails.
trap 'rm -rf "$incoming" "$release/image.tar"' EXIT
mkdir -p "$root" "$release"
tar -xzf "$incoming/release.tar.gz" -C "$release"
test "$(cat "$release/.release-version")" = "$revision"
docker load -i "$release/image.tar"
install -m 700 "$release/pull.sh" "$root/pull.sh"
sh "$root/pull.sh" "$revision"
