# Existing legal E2E oracle difference

The full `tests/e2e/legal-privacy.spec.ts` run produced 13 passes and three failures. All three failures are the `LEGAL-PRIV-MS` viewport variants and compare the runtime Meta Description with `lib/seo/tio2-my-publication-inventory.data.json`.

The current production page, the current legal CMS contract, the generated content package and the local prerelease CMS public projection all use:

`Ketahui cara TiO2 Malaysia mengendalikan data pertanyaan perniagaan, penyedia perkhidmatan, tempoh penyimpanan, kuki dan pilihan privasi yang berkenaan.`

The test inventory expects a different sentence. This Finding does not authorize SEO copy changes, and the D23 production review did not identify this current sentence as a defect. The candidate-specific browser audit therefore checks the exact package value and passes all three BM viewports. The generic oracle was not changed or reported as fully passing.
