# Product template contract

Read this reference in Design, Implement, and Audit modes.

## Content ownership

- Use a dedicated, managed Product content type for production product pages.
- Every Product has exactly one `site_scope` and one normalized, site-local `public_path`.
- The same commercial product appearing on both sites uses two independent Product records. A common product code may be stored as reference data but never establishes content sharing.
- Product routing, preview, webhook delivery, and cache invalidation affect only the owning site. An explicit ownership move may invalidate the exact old and new routes.

## Template shape

Use one typed Next.js product-detail orchestrator composed from focused sections. The approved design defines a fixed section order. Optional sections disappear when their validated data is absent; editors cannot arbitrarily reorder layout blocks.

The design proposal must decide at least:

- hero identity and media;
- summary and approved highlights;
- technical specification representation;
- application representation;
- packaging and supply information;
- controlled documents and downloads;
- FAQ, related-product, and inquiry behavior;
- metadata and conservative Product/WebPage structured data;
- empty, incomplete, draft, and error behavior.

## Stable boundary

The route fetches a generated GraphQL operation, the adapter validates and normalizes it into a stable `ProductDetail` DTO, and the template consumes only that DTO plus `SiteConfig`. Leaf components do not query WordPress directly.

The proposal includes a literal mapping from WordPress fields through GraphQL and DTO properties to the consuming component. Template code must not depend on raw ACF response shapes.

## Versioning

Give each approved proposal a stable ID such as `product-detail-v1`. Breaking field or DTO changes require a new proposal version, migration/default policy, and regression evidence for existing Product records.

## File ownership

The product agent may own Product schema registration, Product GraphQL operations/types/adapters, product template components, product-specific SEO, fixtures, and tests named in the approved proposal. Homepage templates and unrelated shared design-system primitives remain outside scope.
