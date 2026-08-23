# WordPress homepage field contract

Read this reference in Design, Implement, and Audit modes. It is the stable `homepage-v0.1` field and identity inventory; labels may change, field keys and machine names may not.

## Content identity

- Post type: `tio2_homepage`; GraphQL single/plural: `Tio2Homepage` / `Tio2Homepages`.
- Registration: `public=false`, `show_ui=true`, `show_in_rest=true`, `show_in_graphql=true`, `publicly_queryable=false`, `has_archive=false`, `rewrite=false`; supports only internal title and revisions, with no Gutenberg body.
- Identity: schema version `homepage-v0.1`, public path `/`, internal slug `${siteId}--homepage`, and exactly one supported `site_scope`.
- At most one non-revision, non-autosave record per site across draft, pending, private, published, and trash. Page/Post root conflicts, duplicates, missing/multiple/unsupported scopes, cross-site values, wrong versions, and wrong slugs fail closed.
- `GetHomepage` uses `idType: SLUG`, then the adapter revalidates site, version, `/`, status, bounds, evidence, and links. Published reads accept only published records; Preview accepts only the signed session's site-owned draft.

All strings are trimmed before required/length checks. All copy is plain text; no WYSIWYG, flexible content, arbitrary HTML, editable canonical, or editor-controlled section order. Site paths use lowercase letters, digits, and single hyphens; except fixed `#rfq`, reject fragments, query, protocol, host, missing current-site targets, and cross-site targets. Images accept JPEG, PNG, WebP, or AVIF; missing optional images use a text-first layout.

## Stable top-level and repeated fields

