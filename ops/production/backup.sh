#!/usr/bin/env bash
# Root-owned, fixed-path TiO2 Malaysia backup program.  It accepts no arguments.
set -euo pipefail
umask 077

readonly PRODUCTION_ROOT=/opt/tio2-production
readonly CURRENT_ROOT=/opt/tio2-production/current
readonly BACKUP_ROOT=/opt/tio2-production/backups
readonly STATE_FILE=/opt/tio2-production/state/state.json
readonly CONFIG_FILE=/etc/tio2-production/production.env
readonly BACKUP_KEY=/etc/tio2-production/backup.age.pub
readonly OUTGOING=/home/deploy/tio2-outgoing
readonly COMPOSE_FILE=/opt/tio2-production/current/ops/production/docker-compose.yml
readonly DOCKER=/usr/bin/docker
readonly AGE=/usr/bin/age
readonly NGINX=/usr/sbin/nginx

fail() { printf '%s\n' "backup failed: $*" >&2; exit 1; }

release_id=''
backup_dir=''
wordpress_stopped=0
deployment_continues=0

compose() { "$DOCKER" compose --project-name tio2-production --file "$COMPOSE_FILE" "$@"; }

restart_wordpress() {
  # A backup action is not a deployment action: always restore the old CMS.
  compose start wordpress >/dev/null
  compose exec -T wordpress wp maintenance-mode deactivate --allow-root >/dev/null || true
}

cleanup() {
  status=$?
  if [ "$wordpress_stopped" -eq 1 ] && [ "$deployment_continues" -eq 0 ]; then
    restart_wordpress || status=1
  fi
  exit "$status"
}
trap cleanup EXIT

require_regular_file() {
  [ -f "$1" ] && [ ! -L "$1" ] || fail "required file is unavailable"
}

load_release_id() {
  release_id="$(/usr/bin/python3 - "$STATE_FILE" <<'PY'
import json
import re
import sys
try:
    with open(sys.argv[1], encoding='utf-8') as source:
        state = json.load(source)
    value = state['details']['commit']
except (OSError, ValueError, KeyError, TypeError):
    raise SystemExit(1)
if state.get('state') != 'PREPARED' or not isinstance(value, str) or not re.fullmatch(r'[a-f0-9]{40}', value):
    raise SystemExit(1)
print(value)
PY
)" || fail 'state is not PREPARED'
}

measure_working_set() {
  local db_mount wp_mount
  db_mount="$("$DOCKER" volume inspect --format '{{ .Mountpoint }}' wordpress_db_data)" || fail 'database volume is unavailable'
  wp_mount="$("$DOCKER" volume inspect --format '{{ .Mountpoint }}' wordpress_wp_data)" || fail 'WordPress volume is unavailable'
  /usr/bin/du -sb -- "$db_mount" "$wp_mount" "$CURRENT_ROOT" "$CONFIG_FILE" | /usr/bin/awk '{total += $1} END {print total + 0}'
}

require_resources() {
  local working_set free_disk available_memory required_disk
  working_set="$(measure_working_set)" || fail 'working set is unavailable'
  case "$working_set" in (''|*[!0-9]*) fail 'working set is invalid' ;; esac
  required_disk=$(( working_set * 2 ))
  [ "$required_disk" -ge 8589934592 ] || required_disk=8589934592
  free_disk="$(/usr/bin/df --output=avail -B1 "$BACKUP_ROOT" | /usr/bin/tail -n 1 | /usr/bin/tr -d '[:space:]')" || fail 'disk is unavailable'
  case "$free_disk" in (''|*[!0-9]*) fail 'disk value is invalid' ;; esac
  [ "$free_disk" -ge "$required_disk" ] || fail 'insufficient free disk'
  available_memory="$(/usr/bin/free -b | /usr/bin/awk '/^Mem:/ {print $7}')" || fail 'memory is unavailable'
  case "$available_memory" in (''|*[!0-9]*) fail 'memory value is invalid' ;; esac
  [ "$available_memory" -ge 2147483648 ] || fail 'insufficient available memory'
}

block_mutations() {
  compose exec -T wordpress wp maintenance-mode activate --allow-root >/dev/null
}

drain_requests() {
  # Fixed wait allows in-flight PHP requests to observe maintenance mode.
  /usr/bin/sleep 5
}

validate_sql() {
  /usr/bin/gzip -t "$backup_dir/database.sql.gz"
  /usr/bin/gzip -cd -- "$backup_dir/database.sql.gz" | /usr/bin/grep -q '^CREATE TABLE '
}

validate_tar() {
  /usr/bin/tar -tzf "$1" >/dev/null
}

copy_nginx() {
  /usr/bin/install -m 600 /etc/nginx/sites-enabled/tio2malaysia.conf "$backup_dir/nginx.conf"
  "$NGINX" -t >/dev/null
}

copy_config() {
  /usr/bin/install -m 600 "$CONFIG_FILE" "$backup_dir/production.env"
  [ "$(/usr/bin/stat -c '%a' "$backup_dir/production.env")" = 600 ] || fail 'config archive mode is unsafe'
}

