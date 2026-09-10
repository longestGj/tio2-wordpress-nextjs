#!/usr/bin/env bash
# Fixed installed entrypoint; never load a release package or caller-selected code.
set -euo pipefail
umask 077
[ "$#" -eq 0 ] || exit 1
exec /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin /usr/bin/python3 -E -s /opt/tio2-production/program/backup_core.py