| Stable key / machine name | Type and cardinality | Exact validation or bound | GraphQL → DTO → rendering |
|---|---|---|---|
| `field_tio2_home_schema_version` / `homepage_schema_version` | hidden text, required | default and only `homepage-v0.1` | `schemaVersion` → `identity.schemaVersion` → route/adapter |
| `field_tio2_home_hero_eyebrow` / `hero_eyebrow` | text, required | 1–80 characters | `heroEyebrow` → `hero.eyebrow` → `HomepageHero` |
| `field_tio2_home_hero_heading` / `hero_heading` | text, required | 1–90; page's only H1 | `heroHeading` → `hero.heading` → `HomepageHero` |
| `field_tio2_home_hero_summary` / `hero_summary` | textarea, required | 1–320 | `heroSummary` → `hero.summary` → `HomepageHero` |
| `field_tio2_home_hero_primary_label` / `hero_primary_label` | text, required | 1–32; href fixed `#rfq` | `heroPrimaryLabel` → `hero.primaryCta.label` → `HomepageHero` |
| `field_tio2_home_hero_secondary_label` / `hero_secondary_label` | text, required | 1–32 | `heroSecondaryLabel` → `hero.secondaryCta.label` → `HomepageHero` |
| `field_tio2_home_hero_secondary_path` / `hero_secondary_path` | text, required | site-relative, max 172, not `/` | `heroSecondaryPath` → `hero.secondaryCta.href` → `HomepageHero` |
| `field_tio2_home_hero_image` / `hero_image` | image ID, optional single | supported MIME; absent uses text-first layout | `heroImage` → `hero.image` → `HomepageHero` |
| `field_tio2_home_hero_image_alt` / `hero_image_alt` | text, conditionally required | informative image 1–160; decorative image empty string | `heroImageAlt` → `hero.image.alt` → `HomepageHero` |
| `field_tio2_home_metrics` / `metrics` | repeater, 0–4 | no empty rows; empty array hides section | `metrics[]` → `metrics[]` → `CompanyMetrics` |
| `field_tio2_home_metric_value` / `metric_value` | repeater child text, required | 1–24 | `value` → `value` → metric item |
| `field_tio2_home_metric_unit` / `metric_unit` | repeater child text, optional | 0–16 | `unit` → `unit` → metric item |
| `field_tio2_home_metric_label` / `metric_label` | repeater child text, required | 1–60 | `label` → `label` → metric item |
| `field_tio2_home_metric_context` / `metric_context` | repeater child text, optional | 0–120 | `context` → `context` → metric item |
| `field_tio2_home_metric_claim_basis` / `metric_claim_basis` | repeater child select, required | `user_confirmed` or `source_required` | editor validation only; omit from UI DTO |
| `field_tio2_home_metric_evidence_url` / `metric_evidence_url` | repeater child URL, conditional | HTTPS; required for `source_required` | editor validation only; omit from UI DTO |
| `field_tio2_home_products_heading` / `products_heading` | text, required | 1–90 | `productsHeading` → `productDiscovery.heading` → `ProductDiscovery` |
| `field_tio2_home_products_intro` / `products_intro` | textarea, required | 1–240 | `productsIntro` → `productDiscovery.intro` → `ProductDiscovery` |
| `field_tio2_home_product_routes` / `product_routes` | repeater, 2–6 | unique, deterministic, current-site paths | `productRoutes[]` → `productRoutes[]` → `ProductDiscovery` |
| `field_tio2_home_product_title` / `product_title` | repeater child text, required | 1–80 | `title` → `title` → product card |
| `field_tio2_home_product_summary` / `product_summary` | repeater child textarea, required | 1–220 | `summary` → `summary` → product card |
| `field_tio2_home_product_path` / `product_path` | repeater child text, required | site-relative, max 172, target exists | `path` → `href` → product card |
| `field_tio2_home_product_image` / `product_image` | repeater child image, optional | supported MIME | `image` → `image` → product card |
| `field_tio2_home_product_image_alt` / `product_image_alt` | repeater child text, conditional | same rule as Hero image alt | `imageAlt` → `image.alt` → product card |
| `field_tio2_home_applications_heading` / `applications_heading` | text, required | 1–90 | `applicationsHeading` → `applicationDiscovery.heading` → `ApplicationDiscovery` |
| `field_tio2_home_applications_intro` / `applications_intro` | textarea, required | 1–240 | `applicationsIntro` → `applicationDiscovery.intro` → `ApplicationDiscovery` |
| `field_tio2_home_applications` / `applications` | repeater, 3–6 | each has name, summary, path, optional image/alt; unique current-site path | `applications[]` → `applications[]` → `ApplicationDiscovery` |
| `field_tio2_home_inquiry_heading` / `inquiry_heading` | text, required | 1–90 | `inquiryHeading` → `inquiry.heading` → `InquiryProcess` |
| `field_tio2_home_inquiry_steps` / `inquiry_steps` | repeater, exactly 3 | title 1–70; description 1–220; number from position | `inquirySteps[]` → `inquiry.steps[]` → `InquiryProcess` |
| `field_tio2_home_trust_heading` / `trust_heading` | text, required | 1–90 | `trustHeading` → `trust.heading` → `SupplierTrust` |
| `field_tio2_home_trust_intro` / `trust_intro` | textarea, required | 1–240 | `trustIntro` → `trust.intro` → `SupplierTrust` |
| `field_tio2_home_trust_reasons` / `trust_reasons` | repeater, 3–4 | title, description, claim basis, optional evidence URL; no empty item | `trustReasons[]` → `trust.reasons[]` → `SupplierTrust` |
| `field_tio2_home_rfq_heading` / `rfq_heading` | text, required | 1–90 | `rfqHeading` → `rfq.heading` → `RfqSection` |
| `field_tio2_home_rfq_intro` / `rfq_intro` | textarea, required | 1–260; state that v0.1 does not send/store | `rfqIntro` → `rfq.intro` → `RfqSection` |
| `field_tio2_home_rfq_labels` / `rfq_labels` | group, required | fixed label keys listed below | `rfqLabels` → `rfq.labels` → `RfqForm` |
| `field_tio2_home_rfq_submit_label` / `rfq_submit_label` | text, required | 1–32 | `rfqSubmitLabel` → `rfq.submitLabel` → `RfqForm` |
| `field_tio2_home_rfq_privacy_text` / `rfq_privacy_text` | textarea, required | 1–240; say local demo does not send/save | `rfqPrivacyText` → `rfq.privacyText` → `RfqForm` |
| `field_tio2_home_rfq_success_heading` / `rfq_success_heading` | text, required | 1–80; do not claim inquiry received | `rfqSuccessHeading` → `rfq.success.heading` → success state |
| `field_tio2_home_rfq_success_message` / `rfq_success_message` | textarea, required | 1–240; explicitly no transmission | `rfqSuccessMessage` → `rfq.success.message` → success state |
| `field_tio2_home_faq_heading` / `faq_heading` | text, required | 1–90 | `faqHeading` → `faq.heading` → `HomepageFaq` |
| `field_tio2_home_faqs` / `faqs` | repeater, 3–6 | question 1–160; answer 1–600; optional related label/path; unique questions | `faqs[]` → `faqs[]` → `HomepageFaq` |
| `field_tio2_home_closing_heading` / `closing_heading` | text, required | 1–90 | `closingHeading` → `closingCta.heading` → `ClosingInquiryCta` |
| `field_tio2_home_closing_body` / `closing_body` | textarea, required | 1–220 | `closingBody` → `closingCta.body` → `ClosingInquiryCta` |
| `field_tio2_home_closing_label` / `closing_label` | text, required | 1–32; href fixed `#rfq` | `closingLabel` → `closingCta.label` → `ClosingInquiryCta` |
| `field_tio2_home_seo_title` / `seo_title` | text, required | 1–60 | `seoTitle` → `seo.title` → Metadata |
| `field_tio2_home_seo_description` / `seo_description` | textarea, required | 1–160 | `seoDescription` → `seo.description` → Metadata |
| `field_tio2_home_og_image` / `og_image` | image, optional | supported MIME; absent uses safe site default | `ogImage` → `seo.ogImage` → Metadata |
| `field_tio2_home_primary_topic` / `primary_topic` | text, required | 1–80; never emit meta keywords | editor config → `seo.primaryTopic` |
| `field_tio2_home_secondary_topics` / `secondary_topics` | repeater, 0–10 | each 1–80; deduplicate; never emit meta keywords | editor config → `seo.secondaryTopics[]` |

