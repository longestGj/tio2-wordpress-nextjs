# Project agent routing

- Product detail template design, implementation, revision, or audit must be delegated to the project custom agent `tio2_product_template`, which must use the project skill `$tio2-product-template`.
- The parent agent owns user clarification, approval capture, orchestration, independent review, and any separately authorized external action. It must not implement Product template work in place of the specialist.
- Do not route homepage templates, bulk product content production, DNS, Vercel, indexing, or unrelated site work to the Product template agent.
- All Product template work follows `docs/agents/template-agent-shared-contract.md`. Without an approved proposal ID, the specialist remains in read-only Design mode.
