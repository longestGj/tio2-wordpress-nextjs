# TIO2-MY-PROD-GA4-F01 Gate8 handoff

## Identity

- Site: `tio2-my`
- Branch: `codex/tio2-my-prod-ga4-legal-parity`
- Baseline: `develop@1ab1a9a02958394135b655d912463dd12d69e1cf`
- Implementation commit: `24065cdeffef6a887b290f542be74d78be595b71`
- Evidence head: `f0c3bc9891822d1beb4d21d77211c3fd297e6ec2`
- Production baseline: `d5a061f60c7521a58b59292e337fe2788394cae9`
- Content package SHA-256: `13ac8f9984d8a4cadb8c4e34f0cc07c2d7519d88ee3effd0583d23afeeb5a3a8`
- Local production Build ID: `aoZsmmoI852RtB8oVR-vb`
- Held runtime: `http://127.0.0.1:3143`

## Delivered behavior

The deterministic builder emits one `d16-content-package-v1` package containing exactly `LEGAL-COOKIE-EN`, `LEGAL-PRIV-EN` and `LEGAL-PRIV-MS`. It refuses an inactive delivery state, an incomplete page set, unresolved runtime placeholders, missing active GA4/GTM wording, an incomplete storage inventory or missing permanent advertising denials. The package is data-only and performs no WordPress or production write.

The real isolated MariaDB/WordPress importer test starts with the production-observed stale wording, imports the three-record candidate atomically, verifies the returned content digest, and exports the exact records again. A separate read-only CMS public-projection check confirms that the active local prerelease records expose the exact package Markdown, SEO values and effective date used by the held Next runtime.

## Verification

- Python/importer: **28/28 passed**, including exact stale-to-active three-record import and export readback.
- Vitest: **196/196 passed** across content policy, legal, consent, GA4 and all three approved success-event/no-PII contracts.
- GA4/consent Playwright: **2/2 passed** for denied-before-GTM ordering, no direct gtag path, Necessary only, Accept analytics, saved choice and withdrawal cookie cleanup.
- Existing legal Playwright, applicable cases: **11/11 passed** for Privacy EN, Cookie EN, Cookie Settings, responsive inventory and unregistered routes.
- Candidate-specific legal browser audit: **9/9 passed** for Privacy EN/BM and Cookie EN at 390/768/1440, including active wording, metadata, canonical, robots, H1 and JSON-LD.
- Build: production-mode compilation completed successfully with 67 generated routes.

No form was submitted. External Google endpoints were fulfilled by deterministic local Playwright responses. No production WordPress write, merge, deployment, publication, indexing action or Gate10 action occurred.

## Evidence index

EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/build-identity.txt
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/content-package.json
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/cms-public-projection-parity.json
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/python-import-tests.txt
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/targeted-vitest.txt
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/ga4-consent-playwright.txt
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/legal-existing-e2e.txt
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/legal-candidate-audit.json
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/runtime-audit.json
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/seo-regression.json
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/test-oracle-note.md
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/legal-priv-en-390.png
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/legal-priv-ms-390.png
EVIDENCE: docs/verification/tio2-my-prod-ga4-legal-parity-20260914/legal-cookie-en-390.png

- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/build-identity.txt`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/content-package.json`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/cms-public-projection-parity.json`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/python-import-tests.txt`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/targeted-vitest.txt`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/ga4-consent-playwright.txt`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/legal-existing-e2e.txt`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/legal-candidate-audit.json`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/runtime-audit.json`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/seo-regression.json`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/test-oracle-note.md`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/legal-priv-en-390.png`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/legal-priv-ms-390.png`
- `docs/verification/tio2-my-prod-ga4-legal-parity-20260914/legal-cookie-en-390.png`

## Open items

1. Gate9 must independently validate the package, hashes, held Build/runtime, three legal surfaces and consent/network behavior. This receipt does not declare Gate9 pass.
2. A single develop runtime did not reach 57/57 because 14 non-scope editorial pages in the available local CMS baseline are rejected by current develop contracts. This package contains none of those IDs. Changed-scope SEO passed 9/9; the production 57-page baseline remains bound to D23 report SHA-256 `e82157d37b30f264d059153bc383a965f2735a5c2b175286e478dcf2eca977cb`. Full combined 57/57 must be rerun after that unrelated develop/CMS baseline is aligned.
3. The generic legal E2E inventory expects a different BM Meta Description from the current production page, the current legal contract and this package. The three BM generic cases were not relabelled as passing; the exact candidate audit passed all BM widths. See `test-oracle-note.md`.
4. Publishing this package requires separate accepted content-candidate preparation and release authorization. Production is unchanged and Finding `TIO2-MY-PROD-GA4-F01` remains open until an accepted package is published and independently rechecked.
