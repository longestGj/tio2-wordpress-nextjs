#!/usr/bin/env bash
# Run only from Task 14's root-copied, SHA-256-verified server-only archive.
set -euo pipefail
umask 027

SOURCE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
die() { printf '%s\n' "install failed: $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die 'root is required'
[ -r /etc/os-release ] || die 'Ubuntu 24.04 is required'
# shellcheck disable=SC1091
. /etc/os-release
[ "${ID:-}" = ubuntu ] && [ "${VERSION_ID:-}" = 24.04 ] || die 'Ubuntu 24.04 is required'
case "$SOURCE_DIR" in
  /home/deploy|/home/deploy/*) die 'bootstrap source must not execute from /home/deploy' ;;
esac

for source_file in install.sh bootstrap_install.py bootstrap_selftest.py tio2_release.py release_contract.py release_state.py release_actions.py release_baseline.py backup_core.py deployment_core.py web.Dockerfile backup.sh sudoers.tio2-release sshd-tio2-production.conf adoption_contract.py adoption_probe.py adoption_state.py adoption_apply.py adoption_phase_a.py adoption_wordpress.py adoption_internal.py adoption_tls.py adoption_finalize.py tio2_adopt.py tool-commit.txt root-adopt.sh candidate_contract.py subject_registry.py release_adapter.py release_controller.py d16_release.py nginx_inventory.py tls_identity.py cms_evidence.py phase1_migration.py root-migrate-phase1.sh; do
  path="$SOURCE_DIR/$source_file"
  [ -f "$path" ] && [ ! -L "$path" ] || die "unsafe bootstrap source: $source_file"
  [ "$(stat -c '%u' "$path")" -eq 0 ] || die "bootstrap source is not root-owned: $source_file"
  [ $((8#$(stat -c '%a' "$path") & 022)) -eq 0 ] || die "bootstrap source is group/world-writable: $source_file"
done

if ! command -v age >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends age
fi

exec /usr/bin/python3 "$SOURCE_DIR/bootstrap_install.py" --source-dir "$SOURCE_DIR"
