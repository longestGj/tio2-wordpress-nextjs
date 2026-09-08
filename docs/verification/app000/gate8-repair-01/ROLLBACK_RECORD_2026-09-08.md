# APP-000 Gate 9 Repair Rollback Record

- Repair implementation tip: `0144b303d0546dc5bb7012e4292df6339f851b78`
- Pre-repair evidence tip: `ce3f4c5c21033e56472ec53586173279fb78c415`
- Repair commits: `7555495`, `fd53718`, `0144b30`
- Build directory: `.next-app000-0144b30`
- Runtime port: `4391`
- Scoped CMS fixture port: `4390`
- Private receiver fixture port: `4392`

Rollback is branch-local: stop the three verified local fixture/runtime processes, point the branch back to `ce3f4c5c21033e56472ec53586173279fb78c415`, and use the prior `.next-app000-f0285f2` candidate if its original Gate 9 state must be reproduced. No database, production CMS, deployment platform, DNS or external receiver was changed by this repair.
