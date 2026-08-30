# Site A Current-Version Remaining Pages Scope

**Date:** 2026-08-30  
**Status:** User-approved version scope; development deferred  
**Site:** TIOVAR Site A only  

## Purpose

This record adds the remaining document-request, conversion, and legal pages to the current Site A version without authorizing implementation, publication, deployment, remote WordPress writes, or public-route activation.

## Pages included in the current version

The following seven pages are in scope and will be designed, implemented, and reviewed independently in this order:

1. Documents Hub
2. Request a TDS
3. Request a Sample
4. Request a Quote
5. Privacy Policy
6. Terms of Use
7. Cookie Policy

Each page owns its content structure, fields, validation, success state, and review. The pages may reuse the approved Site A shell, brand tokens, and site-level configuration, but this scope does not establish a shared conversion-form engine.

## Documents Hub boundary

- The current-version Documents Hub is a TDS request-entry center for the 25 approved TIOVAR products.
- It helps a visitor identify the relevant product and continue to the independent Request a TDS page.
- It does not expose TDS files or download links.
- SDS, COA, packaging information, and origin documents are not displayed, offered, or requested through the current-version Documents Hub.
- Adding other document categories later requires a separately approved scope change.

## Form-delivery boundary

- Request a TDS, Request a Sample, and Request a Quote are independent pages with independent form implementations.
- All three form types submit through Web3Forms to the same enterprise-mailbox destination.
- The final Web3Forms access-key configuration is an implementation-time environment/configuration decision and must not be hard-coded into tracked source.
- No CRM, file upload, automatic product recommendation, or WordPress submission storage is included.
- hCaptcha or another visible CAPTCHA is not included.
- The implementation must still provide client validation, submission locking, duplicate-click prevention, and clear success, validation-error, rate-limit, and service-error states.
- Form copy must accurately disclose that the submission is processed through Web3Forms and delivered by email.

## Analytics and Cookie boundary

- The current version does not include Google Analytics, advertising pixels, or other analytics/marketing tracking.
- No marketing or analytics cookie consent banner is required for this scope.
- Cookie Policy must describe only the site's actual cookie behavior and must not claim tracking that is not implemented.
- Introducing analytics, advertising tracking, or non-essential cookies later requires a separately approved implementation and corresponding policy/consent update.

## Legal-page publication gate

- Privacy Policy, Terms of Use, and Cookie Policy are included in the current version.
- The final legal entity name, registered country or region, registered address, legal contact email, and applicable law or jurisdiction will be supplied later.
- Page design and protected local preview may proceed before those values are supplied.
- These legal pages must not be activated as public production routes until the required legal-entity values are complete and the final text has received legal review.
- No placeholder legal entity or invented jurisdiction may be published.

## Current state and non-authorization

This document records version scope only. Development is intentionally paused. It does not authorize:

- page or form implementation;
- changes to `public-routes.json`;
- anonymous/public access to these routes;
- navigation activation;
- Web3Forms production submissions or credential provisioning;
- remote WordPress writes;
- deployment, DNS, indexing, or production operations;
- `verify:root-only`.

Implementation will require a new explicit user instruction and a separate approved design and plan.
