# Tag Assistant Preview observation

- Date: 2026-09-13
- Site scope: `tio2-my`
- Runtime: `http://127.0.0.1:3123/request-a-quote/`
- Container: `GTM-MWQVK7J4`, Preview version
- GA4 property: `G-QDHLMRH2WB`
- Method: user-shared Tag Assistant Preview session plus a controlled local Chromium session. Preview authorization parameters were kept outside committed evidence.
- Form safety: no form was submitted. The three approved, non-PII events were pushed directly to `dataLayer` after Analytics consent so the three GTM event tags could be verified without contacting the form receiver.

Observed behavior:

1. Initial Consent Mode state was denied for `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization`.
2. Accept Analytics changed only `analytics_storage` to granted. `_ga` and `_ga_QDHLMRH2WB` were created for host `127.0.0.1`, path `/`, with an observed duration of about 400 days.
3. Necessary only restored the application consent record to denied and removed both Malaysia GA cookies.
4. A fresh page load while accepted sent exactly one `page_view` to `G-QDHLMRH2WB` with `gcs=G101`. Initial and withdrawn page loads used `gcs=G100`.
5. `rfq_provider_accepted`, `documents_provider_accepted`, and `sample_provider_accepted` each fired the corresponding Preview tag once and each produced one GA4 request to `G-QDHLMRH2WB` with `gcs=G101`.
6. Each business-event request contained only `site_scope`, `page_id`, `source`, and `form_type`. No buyer or form-field data was pushed. No other container or measurement ID appeared in the target-page request set.

The screenshots show the relevant Tag Assistant UI states. `tagassistant-runtime-evidence.json` records the sanitized network request fields, cookie metadata, event payloads, phases, and cross-scope check. It contains no Preview authorization token or form data.
