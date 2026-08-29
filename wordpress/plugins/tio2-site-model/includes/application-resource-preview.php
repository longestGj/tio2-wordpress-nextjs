<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * The PHP runtime copy of the approved Task 2 identity inventory. These are
 * editorial identities, not route-discovery data; callers must never derive
 * canonical paths from WordPress permalinks.
 *
 * @return array<string, array{slug: string, path: string, level: string, family: string, parentId: string|null}>
 */
function tio2_site_a_application_identities(): array
{
    $rows = [
        ['applications-hub', 'applications', '/applications', 'hub', 'All', null],
        ['coatings', 'coatings', '/applications/coatings', 'category', 'Coatings', 'applications-hub'],
        ['plastics', 'plastics', '/applications/plastics', 'category', 'Plastics', 'applications-hub'],
        ['printing-inks', 'printing-inks', '/applications/printing-inks', 'category', 'Printing Inks', 'applications-hub'],
        ['decorative-paper', 'decorative-paper', '/applications/decorative-paper', 'category', 'Decorative Paper', 'applications-hub'],
        ['solar-film', 'solar-film', '/applications/solar-film', 'category', 'Solar Film', 'applications-hub'],
        ['high-purity', 'high-purity', '/applications/high-purity', 'category', 'Functional', 'applications-hub'],
        ['water-based-paint', 'titanium-dioxide-for-water-based-paint', '/applications/titanium-dioxide-for-water-based-paint', 'detail', 'Coatings', 'coatings'],
        ['masterbatch', 'titanium-dioxide-for-masterbatch', '/applications/titanium-dioxide-for-masterbatch', 'detail', 'Plastics', 'plastics'],
        ['polycarbonate', 'titanium-dioxide-for-polycarbonate', '/applications/titanium-dioxide-for-polycarbonate', 'detail', 'Engineering Plastics', 'plastics'],
        ['printing-ink', 'titanium-dioxide-for-printing-ink', '/applications/titanium-dioxide-for-printing-ink', 'detail', 'Printing Inks', 'printing-inks'],
        ['photovoltaic-white-film', 'titanium-dioxide-for-photovoltaic-white-film', '/applications/titanium-dioxide-for-photovoltaic-white-film', 'detail', 'Solar Film', 'solar-film'],
        ['mlcc-electronic-ceramics', 'high-purity-titanium-dioxide-for-mlcc', '/applications/high-purity-titanium-dioxide-for-mlcc', 'detail', 'Functional', 'high-purity'],
        ['outdoor-pvc', 'titanium-dioxide-for-outdoor-pvc', '/applications/titanium-dioxide-for-outdoor-pvc', 'detail', 'Plastics', 'plastics'],
        ['film-masterbatch', 'titanium-dioxide-for-film-masterbatch', '/applications/titanium-dioxide-for-film-masterbatch', 'detail', 'Plastics', 'plastics'],
        ['soft-pvc-solar-backsheet', 'titanium-dioxide-for-soft-pvc-solar-backsheet', '/applications/titanium-dioxide-for-soft-pvc-solar-backsheet', 'detail', 'Plastics / Solar', 'plastics'],
        ['lcp-high-temperature-plastics', 'titanium-dioxide-for-lcp', '/applications/titanium-dioxide-for-lcp', 'detail', 'Engineering Plastics', 'plastics'],
        ['uv-resistant-engineering-plastics', 'uv-resistant-titanium-dioxide-engineering-plastics', '/applications/uv-resistant-titanium-dioxide-engineering-plastics', 'detail', 'Engineering Plastics', 'plastics'],
        ['decorative-paper-detail', 'titanium-dioxide-for-decorative-paper', '/applications/titanium-dioxide-for-decorative-paper', 'detail', 'Decorative Paper', 'decorative-paper'],
        ['laminated-decorative-paper', 'titanium-dioxide-for-laminated-decorative-paper', '/applications/titanium-dioxide-for-laminated-decorative-paper', 'detail', 'Decorative Paper', 'decorative-paper'],
        ['electrophoretic-coating', 'titanium-dioxide-for-electrophoretic-coating', '/applications/titanium-dioxide-for-electrophoretic-coating', 'detail', 'Coatings', 'coatings'],
        ['high-pvc-flat-paint', 'titanium-dioxide-for-high-pvc-paint', '/applications/titanium-dioxide-for-high-pvc-paint', 'detail', 'Coatings', 'coatings'],
        ['automotive-coatings', 'titanium-dioxide-for-automotive-coatings', '/applications/titanium-dioxide-for-automotive-coatings', 'detail', 'Coatings', 'coatings'],
        ['waterborne-automotive-coatings', 'titanium-dioxide-for-waterborne-automotive-coatings', '/applications/titanium-dioxide-for-waterborne-automotive-coatings', 'detail', 'Coatings', 'coatings'],
        ['marine-aerospace-protective', 'titanium-dioxide-for-protective-coatings', '/applications/titanium-dioxide-for-protective-coatings', 'detail', 'Coatings', 'coatings'],
        ['powder-coil-coatings', 'titanium-dioxide-for-powder-coil-coatings', '/applications/titanium-dioxide-for-powder-coil-coatings', 'detail', 'Coatings', 'coatings'],
        ['universal-multi-application', 'multi-purpose-titanium-dioxide', '/applications/multi-purpose-titanium-dioxide', 'detail', 'Cross-application', 'applications-hub'],
        ['functional-materials', 'high-purity-titanium-dioxide-functional-materials', '/applications/high-purity-titanium-dioxide-functional-materials', 'detail', 'Functional', 'high-purity'],
    ];

    $identities = [];
    foreach ($rows as [$id, $slug, $path, $level, $family, $parent_id]) {
        $identities[$id] = compact('slug', 'path', 'level', 'family') + ['parentId' => $parent_id];
    }
    return $identities;
}

