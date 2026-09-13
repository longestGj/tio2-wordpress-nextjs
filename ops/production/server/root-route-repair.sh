#!/bin/sh
set -eu
exec /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin PYTHONDONTWRITEBYTECODE=1 \
  /usr/bin/python3 -I -B -c 'import sys,runpy;sys.path.insert(0,"/root/d16-route-repair/admin");runpy.run_module("route_repair_cli",run_name="__main__")' "$@"
