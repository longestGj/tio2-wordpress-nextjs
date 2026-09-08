# APP-000 Gate 9 F01 R2 Rollback Record

- R2 implementation tip: 6ece488cf88f060457890ad7f37da0db752564ef
- Pre-R2 evidence tip: 87f48dc6eb0489ab26822280918dd0248efe6e05
- R2 implementation commits: 7de5b13, 6ece488
- Build directory: .next-app000-r2b
- Runtime port: 4391
- Scoped CMS fixture port: 4390
- Private receiver fixture port: 4392

Rollback is branch-local: stop only the verified processes on ports 4390, 4391 and 4392, reset the branch to 87f48dc6eb0489ab26822280918dd0248efe6e05, and use the prior .next-app000-0144b30 candidate only to reproduce the rejected first repair. No database, production CMS, deployment platform, DNS or external receiver was changed.
