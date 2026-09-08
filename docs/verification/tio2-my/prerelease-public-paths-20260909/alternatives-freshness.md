# Bounded alternatives source recheck for the new prerelease candidate

Research date: 2026-09-09 in Asia/Kuala_Lumpur. Direct requests completed 2026-09-08T23:02:23.229Z. This is D16 technical evidence, not independent Gate 9 acceptance, a business-content approval, or publication clearance.

Purpose: the historical `alternatives-freshness.md` bytes in git and the worktree hash to `90194de968291490b140a7ef83f23886d68c39969916fa10a1a44337e3748d47`, while the existing binding expects `3b0559416055d44ea15dbf0bea8db5b911e44767eaa0e0d1373e7a5fe895b8e1`. The mismatch is not explained by LF/CRLF, BOM or final-newline normalization. Preserve the historical artifact and binding in history; do not pretend the expected hash validated. These observations can support a separate successor evidence artifact after implementation review.

Bounded conclusion: no material contradiction to the inspected existing R-706/Chemours source statements was located. This is not an exhaustive event search. Web retrieval reported each source as crawled today; direct origin access was independently measured and is distinguished below. No new IKHLAS equivalence or product recommendation is inferred.

| Official source | Content inspected | Retrieval boundary |
|---|---|---|
| [R-706 product page](https://www.tipure.com/en/products/coatings/r-706) | Product identity, rutile/chloride description, optical/durability topics and architectural, wood, automotive and coil application list remain identifiable in retrieved lines 244–268. | Web retrieval succeeded; direct GET was HTTP 403. Direct origin HTML content availability is not claimed. |
| [R-706 Product Information PDF](https://www.tipure.com/en/-/media/files/tipure/legacy/ti-pure-r-706-tds.pdf) | Two-page R-706 document, revision C-10417-1 (2/20). Extracted property table retains the minimum-versus-typical qualification; wet-in/dispersibility and application context remain present. No new numerical claim is introduced by this check. | Direct GET 200, application/pdf, 81,847 bytes. SHA-256 `1ac8f7095888d8c7422f60f6b75cb0f7edbd22a11a9b3c9175345cd251f41137`, identical to the historical recorded PDF hash. Last-Modified 2021-11-08 is an HTTP header, not a newly inferred publication date. |
| [Chemours TS-6706 announcement](https://investors.chemours.com/news-releases/news-release-details/chemours-launches-ti-puretm-ts-6706-tmptme-free-version-flagship) | Retrieved lines 22–34 identify the 2025-02-19 launch and keep paint-system evaluation separate from dry-pigment bulk-flow testing. Both are Chemours TS-6706/R-706 context, not evidence of an IKHLAS replacement relationship. | Web retrieval and direct GET 200 succeeded. Raw HTML SHA-256 `8745860c67c6463c06fb6781f2fe95c24238b034d8625089b63cfa24b1a55bb3`. The response Last-Modified is not treated as the announcement date. |
| [Ti-Pure product portfolio](https://www.tipure.com/en/products) | Retrieved portfolio sections retain separate coatings, plastics and laminates contexts. No new grade suitability is inferred. | Web retrieval succeeded; direct GET 403. |
| [Ti-Pure coatings applications](https://www.tipure.com/en/applications/coatings) | Retrieved lines 233–247 distinguish architectural and industrial contexts and retain application-dependent grade selection. | Web retrieval succeeded; direct GET 403. |

Machine evidence is in `alternatives-direct-source-check.json` beside these notes; it includes exact URLs, UTC request times, status, final URL, media type, byte count, SHA-256 and available HTTP date headers. Error-page hashes are not hashes of official product content. No browser form was submitted during this read-only check.

These notes do not alter the existing review deadline or policy, do not attest to sources outside the five named URLs, and do not authorize metadata or content changes beyond the approved combined candidate.

## Successor binding

This separately reviewable artifact binds the 9 September 2026 local candidate to the bounded check above. It supersedes the mismatched historical artifact only for the current review binding; it does not alter the historical file. The approved next-review deadline remains 5 December 2026. Visible child review dates and business claims remain unchanged.
