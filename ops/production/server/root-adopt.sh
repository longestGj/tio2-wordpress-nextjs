#!/usr/bin/env bash
set -euo pipefail
umask 077

[ "$(id -u)" -eq 0 ] || { printf '%s\n' 'production adoption requires root' >&2; exit 1; }
SOURCE_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
PLAN_FILE="${SOURCE_DIR}/adoption-plan.json"

/usr/bin/python3 "${SOURCE_DIR}/tio2_adopt.py" plan > "${PLAN_FILE}.new"
/usr/bin/python3 - "${PLAN_FILE}.new" <<'PY' > "${PLAN_FILE}.hash"
import json, re, sys
with open(sys.argv[1], encoding="utf-8") as source:
    value = json.load(source)
plan_hash = value.get("planHash")
if not isinstance(plan_hash, str) or not re.fullmatch(r"[a-f0-9]{64}", plan_hash):
    raise SystemExit("invalid adoption plan")
print(plan_hash)
PY
/bin/mv -f "${PLAN_FILE}.new" "${PLAN_FILE}"
PLAN_HASH="$(/usr/bin/head -n 1 "${PLAN_FILE}.hash")"
/bin/rm -f "${PLAN_FILE}.hash"
exec /usr/bin/python3 "${SOURCE_DIR}/tio2_adopt.py" apply "${PLAN_HASH}"