/**
 * @param list<string> $actual
 * @param list<string> $expected
 */
function tio2_editorial_same_members(array $actual, array $expected): bool
{
    return count($actual) === count(array_unique($actual)) &&
        count($expected) === count(array_unique($expected)) &&
        [] === array_diff($actual, $expected) &&
        [] === array_diff($expected, $actual);
}

/**
 * @param array<string, list<array{targetType: string, targetKey: string, title: string, path: string, href: string|null}>> $relationships
 */
function tio2_application_relationship_graph_is_canonical(string $application_id, array $relationships): bool
{
    $expected_children = [];
    foreach (tio2_site_a_application_identities() as $id => $identity) {
        if ($identity['parentId'] === $application_id) {
            $expected_children[] = $id;
        }
    }
    $actual_children = array_values(array_map(
        static fn (array $link): string => 'application' === $link['targetType'] ? $link['targetKey'] : '',
        $relationships['childApplications'] ?? []
    ));
    if (! tio2_editorial_same_members($actual_children, $expected_children)) {
        return false;
    }

    if ('universal-multi-application' !== $application_id) {
        return true;
    }
    $related_application_ids = array_values(array_map(
        static fn (array $link): string => 'application' === $link['targetType'] ? $link['targetKey'] : '',
        $relationships['relatedApplications'] ?? []
    ));
    return [] === array_diff(['coatings', 'plastics', 'printing-inks'], $related_application_ids);
}

/**
 * @return array<string, array{slug: string, path: string, kind: string, cluster: string}>
 */
function tio2_site_a_resource_identities(): array
{
    $rows = [
        ['resources-hub', 'resources', '/resources', 'hub', 'Hub'],
        ['article-01', 'rutile-vs-anatase-titanium-dioxide', '/resources/rutile-vs-anatase-titanium-dioxide', 'article', 'TiO₂ Fundamentals'],
        ['article-02', 'chloride-vs-sulfate-titanium-dioxide', '/resources/chloride-vs-sulfate-titanium-dioxide', 'article', 'TiO₂ Fundamentals'],
        ['article-03', 'tio2-content-vs-performance', '/resources/tio2-content-vs-performance', 'article', 'TiO₂ Fundamentals'],
        ['article-04', 'titanium-dioxide-oil-absorption', '/resources/titanium-dioxide-oil-absorption', 'article', 'Performance'],
        ['article-05', 'cbu-titanium-dioxide-meaning', '/resources/cbu-titanium-dioxide-meaning', 'article', 'Performance'],
        ['article-06', 'titanium-dioxide-surface-treatment', '/resources/titanium-dioxide-surface-treatment', 'article', 'Performance'],
        ['article-07', 'evaluate-titanium-dioxide-alternative', '/resources/evaluate-titanium-dioxide-alternative', 'article', 'Grade Replacement'],
        ['article-08', 'reduce-tio2-cost-high-pvc-paint', '/resources/reduce-tio2-cost-high-pvc-paint', 'article', 'Application Testing'],
        ['article-09', 'titanium-dioxide-polycarbonate-yellowing', '/resources/titanium-dioxide-polycarbonate-yellowing', 'article', 'Application Testing'],
        ['article-10', 'titanium-dioxide-outdoor-durability', '/resources/titanium-dioxide-outdoor-durability', 'article', 'Application Testing'],
    ];

    $identities = [];
    foreach ($rows as [$id, $slug, $path, $kind, $cluster]) {
        $identities[$id] = compact('slug', 'path', 'kind', 'cluster');
    }
    return $identities;
}

