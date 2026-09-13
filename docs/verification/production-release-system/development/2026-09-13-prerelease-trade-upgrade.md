# Local prerelease Trade content upgrade repair

- Site: `tio2-my`; development baseline: `fc9375670d1e9ebebb4d69a4a9d08b1d324b9c06`.
- Failed main prerelease: `e7494bdcde77b7aeeed0a2460c0b898dc2ac4b28`, run `20260913T053309Z-e7494bdcde77`; stopped at CMS bootstrap with `Occupied invalid editorial identity RES-TRADE-EU`.
- Cause: existing Trade records contained the approved 53da53fb payload and review, while the retained create-only seed validates against the new approved content. Existing payloads had CRLF line endings but parsed identically to historical Git JSON.
- Fix: explicit local-only four-record refresh before the historical seed. It accepts the exact prior payload (normalizing only CRLF) and exact review hash, checks scope/type/status/slug/path/page ID for all records before writing, and restores its own metadata on readback failure. Current records and absent records are no-ops.
- Tests: failing upgrade and CRLF regressions observed before fix; 31 tests passed across Trade refresh, existing Resource refresh, seed inputs and bootstrap. Read-only Plan against the actual old local prerelease CMS passed. Production was not touched.
- The failed main candidate remains failed; this repair requires a new exact candidate and full main prerelease validation.

## Runtime follow-up

- Actual local Apply upgraded exactly RES-TRADE-EU, UK, IN and BR; subsequent bootstrap passed their create-only seeds.
- Pinned new Trade seed LF bytes; verified SHA-256 inside Git archive matches the manifest.
- Final route seed still rejected the new candidate because its identity/count remained hardcoded to the historical 42 routes. It now recognizes only the exact approved 42/58 candidate IDs and validates one native route plus the corresponding CMS count.
- Actual local route Apply returned APPLIED with routeCount 58. Three related suites passed 33 tests. Evidence now reports 59 registered objects, 58 eligible routes and 57 CMS routes, including the 404 object.
- Independent read-only review found no blockers for either repair. Full main prerelease remains required.
