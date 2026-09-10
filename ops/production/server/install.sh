#!/usr/bin/env bash
# Install the fixed TiO2 Malaysia release boundary.  Run only from a
# root-owned, SHA-256-verified bootstrap directory; this program never uses
# the deploy user's home as an execution location.
set -euo pipefail
umask 027

readonly PROGRAM_ROOT=/opt/tio2-production
readonly PROGRAMS_ROOT="$PROGRAM_ROOT/programs"
readonly PROGRAM_LINK="$PROGRAM_ROOT/program"
readonly BACKUP_ROOT="$PROGRAM_ROOT/backups"
readonly CONFIGURATION_ROOT=/etc/tio2-production
readonly WRAPPER_TARGET=/usr/local/sbin/tio2-release
readonly SUDOERS_TARGET=/etc/sudoers.d/tio2-release

SOURCE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
SOURCE_ROOT="$(CDPATH= cd -- "$SOURCE_DIR/../../.." && pwd -P)"
STAGED_PROGRAM=''
PROGRAM_LINK_NEW=''
WRAPPER_NEW=''
SUDOERS_NEW=''

die() {
  printf '%s\n' "install failed: $*" >&2
  exit 1
}

cleanup() {
  [ -z "$STAGED_PROGRAM" ] || rm -rf -- "$STAGED_PROGRAM"
  [ -z "$PROGRAM_LINK_NEW" ] || rm -f -- "$PROGRAM_LINK_NEW"
  [ -z "$WRAPPER_NEW" ] || rm -f -- "$WRAPPER_NEW"
  [ -z "$SUDOERS_NEW" ] || rm -f -- "$SUDOERS_NEW"
}
trap cleanup EXIT

require_root() {
  [ "$(id -u)" -eq 0 ] || die 'root is required'
}

require_ubuntu_2404() {
  [ -r /etc/os-release ] || die 'Ubuntu 24.04 is required'
  # shellcheck disable=SC1091
  . /etc/os-release
  [ "${ID:-}" = ubuntu ] && [ "${VERSION_ID:-}" = 24.04 ] || die 'Ubuntu 24.04 is required'
}

assert_safe_source() {
  local source_path="$1"
  [ -f "$source_path" ] && [ ! -L "$source_path" ] || die "unsafe bootstrap source: $source_path"
  local owner mode
  owner="$(stat -c '%u' "$source_path")"
  mode="$(stat -c '%a' "$source_path")"
  [ "$owner" -eq 0 ] || die "bootstrap source is not root-owned: $source_path"
  [ $((10#$mode & 022)) -eq 0 ] || die "bootstrap source is group/world-writable: $source_path"
}

assert_safe_directory() {
  local source_path="$1"
  [ -d "$source_path" ] && [ ! -L "$source_path" ] || die "unsafe bootstrap directory: $source_path"
  local owner mode
  owner="$(stat -c '%u' "$source_path")"
  mode="$(stat -c '%a' "$source_path")"
  [ "$owner" -eq 0 ] || die "bootstrap directory is not root-owned: $source_path"
  [ $((10#$mode & 022)) -eq 0 ] || die "bootstrap directory is group/world-writable: $source_path"
}

install_age() {
  if ! command -v age >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends age
  fi
}

require_root
require_ubuntu_2404
case "$SOURCE_DIR" in
  /home/deploy|/home/deploy/*) die 'bootstrap source must not execute from /home/deploy' ;;
esac
assert_safe_directory "$SOURCE_ROOT"
assert_safe_directory "$SOURCE_DIR"

for source_file in \
  "$SOURCE_DIR/install.sh" \
  "$SOURCE_DIR/tio2_release.py" \
  "$SOURCE_DIR/release_contract.py" \
  "$SOURCE_DIR/release_state.py" \
  "$SOURCE_DIR/sudoers.tio2-release" \
  "$SOURCE_DIR/sshd-tio2-production.conf"; do
  assert_safe_source "$source_file"
done

python3 -m unittest discover -s "$SOURCE_ROOT/tests/production" -p 'test_*.py' -v
install_age

install -d -o root -g root -m 0750 /opt/tio2-production
install -d -o root -g root -m 0750 /opt/tio2-production/programs
install -d -o root -g root -m 0750 /opt/tio2-production/backups
install -d -o root -g root -m 0750 /opt/tio2-production/releases
install -d -o root -g root -m 0750 /opt/tio2-production/state
install -d -o root -g root -m 0750 /etc/tio2-production
install -d -o deploy -g deploy -m 0700 /home/deploy/tio2-incoming
install -d -o deploy -g deploy -m 0700 /home/deploy/tio2-outgoing

VERSION="$(date -u +%Y%m%dT%H%M%SZ)-$$"
STAGED_PROGRAM="$(mktemp -d "$PROGRAMS_ROOT/.install.XXXXXX")"
install -o root -g root -m 0750 "$SOURCE_DIR/tio2_release.py" "$STAGED_PROGRAM/tio2_release.py"
install -o root -g root -m 0750 "$SOURCE_DIR/release_contract.py" "$STAGED_PROGRAM/release_contract.py"
install -o root -g root -m 0750 "$SOURCE_DIR/release_state.py" "$STAGED_PROGRAM/release_state.py"
install -o root -g root -m 0640 "$SOURCE_DIR/sshd-tio2-production.conf" "$STAGED_PROGRAM/sshd-tio2-production.conf"
printf '%s\n' '#!/bin/sh' "exec /usr/bin/python3 $PROGRAM_LINK/tio2_release.py \"\$@\"" > "$STAGED_PROGRAM/tio2-release"
install -o root -g root -m 0750 "$STAGED_PROGRAM/tio2-release" "$STAGED_PROGRAM/tio2-release.checked"
rm -f -- "$STAGED_PROGRAM/tio2-release"
mv -f -- "$STAGED_PROGRAM/tio2-release.checked" "$STAGED_PROGRAM/tio2-release"
python3 -m py_compile "$STAGED_PROGRAM/tio2_release.py" "$STAGED_PROGRAM/release_contract.py" "$STAGED_PROGRAM/release_state.py"

if [ -e "$PROGRAM_LINK" ] || [ -L "$PROGRAM_LINK" ]; then
  cp -a -- "$PROGRAM_LINK" "$BACKUP_ROOT/program-$VERSION"
fi
mv -T -- "$STAGED_PROGRAM" "$PROGRAMS_ROOT/$VERSION"
STAGED_PROGRAM=''
PROGRAM_LINK_NEW="$PROGRAM_ROOT/.program.new.$VERSION"
ln -s "programs/$VERSION" "$PROGRAM_LINK_NEW"
mv -Tf -- "$PROGRAM_LINK_NEW" "$PROGRAM_LINK"
PROGRAM_LINK_NEW=''

WRAPPER_NEW="$(mktemp "$WRAPPER_TARGET.new.XXXXXX")"
install -o root -g root -m 0750 "$PROGRAM_LINK/tio2-release" "$WRAPPER_NEW"
mv -Tf -- "$WRAPPER_NEW" "$WRAPPER_TARGET"
WRAPPER_NEW=''

SUDOERS_NEW="$(mktemp "$SUDOERS_TARGET.new.XXXXXX")"
install -o root -g root -m 0440 "$SOURCE_DIR/sudoers.tio2-release" "$SUDOERS_NEW"
visudo -cf "$SUDOERS_NEW"
mv -Tf -- "$SUDOERS_NEW" "$SUDOERS_TARGET"
SUDOERS_NEW=''