function tio2_editorial_plain_text(string $value): string
{
    $decoded = html_entity_decode(wp_strip_all_tags($value, true), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $normalized = preg_replace('/\s+/u', ' ', $decoded);
    return trim(is_string($normalized) ? $normalized : $decoded);
}

/** @param mixed $value */
function tio2_editorial_contains_unsafe_value($value): bool
{
    if (is_string($value)) {
        $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $claim_scan = 'Can TP-C410 be treated as a replacement for TP-C300?' === trim($decoded)
            ? ''
            : str_replace(
                [
                    'not intended as guaranteed specifications',
                    'not guaranteed specifications',
                ],
                '',
                $decoded
            );
        $claim_scan = preg_replace(
            '/\b(?:finished-product approval|customer approval|approval criteria|approval method|approval plan|approval stage)\b/iu',
            '',
            $claim_scan
        );
        if (! is_string($claim_scan)) {
            return true;
        }
        if (
            tio2_product_contains_private_document_location($decoded) ||
            1 === preg_match(
                '~(?:\bon[a-z]+\s*=|javascript\s*:|(?:^|[\s"\'(<])/(?:documents/tds|tds|var|home|usr|etc|opt|tmp|private|root)(?:/|(?=$|[\s"\'<>),.;:!?#]))|\b(?:manufacturer|legal\s+entity|reviewer|source\s+(?:file|path)|approval|price|stock|availability|guarantee(?:d|s)?|competitor|equivalent(?:\s+to)?|replacement\s+for)\b)~iu',
                $claim_scan
            )
        ) {
            return true;
        }

        if (0 < preg_match_all('~<\s*(/?)\s*([a-z][a-z0-9]*)([^>]*)>~iu', $decoded, $tags, PREG_SET_ORDER)) {
            $allowed_tags = [
                'p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'a', 'br',
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
            ];
            foreach ($tags as $tag) {
                $name = strtolower((string) $tag[2]);
                if (! in_array($name, $allowed_tags, true)) {
                    return true;
                }
                $attributes = trim((string) $tag[3], " \t\n\r\0\x0B/");
                if ('' === $attributes) {
                    continue;
                }
                if ('a' !== $name || '/' === $tag[1]) {
                    return true;
                }
                $unsupported_attributes = preg_replace(
                    '~(?:^|\s+)(?:href|title)\s*=\s*(?:"[^"]*"|\'[^\']*\')~iu',
                    '',
                    $attributes
                );
                if (! is_string($unsupported_attributes) || '' !== trim($unsupported_attributes)) {
                    return true;
                }
                if (1 === preg_match('~\bhref\s*=\s*(["\'])(.*?)\1~iu', $attributes, $href_match)) {
                    $href = (string) $href_match[2];
                    if (! tio2_is_valid_public_path($href) || '/' !== $href && str_ends_with($href, '/')) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    if (! is_array($value)) {
        return false;
    }
    foreach ($value as $item) {
        if (tio2_editorial_contains_unsafe_value($item)) {
            return true;
        }
    }
    return false;
}

function tio2_editorial_public_href(WP_Post $post, string $path, bool $route_is_approved): ?string
{
    if (! $route_is_approved || 'publish' !== $post->post_status) {
        return null;
    }
    if ('tio2_product' === $post->post_type) {
        $validation = tio2_validate_product_contract((int) $post->ID);
        $product_id = get_field('product_id', $post->ID, false);
        if (
            is_wp_error($validation) ||
            'tio2-a' !== tio2_product_site_id((int) $post->ID) ||
            ! is_string($product_id) ||
            1 !== preg_match(tio2_product_id_pattern(), $product_id) ||
            tio2_product_path_from_id($product_id) !== $path
        ) {
            return null;
        }
        return $path;
    }
    if (function_exists('is_post_publicly_viewable') && ! is_post_publicly_viewable($post)) {
        return null;
    }
    return $path;
}

/**
 * @return array{targetType: string, targetKey: string, title: string, path: string, href: string|null}|WP_Error
 */
function tio2_editorial_link_for_post(WP_Post $post, string $expected_post_type): array|WP_Error
{
    if ($post->post_type !== $expected_post_type || ! tio2_application_resource_is_exact_site_a((int) $post->ID)) {
        return new WP_Error('tio2_editorial_relation_invalid', 'Editorial relationship target is outside its approved type or scope.');
    }

    if ('tio2_application' === $expected_post_type) {
        $errors = tio2_validate_application_record((int) $post->ID);
        $id = (string) get_field('application_id', $post->ID, false);
        $identity = tio2_site_a_application_identities()[$id] ?? null;
        $matches = is_array($identity) && $identity['slug'] === $post->post_name &&
            $identity['level'] === (string) get_field('application_level', $post->ID, false) &&
            $identity['family'] === (string) get_field('family', $post->ID, false);
        $target_type = 'application';
    } elseif ('tio2_document' === $expected_post_type) {
        $errors = tio2_validate_resource_record((int) $post->ID);
        $id = (string) get_field('resource_id', $post->ID, false);
        $identity = tio2_site_a_resource_identities()[$id] ?? null;
        $matches = is_array($identity) && $identity['slug'] === $post->post_name &&
            $identity['kind'] === (string) get_field('resource_kind', $post->ID, false) &&
            $identity['cluster'] === (string) get_field('cluster', $post->ID, false);
        $target_type = 'resource';
    } elseif ('tio2_product' === $expected_post_type) {
        $validation = tio2_validate_product_contract((int) $post->ID);
        $errors = is_wp_error($validation) ? [$validation->get_error_message()] : [];
        $id = (string) get_field('product_id', $post->ID, false);
        $identity = 1 === preg_match(tio2_product_id_pattern(), $id)
            ? ['slug' => tio2_product_slug_from_id($id), 'path' => tio2_product_path_from_id($id)]
            : null;
        $matches = is_array($identity) && $identity['slug'] === $post->post_name;
        $target_type = 'product';
    } else {
        return new WP_Error('tio2_editorial_relation_invalid', 'Editorial relationship target type is unsupported.');
    }

    $title = tio2_editorial_plain_text((string) get_the_title($post));
    if ([] !== $errors || ! $matches || ! is_array($identity) || '' === $title) {
        return new WP_Error('tio2_editorial_relation_incomplete', 'Editorial relationship target is incomplete or has a non-canonical identity.');
    }

    $definitions = 'tio2_application' === $expected_post_type
        ? tio2_application_field_definitions()
        : ('tio2_document' === $expected_post_type ? tio2_resource_field_definitions() : tio2_product_field_definitions());
    $safe_values = [$title];
    foreach ($definitions as $definition) {
        if (is_array($definition) && ! empty($definition['name'])) {
            $safe_values[] = get_field((string) $definition['name'], $post->ID, false);
        }
    }
    if (tio2_editorial_contains_unsafe_value($safe_values)) {
        return new WP_Error('tio2_editorial_relation_unsafe', 'Editorial relationship target contains unsafe content.');
    }

    $path = (string) $identity['path'];
    return [
        'targetType' => $target_type,
        'targetKey' => $id,
        'title' => $title,
        'path' => $path,
        'href' => tio2_editorial_public_href(
            $post,
            $path,
            tio2_publication_route_is_approved('tio2-a', $path)
        ),
    ];
}

/**
 * @param mixed $value
 * @return list<array{targetType: string, targetKey: string, title: string, path: string, href: string|null}>|WP_Error
 */
function tio2_editorial_links($value, string $expected_post_type): array|WP_Error
{
    $items = is_array($value) ? array_values($value) : (in_array($value, [null, false, ''], true) ? [] : [$value]);
    $links = [];
    $seen_posts = [];
    $seen_identities = [];
    $seen_paths = [];
    foreach ($items as $item) {
        $post = $item instanceof WP_Post ? $item : (is_numeric($item) ? get_post((int) $item) : null);
        if (! $post instanceof WP_Post || isset($seen_posts[$post->ID])) {
            return new WP_Error('tio2_editorial_relation_invalid', 'Editorial relationship is unresolved or duplicated.');
        }
        $seen_posts[$post->ID] = true;
        $link = tio2_editorial_link_for_post($post, $expected_post_type);
        if (is_wp_error($link)) {
            return $link;
        }
        $identity_key = $link['targetType'] . ':' . $link['targetKey'];
        if (isset($seen_identities[$identity_key]) || isset($seen_paths[$link['path']])) {
            return new WP_Error('tio2_editorial_relation_invalid', 'Editorial relationship has a duplicate canonical identity or path.');
        }
        $seen_identities[$identity_key] = true;
        $seen_paths[$link['path']] = true;
        $links[] = $link;
    }
    return $links;
}

/** @param mixed $value @return list<string> */
function tio2_editorial_item_rows($value, string $key = 'item'): array
{
    $rows = is_array($value) ? array_values($value) : [];
    return array_map(static fn ($row): string => is_array($row) ? (string) ($row[$key] ?? '') : '', $rows);
}

/** @param mixed $value @return list<array{id: string, heading: string, html: string}> */
function tio2_editorial_sections($value): array
{
    $rows = is_array($value) ? array_values($value) : [];
    return array_map(static fn ($row): array => [
        'id' => is_array($row) ? (string) ($row['section_id'] ?? '') : '',
        'heading' => is_array($row) ? (string) ($row['heading'] ?? '') : '',
        'html' => is_array($row) ? (string) ($row['html'] ?? '') : '',
    ], $rows);
}

/** @param mixed $value @return list<array{question: string, answerHtml: string}> */
function tio2_editorial_faqs($value): array
{
    $rows = is_array($value) ? array_values($value) : [];
    return array_map(static fn ($row): array => [
        'question' => is_array($row) ? (string) ($row['question'] ?? '') : '',
        'answerHtml' => is_array($row) ? (string) ($row['answer'] ?? '') : '',
    ], $rows);
}

/** @param mixed $value @return list<array{kind: string, label: string, href: string}>|WP_Error */
function tio2_editorial_ctas($value): array|WP_Error
{
    $rows = is_array($value) ? array_values($value) : [];
    $ctas = [];
    foreach ($rows as $row) {
        $href = is_array($row) ? (string) ($row['href'] ?? '') : '';
        if (! tio2_is_valid_public_path($href)) {
            return new WP_Error('tio2_editorial_cta_invalid', 'Editorial CTA must use a canonical internal path.');
        }
        $ctas[] = [
            'kind' => (string) ($row['kind'] ?? ''),
            'label' => (string) ($row['label'] ?? ''),
            'href' => $href,
        ];
    }
    return $ctas;
}

/** @param mixed $value @return list<array{productId: string, role: string, label: string, summaryHtml: string}> */
function tio2_editorial_starting_products($value): array
{
    if (! is_array($value)) {
        return [];
    }
    return array_values(array_map(
        static fn (array $row): array => [
            'productId' => (string) ($row['product_id'] ?? ''),
            'role' => (string) ($row['role'] ?? ''),
            'label' => (string) ($row['label'] ?? ''),
            'summaryHtml' => (string) ($row['summary_html'] ?? ''),
        ],
        array_filter($value, 'is_array')
    ));
}

/** @return array<string, mixed>|WP_Error */
function tio2_serialize_application_fields(WP_Post $post): array|WP_Error
{
    if ('tio2_application' !== $post->post_type || ! tio2_application_resource_is_exact_site_a((int) $post->ID)) {
        return new WP_Error('tio2_editorial_not_found', 'Application is outside the protected Site A contract.');
    }
    if ([] !== tio2_validate_application_record((int) $post->ID)) {
        return new WP_Error('tio2_editorial_incomplete', 'Application contract is incomplete.');
    }
    if ('' === tio2_editorial_plain_text((string) get_the_title($post))) {
        return new WP_Error('tio2_editorial_incomplete', 'Application title is required.');
    }
    $id = (string) get_field('application_id', $post->ID, false);
    $identity = tio2_site_a_application_identities()[$id] ?? null;
    if (! is_array($identity) || $identity['slug'] !== $post->post_name ||
        $identity['level'] !== (string) get_field('application_level', $post->ID, false) ||
        $identity['family'] !== (string) get_field('family', $post->ID, false)) {
        return new WP_Error('tio2_editorial_identity_invalid', 'Application identity is not canonical.');
    }

    $parent_links = tio2_editorial_links(get_field('parent_application', $post->ID, false), 'tio2_application');
    if (is_wp_error($parent_links)) {
        return $parent_links;
    }
    $parent_key = [] === $parent_links ? null : $parent_links[0]['targetKey'];
    if ($parent_key !== $identity['parentId']) {
        return new WP_Error('tio2_editorial_identity_invalid', 'Application parent does not match its canonical identity.');
    }

    $relationship_fields = [];
    foreach ([
        'childApplications' => ['child_applications', 'tio2_application'],
        'relatedApplications' => ['related_applications', 'tio2_application'],
        'relatedResources' => ['related_resources', 'tio2_document'],
        'relatedProducts' => ['related_products', 'tio2_product'],
    ] as $output_name => [$field_name, $post_type]) {
        $links = tio2_editorial_links(get_field($field_name, $post->ID, false), $post_type);
        if (is_wp_error($links)) {
            return $links;
        }
        $relationship_fields[$output_name] = $links;
    }
    if (! tio2_application_relationship_graph_is_canonical($id, $relationship_fields)) {
        return new WP_Error('tio2_editorial_graph_invalid', 'Application relationships do not match the canonical Application graph.');
    }
    $ctas = tio2_editorial_ctas(get_field('ctas', $post->ID, false));
    if (is_wp_error($ctas)) {
        return $ctas;
    }

    $fields = [
        'applicationId' => $id,
        'applicationLevel' => (string) get_field('application_level', $post->ID, false),
        'family' => (string) get_field('family', $post->ID, false),
        'parentApplication' => [] === $parent_links ? null : $parent_links[0],
        'metaTitle' => (string) get_field('meta_title', $post->ID, false),
        'metaDescription' => (string) get_field('meta_description', $post->ID, false),
        'eyebrow' => (string) get_field('eyebrow', $post->ID, false),
        'headline' => (string) get_field('headline', $post->ID, false),
        'directAnswer' => (string) get_field('direct_answer', $post->ID, false),
        'applicationContext' => (string) get_field('application_context', $post->ID, false),
        'buyerProblem' => (string) get_field('buyer_problem', $post->ID, false),
        'selectionFactors' => tio2_editorial_item_rows(get_field('selection_factors', $post->ID, false)),
        'powderDataLimits' => (string) get_field('powder_data_limits', $post->ID, false),
        'validationPlan' => tio2_editorial_item_rows(get_field('validation_plan', $post->ID, false)),
        'customerInputs' => tio2_editorial_item_rows(get_field('customer_inputs', $post->ID, false)),
        'bodySections' => tio2_editorial_sections(get_field('body_sections', $post->ID, false)),
        'startingProducts' => tio2_editorial_starting_products(get_field('starting_products', $post->ID, false)),
        'faqItems' => tio2_editorial_faqs(get_field('faq_items', $post->ID, false)),
    ] + $relationship_fields + [
        'ctas' => $ctas,
        'technicalDisclaimer' => (string) get_field('technical_disclaimer', $post->ID, false),
    ];
    return tio2_editorial_contains_unsafe_value([$post->post_title, $fields])
        ? new WP_Error('tio2_editorial_unsafe', 'Application contains unsafe content.')
        : $fields;
}

/** @return array<string, mixed>|WP_Error */
function tio2_serialize_resource_fields(WP_Post $post): array|WP_Error
{
    if ('tio2_document' !== $post->post_type || ! tio2_application_resource_is_exact_site_a((int) $post->ID)) {
        return new WP_Error('tio2_editorial_not_found', 'Technical Resource is outside the protected Site A contract.');
    }
    if ([] !== tio2_validate_resource_record((int) $post->ID)) {
        return new WP_Error('tio2_editorial_incomplete', 'Technical Resource contract is incomplete.');
    }
    if ('' === tio2_editorial_plain_text((string) get_the_title($post))) {
        return new WP_Error('tio2_editorial_incomplete', 'Technical Resource title is required.');
    }
    $id = (string) get_field('resource_id', $post->ID, false);
    $identity = tio2_site_a_resource_identities()[$id] ?? null;
    if (! is_array($identity) || $identity['slug'] !== $post->post_name ||
        $identity['kind'] !== (string) get_field('resource_kind', $post->ID, false) ||
        $identity['cluster'] !== (string) get_field('cluster', $post->ID, false)) {
        return new WP_Error('tio2_editorial_identity_invalid', 'Technical Resource identity is not canonical.');
    }

    $relationship_fields = [];
    foreach ([
        'childResources' => ['child_resources', 'tio2_document'],
        'relatedApplications' => ['related_applications', 'tio2_application'],
        'relatedResources' => ['related_resources', 'tio2_document'],
        'relatedProducts' => ['related_products', 'tio2_product'],
    ] as $output_name => [$field_name, $post_type]) {
        $links = tio2_editorial_links(get_field($field_name, $post->ID, false), $post_type);
        if (is_wp_error($links)) {
            return $links;
        }
        $relationship_fields[$output_name] = $links;
    }
    $ctas = tio2_editorial_ctas(get_field('ctas', $post->ID, false));
    if (is_wp_error($ctas)) {
        return $ctas;
    }

    $comparison = get_field('comparison_table', $post->ID, false);
    $comparison_table = null;
    if (is_array($comparison) && [] !== $comparison) {
        $column_rows = $comparison['columns']
            ?? $comparison['field_tio2_resource_comparison_table_columns']
            ?? [];
        $comparison_rows = $comparison['rows']
            ?? $comparison['field_tio2_resource_comparison_table_rows']
            ?? [];
        $columns = tio2_editorial_item_rows($column_rows, 'label');
        $rows = array_map(static fn ($row): array => [
                'cells' => is_array($row)
                    ? tio2_editorial_item_rows(
                        $row['cells']
                            ?? $row['field_tio2_resource_comparison_table_rows_cells']
                            ?? [],
                        'value'
                    )
                    : [],
            ], is_array($comparison_rows) ? array_values($comparison_rows) : []);
        if ([] !== $columns || [] !== $rows) {
            $comparison_table = ['columns' => $columns, 'rows' => $rows];
        }
    }
    $fields = [
        'resourceId' => $id,
        'resourceKind' => (string) get_field('resource_kind', $post->ID, false),
        'cluster' => (string) get_field('cluster', $post->ID, false),
        'metaTitle' => (string) get_field('meta_title', $post->ID, false),
        'metaDescription' => (string) get_field('meta_description', $post->ID, false),
        'eyebrow' => (string) get_field('eyebrow', $post->ID, false),
        'headline' => (string) get_field('headline', $post->ID, false),
        'directAnswer' => (string) get_field('direct_answer', $post->ID, false),
        'keyTakeaways' => tio2_editorial_item_rows(get_field('key_takeaways', $post->ID, false)),
        'sections' => tio2_editorial_sections(get_field('sections', $post->ID, false)),
        'comparisonTable' => $comparison_table,
        'practicalImplications' => tio2_editorial_item_rows(get_field('practical_implications', $post->ID, false)),
        'commonMistakes' => tio2_editorial_item_rows(get_field('common_mistakes', $post->ID, false)),
        'evaluationMethod' => tio2_editorial_item_rows(get_field('evaluation_method', $post->ID, false)),
        'faqItems' => tio2_editorial_faqs(get_field('faq_items', $post->ID, false)),
    ] + $relationship_fields + [
        'ctas' => $ctas,
        'technicalDisclaimer' => (string) get_field('technical_disclaimer', $post->ID, false),
    ];
    return tio2_editorial_contains_unsafe_value([$post->post_title, $fields])
        ? new WP_Error('tio2_editorial_unsafe', 'Technical Resource contains unsafe content.')
        : $fields;
}

/** @return array{id: string, databaseId: int, siteId: string, path: string, slug: string, title: string, modifiedGmt: string, status: string}|WP_Error */
function tio2_editorial_preview_identity(WP_Post $post, string $path): array|WP_Error
{
    if ('draft' !== $post->post_status || ! tio2_application_resource_is_exact_site_a((int) $post->ID)) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }
    $modified = get_post_modified_time('Y-m-d\TH:i:s', true, $post);
    if (! is_string($modified) || '' === $modified) {
        $modified = get_gmt_from_date((string) $post->post_modified, 'Y-m-d\TH:i:s');
    }
    return [
        'id' => (string) $post->ID,
        'databaseId' => (int) $post->ID,
        'siteId' => 'tio2-a',
        'path' => $path,
        'slug' => $post->post_name,
        'title' => tio2_editorial_plain_text((string) get_the_title($post)),
        'modifiedGmt' => is_string($modified) ? $modified : '',
        'status' => $post->post_status,
    ];
}

function tio2_find_application_for_preview(string $site_id, string $path): ?WP_Post
{
    if ('tio2-a' !== $site_id) {
        return null;
    }
    $expected_id = null;
    $expected = null;
    foreach (tio2_site_a_application_identities() as $id => $identity) {
        if ($identity['path'] === $path) {
            $expected_id = $id;
            $expected = $identity;
            break;
        }
    }
    if (null === $expected || null === $expected_id) {
        return null;
    }
    $posts = get_posts(['post_type' => 'tio2_application', 'post_status' => 'draft', 'name' => $expected['slug'], 'posts_per_page' => -1, 'no_found_rows' => true, 'orderby' => 'ID', 'order' => 'ASC']);
    $posts = array_values(array_filter($posts, static function ($post) use ($expected_id): bool {
        if (! $post instanceof WP_Post || ! tio2_application_resource_is_exact_site_a((int) $post->ID)) {
            return false;
        }
        $fields = tio2_serialize_application_fields($post);
        return ! is_wp_error($fields) && $expected_id === $fields['applicationId'];
    }));
    if (1 !== count($posts)) {
        return null;
    }
    return $posts[0];
}

function tio2_find_resource_for_preview(string $site_id, string $path): ?WP_Post
{
    if ('tio2-a' !== $site_id) {
        return null;
    }
    $expected_id = null;
    $expected = null;
    foreach (tio2_site_a_resource_identities() as $id => $identity) {
        if ($identity['path'] === $path) {
            $expected_id = $id;
            $expected = $identity;
            break;
        }
    }
    if (null === $expected || null === $expected_id) {
        return null;
    }
    $posts = get_posts(['post_type' => 'tio2_document', 'post_status' => 'draft', 'name' => $expected['slug'], 'posts_per_page' => -1, 'no_found_rows' => true, 'orderby' => 'ID', 'order' => 'ASC']);
    $posts = array_values(array_filter($posts, static function ($post) use ($expected_id): bool {
        if (! $post instanceof WP_Post || ! tio2_application_resource_is_exact_site_a((int) $post->ID)) {
            return false;
        }
        $fields = tio2_serialize_resource_fields($post);
        return ! is_wp_error($fields) && $expected_id === $fields['resourceId'];
    }));
    if (1 !== count($posts)) {
        return null;
    }
    return $posts[0];
}

/** @return array<string, mixed>|WP_Error */
function tio2_serialize_application_preview(WP_Post $post): array|WP_Error
{
    if ('tio2_application' !== $post->post_type) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }
    $id = (string) get_field('application_id', $post->ID, false);
    $identity = tio2_site_a_application_identities()[$id] ?? null;
    $base = tio2_editorial_preview_identity($post, is_array($identity) ? $identity['path'] : '');
    if (is_wp_error($base)) {
        return $base;
    }
    $fields = tio2_serialize_application_fields($post);
    return is_wp_error($fields)
        ? new WP_Error('tio2_preview_application_incomplete', 'Application preview contract is incomplete or unsafe.', ['status' => 422, 'validationCode' => $fields->get_error_code()])
        : $base + ['applicationFields' => $fields];
}

/** @return array<string, mixed>|WP_Error */
function tio2_serialize_resource_preview(WP_Post $post): array|WP_Error
{
    if ('tio2_document' !== $post->post_type) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }
    $id = (string) get_field('resource_id', $post->ID, false);
    $identity = tio2_site_a_resource_identities()[$id] ?? null;
    $base = tio2_editorial_preview_identity($post, is_array($identity) ? $identity['path'] : '');
    if (is_wp_error($base)) {
        return $base;
    }
    $fields = tio2_serialize_resource_fields($post);
    return is_wp_error($fields)
        ? new WP_Error('tio2_preview_resource_incomplete', 'Technical Resource preview contract is incomplete or unsafe.', ['status' => 422, 'validationCode' => $fields->get_error_code()])
        : $base + ['resourceFields' => $fields];
}
