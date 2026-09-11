#!/usr/bin/env bash
set -euo pipefail
umask 077

[ "$(id -u)" -eq 0 ] || { printf '%s\n' 'production adoption requires root' >&2; exit 1; }
SOURCE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
PLAN_FILE="/etc/tio2-production/adoption-plan.json"
LEGACY_PLAN_FILE="${SOURCE_DIR}/../adoption-plan.json"

if [ ! -f "${PLAN_FILE}" ]; then
  if [ -f "${LEGACY_PLAN_FILE}" ]; then
    /usr/bin/install -o root -g root -m 600 "${LEGACY_PLAN_FILE}" "${PLAN_FILE}.new"
  else
    PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 "${SOURCE_DIR}/tio2_adopt.py" plan > "${PLAN_FILE}.new"
    /usr/bin/chown root:root "${PLAN_FILE}.new"
    /usr/bin/chmod 600 "${PLAN_FILE}.new"
  fi
  /bin/mv "${PLAN_FILE}.new" "${PLAN_FILE}"
fi
PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 - "${PLAN_FILE}" <<'PY' > "${PLAN_FILE}.hash"
import json, re, sys
with open(sys.argv[1], encoding="utf-8") as source:
    value = json.load(source)
plan_hash = value.get("planHash")
if not isinstance(plan_hash, str) or not re.fullmatch(r"[a-f0-9]{64}", plan_hash):
    raise SystemExit("invalid adoption plan")
print(plan_hash)
PY
PLAN_HASH="$(/usr/bin/head -n 1 "${PLAN_FILE}.hash")"
/bin/rm -f "${PLAN_FILE}.hash"
exec /usr/bin/env PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 "${SOURCE_DIR}/tio2_adopt.py" apply "${PLAN_HASH}"