create_manifest() {
  /usr/bin/python3 - "$backup_dir" "$release_id" "$STATE_FILE" <<'PY'
import hashlib
import json
import os
from pathlib import Path
import sys

root = Path(sys.argv[1])
release_id = sys.argv[2]
state_path = Path(sys.argv[3])
names = ('database.sql.gz', 'wordpress.tar.gz', 'release.tar.gz', 'nginx.conf', 'production.env')
files = {}
for name in names:
    path = root / name
    if not path.is_file() or path.is_symlink():
        raise SystemExit(1)
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    files[name] = digest.hexdigest()
with state_path.open(encoding='utf-8') as source:
    details = json.load(source)['details']
manifest = {
    'schemaVersion': 'tio2-production-backup-v1',
    'backupId': release_id,
    'commit': details['commit'],
    'archiveSha256': details['archiveSha256'],
    'files': files,
}
temporary = root / '.manifest.json.tmp'
with temporary.open('x', encoding='utf-8') as output:
    os.chmod(temporary, 0o600)
    json.dump(manifest, output, sort_keys=True, separators=(',', ':'))
    output.flush()
    os.fsync(output.fileno())
os.replace(temporary, root / 'manifest.json')
PY
}

verify_backup() {
  /usr/bin/python3 - "$1" <<'PY'
import hashlib
import json
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
try:
    with (root / 'manifest.json').open(encoding='utf-8') as source:
        manifest = json.load(source)
    if manifest.get('schemaVersion') != 'tio2-production-backup-v1' or not re.fullmatch(r'[a-f0-9]{40}', manifest.get('backupId', '')):
        raise ValueError
    files = manifest['files']
    if set(files) != {'database.sql.gz', 'wordpress.tar.gz', 'release.tar.gz', 'nginx.conf', 'production.env'}:
        raise ValueError
    for name, expected in files.items():
        path = root / name
        if path.is_symlink() or not path.is_file() or not re.fullmatch(r'[a-f0-9]{64}', expected):
            raise ValueError
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != expected:
            raise ValueError
except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
    raise SystemExit(1)
PY
}

keep_newest_three() {
  local names name count=0
  names="$(/usr/bin/find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %f\n' | /usr/bin/sort -rn | /usr/bin/awk '{print $2}')"
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    [[ "$name" =~ ^[a-f0-9]{40}$ ]] || fail 'backup directory identity is unsafe'
    if [ "$count" -lt 3 ]; then
      verify_backup "$BACKUP_ROOT/$name" || fail 'replacement backup did not verify'
      count=$(( count + 1 ))
      continue
    fi
    # Do not remove an old backup unless the current and replacement backups
    # have both independently verified in this same backup run.
    verify_backup "$backup_dir" || fail 'current backup did not verify'
    /usr/bin/rm -rf -- "$BACKUP_ROOT/$name"
  done <<EOF
$names
EOF
}

require_regular_file "$CONFIG_FILE"
require_regular_file "$BACKUP_KEY"
[ -x "$AGE" ] || fail 'age is unavailable'
load_release_id
require_resources
[ -f "$COMPOSE_FILE" ] && [ ! -L "$COMPOSE_FILE" ] || fail 'Compose inventory is unavailable'
[ -d "$BACKUP_ROOT" ] && [ ! -L "$BACKUP_ROOT" ] || fail 'backup root is unavailable'
[ -d "$OUTGOING" ] && [ ! -L "$OUTGOING" ] || fail 'outgoing root is unavailable'

backup_dir="$BACKUP_ROOT/$release_id"
[ ! -e "$backup_dir" ] || fail 'backup identity already exists'
/usr/bin/mkdir -m 700 -- "$backup_dir"

block_mutations
drain_requests
compose exec -T db mariadb-dump --single-transaction --routines --events --all-databases | /usr/bin/gzip -c > "$backup_dir/database.sql.gz"
validate_sql || fail 'database dump validation failed'

wordpress_container="$(compose ps -q wordpress)" || fail 'WordPress container is unavailable'
[ -n "$wordpress_container" ] || fail 'WordPress container is unavailable'
compose stop wordpress >/dev/null
wordpress_stopped=1
"$DOCKER" cp "$wordpress_container:/var/www/html/wp-content" - | /usr/bin/gzip -c > "$backup_dir/wordpress.tar.gz"
validate_tar "$backup_dir/wordpress.tar.gz" || fail 'WordPress archive validation failed'

/usr/bin/tar -C "$CURRENT_ROOT" -czf "$backup_dir/release.tar.gz" -- ops/production/docker-compose.yml wordpress
validate_tar "$backup_dir/release.tar.gz" || fail 'release archive validation failed'
copy_nginx
copy_config
create_manifest || fail 'manifest creation failed'
verify_backup "$backup_dir" || fail 'manifest verification failed'

ciphertext_temporary="$OUTGOING/.${release_id}.tar.age.tmp"
ciphertext_final="$OUTGOING/${release_id}.tar.age"
[ ! -e "$ciphertext_temporary" ] && [ ! -e "$ciphertext_final" ] || fail 'outgoing backup already exists'
# age -R writes ciphertext only; no plaintext archive is ever placed in OUTGOING.
/usr/bin/tar -C "$BACKUP_ROOT" -cf - "$release_id" | "$AGE" -R "$BACKUP_KEY" -o "$ciphertext_temporary"
/usr/bin/chmod 600 "$ciphertext_temporary"
/usr/bin/mv -- "$ciphertext_temporary" "$ciphertext_final"
keep_newest_three

manifest_sha256="$(/usr/bin/sha256sum "$backup_dir/manifest.json" | /usr/bin/awk '{print $1}')"
ciphertext_sha256="$(/usr/bin/sha256sum "$ciphertext_final" | /usr/bin/awk '{print $1}')"
/usr/bin/python3 - "$release_id" "$ciphertext_sha256" "$manifest_sha256" <<'PY'
import json
import sys
print(json.dumps({'backupId': sys.argv[1], 'ciphertextSha256': sys.argv[2], 'manifestSha256': sys.argv[3]}, sort_keys=True, separators=(',', ':')))
PY
