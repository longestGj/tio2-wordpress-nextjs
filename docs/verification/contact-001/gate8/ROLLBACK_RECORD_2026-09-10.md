# CONTACT-001 Gate 8 rollback record

- Baseline commit: `9571dd2ab7e7f2c7c9cb373e008ca81b3c534822`.
- Implementation commit: `619bd75afd2a4725d9efe9f2e0e0baa3bf3c515e`.
- Branch: `codex/contact-001-gate8`; the branch is not merged or pushed.
- Code rollback: discard this isolated branch/worktree and retain the baseline commit.
- Local CMS rollback: remove the local-only `tio2_contact_page` record with ID `18641`, or recreate the local WordPress container from the selected baseline. No production CMS write occurred.
- Runtime rollback: stop the held processes on ports `4490` and `4491`; no deployment, publication, DNS or indexing action occurred.
- Release hold: CONTACT-DEP03/04/06/09/10 remain open, so Contact is absent from the public sitemap inventory and the form cannot create a success state.
