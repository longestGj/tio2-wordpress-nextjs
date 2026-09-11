#!/usr/bin/env bash
# Compatibility entrypoint only.  Privileged backup execution is installed from
# ops/production/server/backup.sh and is never loaded from a release package.
set -euo pipefail
exec /opt/tio2-production/program/backup.sh
