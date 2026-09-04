# Legal / Privacy CONV-DOC V0.2 Runtime Parity — 2026-09-05

Status: `IMPLEMENTED_LOCALLY / TARGETED_READ_ONLY_REREVIEW_READY / NOT_PUBLISHED`

Review ID: `LEGAL-PRIVACY-G9-CONV-DOC-PARITY-PCR-01`

## Authority and scope

- EN source: `LEGAL-PRIV-EN_GATE2_FULL_COPY_V0.2.md`, SHA-256 `896A4CBCEE2CF5A9B19C9B65B62B7C247668A3C5C84DA17E0E61CB0B8E556A37`.
- BM source: `LEGAL-PRIV-MS_GATE2_FULL_COPY_V0.2.md`, SHA-256 `00FB18D246D7FFEA787CDB9BE06EF3B74D547607D62F4E846EFBF2DD0E4FB594`.
- Machine payload: `LEGAL_PRIVACY_CONV_DOC_POST_GATE9_SOURCE_PAYLOAD_V0.1.json`, SHA-256 `7E893B6A91EA8539C14631668CC88B3D4707B90A25D62474A077FB59A68C27A2`.
- Current authority manifest: `LEGAL_PRIVACY_CONV_DOC_POST_GATE9_CURRENT_AUTHORITY_MANIFEST_V1.2.md`, confirmed current SHA-256 `A7463D33DCA42720D486C889199D859E2D4E14217EB4FFB1298BAE1C89DBCD0D` after its dispatch-status update.
- Only `LEGAL-PRIV-EN` and `LEGAL-PRIV-MS` were updated. `LEGAL-COOKIE-EN`, shared Chrome, consent runtime, routes, layout, responsive CSS, Canonical, hreflang, robots, metadata descriptions and Schema types remain unchanged.

## Runtime parity

- Both Privacy records now declare `effectiveDate=2026-09-05`, their V0.2 source file and exact source-document SHA-256.
- Normalized Buyer-visible copy is byte-equal to each approved V0.2 Buyer-visible section:
  - EN runtime projection SHA-256 `143242D903FD9AA09D8C170340BA06211803BB35A7207269B955D63A328E22AA`.
  - BM runtime projection SHA-256 `B47CEB633A0517544469EF3047726522A281D594C3403546F771D375D993AB49`.
- Both languages expose exactly eight Request Documents fields: Full Name / Nama Penuh, Company / Syarikat, Business Email / E-mel Perniagaan, Country/Region / Negara/Rantau, Product Grade / Gred Produk, selected Document Types / Jenis Dokumen yang dipilih, optional Application/Industry / Aplikasi/Industri, and optional Additional Requirements / Keperluan Tambahan.
- The Request Documents disclosure contains zero upload, telephone/WhatsApp, Website or Market/Destination fields.
- Both policies disclose page/source context, stable request token, site/workflow identifiers and minimum routing/security data only where applicable.
- Both policies cover quotation and document-request Web3Forms processing, the current Free-plan browser-direct fixed-endpoint model, and the Access Key as a browser-available routing identifier rather than a mailbox password/private secret. Complete Buyer-visible source hashes prohibit extra unlabeled values; browser verification also compares against the configured local key without logging it and requires the only rendered email identity to be the approved privacy-contact address. No Access Key value or provider-bound recipient address is rendered.
- Both policies state the receive/review/respond, scope/document-availability assessment and necessary-follow-up purposes without guaranteeing document existence, applicability, provision or sending.
- Sample is the only future form disclosure; Document Request is described as active.
- Existing 30-day dashboard visibility, up-to-three-year provider physical-retention wording, IKHLAS three-year retention, international processing, rights and security sections remain present without substantive change outside the approved V0.2 text.

## Initial HTML and browser evidence

- The route integration test renders both policies with `renderToStaticMarkup`, asserts the exact 5 September 2026 date and Request Documents disclosure lead in initial HTML, and rejects internal-control text.
- The Playwright matrix asserts the same facts against each raw initial HTTP response and browser DOM at 390, 768 and 1440 CSS pixels. It also verifies exactly eight Request Documents list items, zero excluded fields, no Access Key identifier/value leakage, reciprocal language markup, shared Chrome, Cookie Settings behavior, no optional Analytics requests/storage, zero horizontal overflow and Axe zero violations.
- A first diagnostic E2E run exposed Next 16 development-origin blocking because the server was bound to `localhost` while the test used `127.0.0.1`; this was an environment-only hydration failure. Binding the local verification server to `127.0.0.1` produced the clean 13/13 result without runtime-code changes.

| Browser evidence | SHA-256 |
| --- | --- |
| `legal-priv-en-390.png` | `862047B81186201471781A8AC661675CDFB5B6B792C24A3E2B3E0861EA774FD3` |
| `legal-priv-en-768.png` | `8C47A093EE7BBF31C274933EA5D4E359B7F6EB1E4DF40DFF11C5039DC9E48FF2` |
| `legal-priv-en-1440.png` | `5B10A6B8490D8A7D9719BEE424E135799A15F5A01D6B5EAD34C2E4EF33154494` |
| `legal-priv-ms-390.png` | `AF7D8E5D595DFFBC973BE5FF5C51FE844A8A7780D3E2B5AD7A4476C2F77BB1C7` |
| `legal-priv-ms-768.png` | `77DC5F7AC7510B9AC4658A5C4558BE91F9FBC28F6FB550FA3731DCDA8F3B80E8` |
| `legal-priv-ms-1440.png` | `E8AD5FE2F40B24F11F0C6EE228036DBF33A4B2BEC87FF719341AE6BB26924F90` |

## Verification results

| Check | Result |
| --- | --- |
| TDD RED | 2 files: 6 expected V0.1 parity failures, 7 existing tests passed |
| Legal unit/integration/infrastructure | 6 files / 21 tests passed |
| TypeScript | `tsc --noEmit` passed |
| Changed-file ESLint | passed with zero errors |
| Preview build | passed; 35/35 static pages generated and both Privacy routes emitted |
| Legal/Privacy Playwright | 13/13 passed |
| Post-review EN/BM leakage regression | 6/6 passed after adding configured-key and approved-email-identity assertions |
| Normalized source/runtime comparison | EN `true`; BM `true` |
| Request Documents field boundary | EN 8 / forbidden 0; BM 8 / forbidden 0 |

The build and browser run used a local read-only GraphQL proxy that replaced only the Legal bundle with the checked-in V0.2 contract and forwarded all other queries to local WordPress. This avoided any production or shared local CMS write while exercising the normal Next.js query, DTO, rendering, metadata and browser paths.

## Preserved blockers and boundary

- Qualified BM legal/meaning-equivalence review remains open.
- Production Web3Forms account ownership, Access Key placement, recipient binding and authorised mailbox-receipt confirmation remain subject to the current release record.
- Production host/provider/storage/network inventory, operational-retention parity, qualified legal review and Gate 10 remain open.
- No deployment, production CMS write, publication, DNS change or indexing action was performed.
