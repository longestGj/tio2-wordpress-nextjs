# Trade Resource implementation-window freshness check — 2026-09-08

## Control record

- Site scope: `tio2-my`.
- Pages: `RES-TRADE-EU`, `RES-TRADE-UK`, `RES-TRADE-IN`, `RES-TRADE-BR`.
- Check time: 2026-09-08 08:35 CST (UTC+08:00).
- Purpose: bounded, read-only implementation-window check against the official-source sets named in the approved B/C evidence and Gate 6 handoff packages.
- Content boundary: this report does not revise approved Buyer Copy, advance its visible `Last reviewed: 7 September 2026` date, make a shipment determination, or approve publication. Negative observations below mean only that no change was located in the named official entry points and bounded official-domain discovery available during this check.
- Package baselines read:
  - `RES-TRADE-EU_GATE6_HANDOFF_PACKAGE_V0.1.md`
  - `RES-TRADE-UK_GATE6_HANDOFF_PACKAGE_V0.1.md`
  - `RES-TRADE-IN_GATE6_HANDOFF_PACKAGE_V0.1.md`
  - `RES-TRADE-BR_GATE6_HANDOFF_PACKAGE_V0.1.md`
  - current Brazil correction `RES-TRADE-BR_GATE6_HANDOFF_PACKAGE_V0.2.md`
- Approved evidence read: the current B/C files named by those packages and each page's 2026-09-07 fresh-official-recheck record.

## Overall disposition

`NO_MATERIAL_CHANGE_LOCATED_IN_BOUNDED_OFFICIAL_CHECK` for all four pages.

This result supports consuming the unchanged, dated approved copy during the present implementation window only if the runtime freshness controls below are implemented. It does not convert the approved 7 September wording into an 8 September content revision. Several official portals could not be fully extracted; therefore the implementation must retain discovery-bounded wording and must not express an absolute “no later event exists” conclusion.

## RES-TRADE-EU

### Official URLs and current observations

1. [Commission Implementing Regulation (EU) 2025/4](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R0004)
   - Accessible in this check.
   - EUR-Lex still labels the document `In force`.
   - The title and text still identify a definitive anti-dumping duty on the defined titanium dioxide product originating in China. No amendment marker was located on the rendered text page during this check.
2. [Notice C/2026/4533](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52026XC04533)
   - The official EUR-Lex result remains dated 25 August 2026 and describes reopening an Article 12 absorption reinvestigation.
   - The notice still says the reinvestigation should normally conclude within six months and no later than nine months from publication.
   - No later EUR-Lex document referring to this notice was located in the bounded official-domain search performed on 8 September.
