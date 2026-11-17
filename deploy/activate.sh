#!/bin/sh
# Usage: activate.sh <commit-sha> <bundle-dir>
# Run by GitHub Actions over SSH: installs the release config from the bundle,
# pulls the image from GHCR and activates it via pull.sh.
set -eu
umask 077
[ "$(id -un)" = wapp ] || { echo 'Run as wapp only.' >&2; exit 1; }
[ "$#" -eq 2 ] || { echo 'Usage: activate.sh <commit-sha> <bundle-dir>' >&2; exit 1; }

image=ghcr.io/dryundel/review-app
root=/home/wapp/apps/review-app
share=/home/wapp/.local/share
state="$share/review-app"
revision=$1
bundle=$2

die() { echo "$*" >&2; exit 1; }
case "$revision" in ''|*[!0-9a-f]*) die 'Invalid commit SHA.' ;; esac
[ "${#revision}" -eq 40 ] || die 'Invalid commit SHA length.'
case "$bundle" in "$state/incoming/$revision".*) ;; *) die 'Invalid bundle directory.' ;; esac
[ "$(cat "$bundle/.release-version")" = "$revision" ] || die 'Release version mismatch.'
user=$(cat "$bundle/.registry-user")
case "$user" in ''|*[!A-Za-z0-9-]*) die 'Invalid registry user.' ;; esac

# Hold the shared lock from pull to cleanup, so a concurrent pull.sh cannot
# prune the freshly pulled image. pull.sh reuses this lock.
exec 9>>"$share/review-deploy.lock"
flock -w 900 9 || die 'Timed out waiting for the Review deployment lock.'
export REVIEW_DEPLOY_LOCKED=1

# The CI token lives only in a temporary Docker config inside the bundle,
# which the caller removes; ~/.docker keeps no registry credentials.
registry_docker() {
  env -u DOCKER_CONTEXT DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock" \
    DOCKER_CONFIG="$bundle/docker" docker "$@"
}
mkdir -p "$bundle/docker"
registry_docker login ghcr.io -u "$user" --password-stdin <"$bundle/.registry-token" >/dev/null
rm -f -- "$bundle/.registry-token"
registry_docker pull --quiet "$image:$revision" >/dev/null
registry_docker logout ghcr.io >/dev/null

release="$state/releases/$revision"
mkdir -p "$root" "$release"
install -m 644 "$bundle/compose.yaml" "$bundle/.release-version" "$release/"
install -m 700 "$bundle/pull.sh" "$root/pull.sh.next"
mv -Tf "$root/pull.sh.next" "$root/pull.sh"
sh "$root/pull.sh" "$revision"
