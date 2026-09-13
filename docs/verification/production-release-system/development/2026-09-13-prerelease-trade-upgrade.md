# Local prerelease Trade content upgrade repair

- Site: `tio2-my`; development baseline: `fc9375670d1e9ebebb4d69a4a9d08b1d324b9c06`.
- Failed main prerelease: `e7494bdcde77b7aeeed0a2460c0b898dc2ac4b28`, run `20260913T053309Z-e7494bdcde77`; stopped at CMS bootstrap with `Occupied invalid editorial identity RES-TRADE-EU`.
- Cause: existing Trade records contained the approved 53da53fb payload and review, while the retained create-only seed validates against the new approved content. Existing payloads had CRLF line endings but parsed identically to historical Git JSON.
- Fix: explicit local-only four-record refresh before the historical seed. It accepts the exact prior payload (normalizing only CRLF) and exact review hash, checks scope/type/status/slug/path/page ID for all records before writing, and restores its own metadata on readback failure. Current records and absent records are no-ops.
- Tests: failing upgrade and CRLF regressions observed before fix; 31 tests passed across Trade refresh, existing Resource refresh, seed inputs and bootstrap. Read-only Plan against the actual old local prerelease CMS passed. Production was not touched.
- The failed main candidate remains failed; this repair requires a new exact candidate and full main prerelease validation.