3. [European Commission anti-dumping measures](https://policy.trade.ec.europa.eu/enforcement-and-protection/trade-defence/anti-dumping-measures_en)
   - Exact approved URL retained.
   - The extraction service returned an internal error, so current body text and update metadata were not independently read in this run.
4. [European Commission TARIC information](https://taxation-customs.ec.europa.eu/online-services/online-services-and-databases-customs/eu-customs-tariff-taric_en)
   - Accessible and still resolves to the Commission's EU Customs Tariff (TARIC) information surface.
   - No transaction-specific TARIC query, commodity classification, origin decision, VAT result, or shipment treatment was attempted.

### Comparison with approved text

- No material contradiction or later official event was located.
- The approved distinction remains supportable in this bounded check: Regulation 2025/4 is displayed as in force; Notice C/2026/4533 is a pending absorption reinvestigation and does not itself replace the fixed-duty table.
- No approved wording, rate tuple, scope predicate, link, or visible date should be changed by D16 from this evidence alone.
- Access limit: the Commission explainer could not be extracted. The “no later document” observation is discovery-bounded and does not prove the absence of an unpublished, unindexed, transaction-specific, or temporarily inaccessible event.

### Required freshness and suppression controls

- Resource Trade Update owner assessment before implementation consumes the record as current.
- Official-source recheck on the day of publication or within the separately approved publication window.
- Maximum interval while the procedure remains active: 30 calendar days; next scheduled maximum remains 7 October 2026 unless an earlier trigger occurs.
- Triggered recheck within two business days of a new notice, regulation/amendment, result, judgment, or relevant TARIC change.
- Keep visible copy, visible date, API/CMS data, metadata, social projection, GEO output, Schema, and Hub summaries on the same reviewed source revision.
- If status, rate, scope, or procedure facts are due or unverified, suppress the affected current-law output, Hub summary, GEO answer, Schema/social/API and other machine facts. Do not use the prior state or another `site_scope` as fallback, and do not expose internal freshness labels publicly.

## RES-TRADE-UK

### Official URLs and current observations

1. [TRA public file: AD0086](https://public-file.trade-remedies.service.gov.uk/case/ad0086/)
   - Accessible in this check.
   - Still displays `Active`, `Dumping Investigation`, initiation date 3 March 2026, and `Last Updated 02 Sep 2026`.
   - The newest listed public-file item remains dated 2 September 2026. No provisional or definitive measure label was found on the case page.
2. [Trade Remedies Notice 2026/14](https://www.gov.uk/government/publications/trade-remedies-notice-registration-of-imports-of-rutile-titanium-dioxide-originating-from-china/trade-remedies-notice-202614-registration-of-imports-of-rutile-titanium-dioxide-originating-from-china)
   - Accessible. It remains published 26 March 2026 and directs registration from 27 March 2026 for the described goods.
   - The page still presents registration as applying to goods in an ongoing investigation to which an anti-dumping amount may later be applied; it does not itself publish a current AD0086 amount.
3. [GOV.UK Trade Remedies Notices collection](https://www.gov.uk/government/collections/trade-remedies-notices)
   - Accessible. The collection still lists the titanium-dioxide registration notice dated 26 March 2026.
   - No later titanium-dioxide provisional, definitive, or stop-registration notice was located in the rendered collection. The collection page itself displays `Last updated 10 August 2026`, so this is a bounded collection observation rather than proof that every official surface is complete.
4. [UK Trade Tariff](https://www.gov.uk/trade-tariff)
   - Accessible as the current commodity-code, duty, and VAT lookup entry point.
   - No product/route transaction was submitted and no numerical tariff/VAT result was derived.
5. [HMRC trade remedies guidance](https://www.gov.uk/guidance/trade-remedies)
   - Exact approved URL retained.
   - The extraction service returned an internal error, so current body text and update metadata were not independently read in this run.
6. [HMRC Northern Ireland tariff-route guidance](https://www.gov.uk/hmrc-internal-manuals/customs-cds-volume-3-tariff-step-by-step-guide/cdssg08020)
   - Accessible and still resolves to the HMRC CDS step-by-step commodity-code and taxes guidance used for the GB/Northern Ireland route boundary.
7. Supplemental evidence URL referenced by the dated evidence record: [Moving goods into Northern Ireland as not at risk](https://www.gov.uk/guidance/check-if-you-can-declare-goods-you-bring-into-northern-ireland-not-at-risk-of-moving-to-the-eu)
   - Not part of the six-link approved Buyer Copy source list. It remains a supporting official route/eligibility reference and should not be promoted into public copy without content approval.

### Comparison with approved text

- No material contradiction or post-7-September case event was located.
- The approved dated answer remains supportable in this bounded check: AD0086 is displayed as active; registration remains separate from a duty rate; no current provisional or definitive AD0086 amount was located in the checked case page and GOV.UK collection.
- No approved wording, scope/code predicate, link, or visible date should be changed by D16 from this evidence alone.
- Access limits: the HMRC trade-remedies guidance page could not be extracted, and the collection's own update date predates this check. The negative finding must remain tied to the named checked entry points and date.

### Required freshness and suppression controls

- Complete the official-source refresh before implementation and before first publication.
- Recheck at most every 30 days while AD0086 remains active/unresolved; derived latest scheduled date is 7 October 2026 unless an earlier trigger occurs.
- Trigger within two business days of any AD0086 status, scope, code, or timetable change; provisional/final action; registration stop notice; or material GB/Northern Ireland tariff-route change.
- Apply an owner-approved refresh across visible copy, metadata, social, GEO, Schema, CMS/API data, and Hub/ItemList relations together.
- If freshness is due, a trigger is unresolved, or scope/current status cannot be established, withhold the affected current-status output and related Hub/ItemList/GEO/Schema/machine projections. Return a diagnosable safe response under the existing architecture; do not serve stale or foreign-scope copy and do not show internal workflow states.

## RES-TRADE-IN

### Official URLs and current observations

1. [DGTR titanium dioxide case page](https://dgtr.gov.in/en/anti-dumping-cases/anti-dumping-investigation-concerning-imports-titanium-dioxide-originating-or)
   - Accessible in this check.
   - Its event table still ends with `Final Findings` dated 03/08/2026 and still displays `Last Updated: 02/09/2026 14:36`.
   - No later DGTR case event was displayed.
2. [DGTR remand final findings dated 3 August 2026](https://dgtr.gov.in/sites/default/files/2026-08/Titanium%20eng%20ncv_signed%20(1).pdf)
   - Accessible as a 97-page official PDF.
   - It remains dated 3 August 2026 and identifies the 2026 remand final findings. Nothing in this check turns its recommended amounts into a Ministry of Finance implementation notification or a verified payable shipment duty.
3. [CBIC Tax Information Portal notification explorer](https://taxinformation.cbic.gov.in/content-page/explore-notification)
   - The extraction service returned an internal error; a complete current notification result list could not be retrieved.
   - Bounded official-domain searches did not locate a later matching titanium-dioxide Customs (ADD) implementation notification. Results concerning natural mica pearl pigment, standards, food-grade material, or other products were excluded.
4. [eGazette of India](https://egazette.gov.in/)
   - Portal extraction returned an internal error.
   - Official-domain discovery did not locate a matching later implementation notification. Unrelated titanium-dioxide/pearlescent-pigment and standards records were excluded.
5. [ICEGATE Customs Duty Calculator](https://www.icegate.gov.in/Webappl/index_imp.jsp)
   - Extraction returned an internal error. No tariff input was submitted and no BCD, ADD, IGST, exemption, or total import-cost result was obtained.
6. [CBIC GST goods and services rates](https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html)
   - Accessible as the official rate-schedule surface.
   - No classification or exemption determination was made; the approved qualified schedule context must remain qualified.

### Comparison with approved text

- No material contradiction or later matching official implementation event was located.
- The approved dated answer remains supportable only in its bounded form: the DGTR page still ends with the 3 August 2026 remand final findings, while no later titanium-dioxide implementation notification was located in the checked Ministry of Finance/CBIC/eGazette discovery entry points.
- The recommended amounts remain recommendations, not a verified current payable duty. No approved row, condition, exclusion, link, or visible date should be changed by D16 from this evidence alone.
- Access limits are material: CBIC notification explorer, eGazette, and ICEGATE could not be fully read. This check cannot prove the absolute absence of a notification or determine a shipment.

### Required freshness and suppression controls

- Bind the Gate 8 implementation receipt to this fresh first-party check and retain the checked URLs, time, limits, and bounded result.
- Recheck before implementation and before release; at most 30 days while the matter remains unresolved. Derived latest scheduled date is 7 October 2026 unless an earlier trigger occurs.
- Trigger within two business days of a new Ministry of Finance/CBIC Customs (ADD) notification, DGTR corrigendum, court order, or relevant ICEGATE/CBIC tariff change.
- If the official record changes, send the affected copy, metadata, and machine semantics to the Resource Trade Update/content owner; developers must not silently revise legal wording or dates in code.
- If freshness is overdue, an event trigger is unresolved, or the checked source set cannot support the dated status, prevent release of the affected page/current-status output and its Hub, GEO, Schema, metadata/social/API projections. Do not use another market/site record or expose `CURRENT`, `REVIEW_DUE`, `STALE_HOLD`, Gate, or Finding labels.

## RES-TRADE-BR

### Official URLs and current observations

1. [MDIC measures in force index](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/defesa-comercial-e-interesse-publico/medidas-em-vigor/medidas-em-vigor)
   - Accessible; page displays `Atualizado em 04/09/2026 10h40`.
   - It still lists `Pigmento de dióxido de titânio` as `Direito Antidumping Definitivo`, origin China, through `24/10/2030`, with no suspension note beside the item.
2. [MDIC titanium dioxide measure detail](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/defesa-comercial-e-interesse-publico/medidas-em-vigor/medidas-em-vigor/pigmentos-dioxido-titanio-md)
   - Accessible; page still displays `Atualizado em 28/10/2025 09h59`, definitive measure, NCM 3206.11.10, China, Resolution 802, and the four amount bands.
   - The detail page still contains the stale Siegwerk entry. The approved Resolution 850 override therefore remains necessary; the detail-page list must not be treated as the current exhaustive assignment list.
3. [Resolution GECEX 802/2025 in the Diário Oficial da União](https://www.in.gov.br/en/web/dou/-/resolucao-gecex-n-802-de-23-de-outubro-de-2025-664870357)
   - Direct extraction returned an internal/access error in this run. The exact approved URL is retained; no replacement source was treated as equivalent legal authority.
4. [Resolution GECEX 850/2026 direct page](https://www.gov.br/mdic/pt-br/assuntos/camex/resolucoes/gecex/resolucao-gecex-no-850-de-30-de-janeiro-de-2026)
   - Direct extraction returned an internal/access error in this run.
5. [Official GECEX resolutions index entry for Resolution 850/2026](https://www.gov.br/mdic/pt-br/assuntos/camex/resolucoes/resolucoes?b_start:int=120)
   - Accessible. The indexed description still states that Resolution 850 addresses exclusion of Siegwerk Druckfarben AG & CO KGAA from the producer/exporter list identified in Resolution 802.
6. [MDIC titanium dioxide public-interest evaluation](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/defesa-comercial-e-interesse-publico/investigacoes/avaliacoes-de-interesse-publico/dioxido-de-titanio-ip)
   - Accessible; still displays `Atualizado em 26/08/2026 13h56`, opening on 27 March 2026, and final-submissions deadline 4 September 2026.
   - The displayed publications remain Circulars 21 and 82. No final public-interest decision is displayed on this page.
7. [MDIC DECOM publications in 2026](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/defesa-comercial-e-interesse-publico/publicacoes-do-decom-no-diario-oficial-da-uniao/publicacoes-do-decom-em-2026)
   - Accessible. It still lists Circular 82 for titanium dioxide and later entries through 4 September for other products.
   - No later titanium-dioxide public-interest final decision, suspension, alteration, or termination was located in the rendered page.
8. [MDIC Technical Note SEI 786/2026](https://www.gov.br/mdic/pt-br/assuntos/camex/outros-documentos/notas/deferimentos/237a-reuniao-ordinaria-do-comite-executivo-de-gestao-gecex/extrato-publico-nt-786_2026-pigmento-rutilo.pdf/@@download/file)
   - Official PDF discovery remained available and continues to expose the narrow Ex-001 description. No shipment eligibility or ordinary-tariff entitlement was inferred.

### Comparison with approved text

- No material post-7-September contradiction or later titanium-dioxide event was located in the named official entry points.
- The approved dated statements remain supportable in bounded form: the definitive measure remains listed through 24 October 2030; Resolution 850 remains the later correction removing Siegwerk from Resolution 802's named list; the public-interest page still shows the proceeding/deadline and no final decision on that page.
- The MDIC measure detail remains stale as to Siegwerk, exactly as the approved B/C evidence warns. This is not a new approved-copy change, but it is an active implementation guard: never project the older detail-page name list without the Resolution 850 correction.
- Brazil V0.2's corrected dependency remains authoritative: the PT-BR support link must be exactly `/pt-br/markets/brazil/` and must be live, same-scope, and accepted before the affected path/complete-site release. This route correction is separate from the official-source freshness result.
- Access limits: direct DOU Resolution 802 and direct Resolution 850 extraction failed. Current conclusions rely on the accessible first-party MDIC index/detail/proceeding/publication surfaces and bounded official-domain discovery; they do not prove that every later record was discoverable.

### Required freshness and suppression controls

- Recheck before implementation; recheck on the same day before first publication; at most every 30 days while the public-interest procedure remains unresolved. Derived latest scheduled date is 7 October 2026 unless an earlier trigger occurs.
- Trigger within two business days of a new GECEX resolution, SECEX circular, final public-interest decision, suspension/revision, court order, expiry change, or relevant tariff/classification change.
- Persist the source URL, supported predicate, source publication/update date where available, page review date, internal review status, next scheduled recheck, event-trigger state, and auditable update record under `site_scope=tio2-my`.
- If current facts are due, changed, or unverified, block affected body/current-status output, metadata, social, Schema, API/CMS projections, Hub/GEO summaries, and publication until the content owner records an approved refreshed result.
- Never fall back to another scope, silently edit legal wording/dates, expose internal freshness labels, retain stale Siegwerk logic, assign a replacement amount band, or treat the 4 September submissions deadline as a final outcome.

## Implementation handoff note

For Gate 8, this check can be attached as dated implementation-window evidence with result `no material change located / bounded by named surfaces and access limits`. It is not itself an approved Buyer Copy revision. Keep the public `Last reviewed: 7 September 2026` value until the Resource Trade Update/content owner approves a coordinated update. Every page must fail closed for affected stale/unverified facts across visible, cache, API/CMS, metadata, social, GEO, Schema, and Hub surfaces without cross-scope fallback.
