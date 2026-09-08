# Five-page browser review — superseded candidate

- Site: `tio2-my`; local frontend `127.0.0.1:3236`; CMS `127.0.0.1:8187/graphql`.
- Build: `olH5kVkkyEhmfGAHQ_2SJ`; review date: 2026-09-08.
- Automated run: 6/6 passed in 26.3 s, but **visual review rejected this candidate**.
- Reviewer: D16 delegated technical reviewer `/root/sulfate_intake`; this does not constitute independent Gate 9 approval or publication authorization.

## Actual image inspection

Opened all 15 full-page PNGs (five pages at 1440, 768 and 390 CSS px), all five 390 menu PNGs and all five 390 keyboard-focus PNGs in this directory. Also opened the preceding r1 Germany 390 cookie PNG, whose same-build defect was independently identified by the parent. Full-page images were viewed as scaled overviews; this review does not claim pixel-by-pixel or every-character reading. Exact body text and link inventory were independently asserted from SSR against bound generated contracts.

The five main layouts show coherent section order, responsive wrapping and no observed clipping at overview scale. Germany and Italy retain distinct content and layout. Sulfate retains five ordered Grade rows and all actions. The alternatives retain neutral evaluation paths. Mobile menus show the correct Markets / Products / Resources state and a visible white keyboard focus outline; selected main links show visible focus outlines.

## Blocking shared defect

Cookie dialog heading is visually absent: computed heading color `rgb(255, 255, 255)` equals the dialog white background. Direct browser computation confirmed Germany, Italy, Sulfate and Chemours; shared owner CSS explains the same condition for R706. Parent owns correction and rebuilding. Existing page-level Axe checks ran after closing the dialog and did not cover this open-state defect. The harness now records explicit open-dialog heading contrast and runs Axe with the dialog open. This run is not evidence of the fix.

## Capture issue corrected in harness

Initial desktop full-page captures for Germany, Italy and R706 omitted the footer logo before its native lazy image loaded. Subsequent same-page viewport captures show the logo loaded. The harness now scrolls the footer into view, checks footer images are complete with positive natural width, and returns to the top before full-page capture. New captures are required; these old images are retained without alteration.

## Functional and dependency observations

All five real CMS records matched their generated contracts with exact `tio2-my` scope. All five SSR pages had the intended heading/module count, exact copy/link inventory, noindex/nofollow and expected conservative schema behavior. SU ItemList and visible Grade order were M-996, M-2196, M-108, M-52, M-2377. No page JS exceptions, blocked writes/external resource requests or failed browser requests were recorded. Console preload warnings are retained in per-page runtime JSON.

The only non-200 internal body dependency was Sulfate `/applications/` (404); all five Grade paths returned 200. Dependency 200 observations do not establish release approval. R706 D01 / AC10 schema acceptance remains unresolved: no approved canonical mapping means the URL-bound graph stays withheld (`schemaType: none`). Chemours schema remains conditional and withheld.

No real form submission, external-source reachability check, native browser zoom, real-device test or screen-reader test was performed. All screenshot records remain raw captures with `PENDING` embedded review status; this document is the bounded review record for the images explicitly listed above.
