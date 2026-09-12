"""The public runtime command runs the phase-one frontend-only rehearsal."""
import sys
from frontend_release_rehearsal import run

if __name__ == '__main__':
    if sys.argv[1:] != ['--isolated']:
        raise SystemExit('--isolated required; no production target options')
    run()
