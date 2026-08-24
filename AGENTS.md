# Project workflow

- Use installed Superpowers skills for design, planning, implementation, debugging, review, and verification. This repository defines no custom project agents or project-specific Skills.
- Normal business-page and template development targets Site A only.
- Site B remains in the shared repository and WordPress installation, but do not develop its business pages or templates unless the user separately changes that scope.
- Keep the Homepage free of product-page and application-page links until the user separately approves those links.
- During normal development, run only tests directly related to the change. Single-site or two-site builds and a small number of critical E2E tests are allowed when they are necessary for the change.
- Do not run `verify:root-only` as a routine development check. It is reserved for release or the formal 505-to-1 migration and requires fresh, separate explicit user authorization.
- Formal migration, deployment, DNS changes, indexing, remote writes, and production operations require separate explicit user authorization.
