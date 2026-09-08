# Country / editorial integration review

Reviewed 2026-09-08 by the independent D16 integration-review subagent. This is technical review, not D23 independent acceptance or Gate 9/10 closure.

## Scope and identity

- Site: `tio2-my`; local candidate `http://127.0.0.1:3226`; WordPress `http://127.0.0.1:8186/graphql`.
- Code: `4fa585bc125c7b8fa926ab66059f4fc6887877f4`, branch `codex/country-editorial-integration`; build `1AwBNw0A1szLVVlTyLyQU`, `.next-country-editorial`.
- Inputs: integration plan; existing nine-page delivery at `a5230cd`; Country repairs `d764c36` and `47307b8`, incorporated as `c0f33af` and `c15de45`.
- Review covers preservation of Country repairs, shared consumers, editorial font ownership, relevant verification evidence, and limitations affecting ES-G9-F03 / IN-G9-F01.

## Source review result

No additional production integration defect found in this bounded review.

Fresh Git comparisons against `47307b8` show no differences in EN/MS root layouts, Country/market components and contracts, or shared Chrome/Consent production files. The Country body retains its locally scoped Inter variable, `--font-my-country-market`; shared Header, Footer and Cookie UI explicitly retain Arial. Spain's secondary hover underline, typography and action styles, Belgium's inline punctuation/focus handling, and Country keyboard behavior remain represented by the approved source.

The sole runtime adaptation after the Country cherry-picks is the editorial renderer's local Inter variable class. It supplies the existing `--font-my-shared` dependency to the nine editorial mains without restoring a body-level font injection. Search found no remaining consumers of that variable outside editorial styles. Shared Chrome/Consent specify their own fonts and do not inherit the editorial face. No approved editorial body/CSS/payload, link, identity, source hash, or Country route was changed by this adaptation.

Test updates match the approved menu's Close-first / single-RFQ-last traversal. Evidence-directory overrides keep this run separate from older captures. The TypeScript configuration adds the candidate build's generated types. Site A/B production branches and business templates were not modified by the integration adaptation.

## Evidence inspected

The reviewer read the current execution logs rather than rerunning the parent's tests:

- `.tmp/integration-tests-final.log`: 479 tests across 51 files passed.
- `.tmp/country-editorial-build.log`: optimized production compilation, TypeScript and static-page generation completed; `.tmp/country-editorial-typecheck.log` and `.tmp/country-editorial-eslint.log` inspected alongside the parent's successful exit reports.
- `.tmp/country-editorial-browser.log`: **46 passed, 1 failed**. The failed RFQ case is retained below. The nine editorial page cases, actual native 200% zoom case, targeted Country repairs, and legal/Cookie cases passed.
- [Runtime identity](runtime-identity.json), [five-target results](results.json), and `.tmp/country-editorial-five.log`: five approved Country-entry / editorial-target / browser-return chains on the same build; the older `3029` candidate still returns 404 for those targets. These are inspected generated records, not a separate reviewer browser run.

The reviewer actually opened **21 PNG files** with the image-viewing tool:

- All nine `native/<page-id>-menu.png` and nine `native/<page-id>-cookie.png` files for `RES-TRADE-EU`, `RES-TRADE-UK`, `RES-TRADE-IN`, `RES-TRADE-BR`, `APP-COAT`, `APP-PLAS`, `APP-MB`, `APP-INK`, `APP-PAPER`.
- [APP-COAT desktop target](APP-COAT-target-1440.png), [APP-COAT native top](native/APP-COAT-top.png), and [EU Trade native top](native/RES-TRADE-EU-top.png).

All inspected menus show readable text, appropriate Resources/Applications current state, one RFQ navigation item, and a visible gold Close focus ring. All inspected Cookie dialogs show complete readable text, both actions, and visible Close focus without a clipped dialog. APP-COAT desktop and native views show readable editorial typography and an intact shared header. The EU native top capture shows readable body but omits most of the header at the upper edge; it is **not** evidence of a complete header capture. Native JSON ties the sample to this build and records real zoom (`dpr` 1 to 2, CSS width 1424 to 712).

## Remaining limits

The Country editable-form test fails at Spain's RFQ destination field because this candidate has no configured receiver access key and renders the existing unavailable form state. The parent diagnosed the absent environment configuration; the reviewer also inspected the failing log and source where `receiverAccessKey` selects `form_ready` versus `service_unavailable`. This is an explicit candidate configuration limitation, not evidence that all Country conversion paths passed. Subsequent document-form steps in that combined case were not reached. No provider acceptance, real submission or actual receipt is established.

The five editorial dependency chains and source preservation can be handed back with that limitation. D16 still owns any authorized receiver configuration/verification; D23 owns independent finding acceptance. This review does not assert every full-page screenshot or every shared consumer was visually inspected, and does not claim Site A/B runtime regression coverage. Country repair screenshots and the other target-page visuals remain the parent's separately recorded visual review.

No deployment, push, release/main merge, CMS mutation, source approval, or Gate closure was performed by this reviewer.