## Stable nested keys

The following child keys are equally stable. Where section 7.2 assigns bounds at the parent-row level, that row bound is repeated here. “No separate numeric bound” means the approved spec defines required/optional state and parent validation but no independent character count; do not invent one without a revised proposal.

| Parent | Stable child key / machine name | Approved validation |
|---|---|---|
| applications | `field_tio2_home_application_name` / `application_name` | required plain text; no separate numeric bound |
| applications | `field_tio2_home_application_summary` / `application_summary` | required plain text; no separate numeric bound |
| applications | `field_tio2_home_application_path` / `application_path` | required unique current-site path; no separate numeric bound |
| applications | `field_tio2_home_application_image` / `application_image` | optional supported image |
| applications | `field_tio2_home_application_image_alt` / `application_image_alt` | conditional, same informative/decorative alt rule |
| inquiry steps | `field_tio2_home_inquiry_step_title` / `inquiry_step_title` | required, 1–70 |
| inquiry steps | `field_tio2_home_inquiry_step_description` / `inquiry_step_description` | required, 1–220 |
| trust reasons | `field_tio2_home_trust_reason_title` / `trust_reason_title` | required plain text; no separate numeric bound |
| trust reasons | `field_tio2_home_trust_reason_description` / `trust_reason_description` | required plain text; no separate numeric bound |
| trust reasons | `field_tio2_home_trust_reason_claim_basis` / `trust_reason_claim_basis` | required `user_confirmed` or `source_required` |
| trust reasons | `field_tio2_home_trust_reason_evidence_url` / `trust_reason_evidence_url` | optional HTTPS; required when basis is `source_required` |
| RFQ labels | `field_tio2_home_rfq_label_name` / `rfq_label_name` | required group label; no separate numeric bound |
| RFQ labels | `field_tio2_home_rfq_label_company` / `rfq_label_company` | required group label; no separate numeric bound |
| RFQ labels | `field_tio2_home_rfq_label_country_region` / `rfq_label_country_region` | required group label; no separate numeric bound |
| RFQ labels | `field_tio2_home_rfq_label_work_email` / `rfq_label_work_email` | required group label; no separate numeric bound |
| RFQ labels | `field_tio2_home_rfq_label_buyer_type` / `rfq_label_buyer_type` | required group label; no separate numeric bound |
| RFQ labels | `field_tio2_home_rfq_label_interest` / `rfq_label_interest` | required group label; no separate numeric bound |
| RFQ labels | `field_tio2_home_rfq_label_expected_quantity` / `rfq_label_expected_quantity` | required label for optional input; no separate numeric bound |
| RFQ labels | `field_tio2_home_rfq_label_destination` / `rfq_label_destination` | required label for optional input; no separate numeric bound |
| RFQ labels | `field_tio2_home_rfq_label_message` / `rfq_label_message` | required group label; no separate numeric bound |
| RFQ labels | `field_tio2_home_rfq_label_privacy` / `rfq_label_privacy` | required group label; no separate numeric bound |
| RFQ labels | `field_tio2_home_rfq_buyer_industrial_label` / `rfq_buyer_industrial_label` | required label for stable value `industrial` |
| RFQ labels | `field_tio2_home_rfq_buyer_distributor_label` / `rfq_buyer_distributor_label` | required label for stable value `distributor` |
| RFQ labels | `field_tio2_home_rfq_buyer_other_label` / `rfq_buyer_other_label` | required label for stable value `other` |
| FAQs | `field_tio2_home_faq_question` / `faq_question` | required, 1–160; unique within record |
| FAQs | `field_tio2_home_faq_answer` / `faq_answer` | required, 1–600 |
| FAQs | `field_tio2_home_faq_related_label` / `faq_related_label` | optional plain text; no separate numeric bound |
| FAQs | `field_tio2_home_faq_related_path` / `faq_related_path` | optional current-site path paired with label; no separate numeric bound |
| secondary topics | `field_tio2_home_secondary_topic` / `secondary_topic` | 1–80; deduplicate; 0–10 parent rows |

## RFQ interaction contract

The visible fields are Name, Company, Country/Region, Work Email, Buyer Type, Product/Application Interest, Expected Quantity, Destination, Message, and Privacy acknowledgement. Required: name, company, country/region, work email, buyer type, interest, message, and privacy. Optional: expected quantity and destination. Exact maximum lengths are 80, 120, 80, 254, 160, 80, 120, and 1200 respectively for name, company, country/region, work email, interest, expected quantity, destination, and message. Use native `type=email`; privacy is never preselected; buyer values are exactly `industrial`, `distributor`, and `other`.

The same final field, identity, route, uniqueness, link, and evidence constraints apply to Admin/ACF saves and WP-CLI/programmatic writes. Draft, pending, private, and trash records retain homepage identity; revisions and autosaves do not reserve another identity.
