<?php

function tio2_publication_fail(string $message): void
{
    tio2_publication_test_cleanup();
    fwrite(STDERR, $message . "\n");
    exit(1);
}

$GLOBALS['tio2_publication_test_post_ids'] = [];
$GLOBALS['tio2_publication_test_errors'] = [];

function tio2_publication_test_cleanup(): void
{
    foreach ($GLOBALS['tio2_publication_test_post_ids'] ?? [] as $post_id) {
        if (get_post((int) $post_id)) {
            wp_delete_post((int) $post_id, true);
        }
    }
    $GLOBALS['tio2_publication_test_post_ids'] = [];
}

function tio2_publication_test_assert(bool $condition, string $message): void
{
    if (! $condition) {
        $GLOBALS['tio2_publication_test_errors'][] = $message;
    }
}

function tio2_publication_test_insert(array $postarr): int
{
    $post_id = wp_insert_post($postarr, true);
    if (is_wp_error($post_id) || $post_id <= 0) {
        tio2_publication_fail('Could not create publication guard fixture.');
    }
    $GLOBALS['tio2_publication_test_post_ids'][] = (int) $post_id;
    return (int) $post_id;
}

function tio2_publication_test_managed_post(
    string $post_type,
    string $path,
    array $site_scopes = ['tio2-a']
): int {
    $post_id = tio2_publication_test_insert([
        'post_type' => $post_type,
        'post_status' => 'draft',
        'post_title' => 'TiO2 publication guard fixture ' . wp_generate_uuid4(),
    ]);
    if ([] !== $site_scopes) {
        wp_set_object_terms($post_id, $site_scopes, 'site_scope', false);
    }
    update_post_meta($post_id, 'public_path', $path);
    return $post_id;
}

final class Tio2_Publication_Test_Die extends RuntimeException
{
    public WP_Error $error;

    public function __construct(WP_Error $error)
    {
        parent::__construct($error->get_error_message());
        $this->error = $error;
    }
}

function tio2_publication_test_die_handler($message, $title = '', $args = []): void
{
    $error = $message instanceof WP_Error
        ? $message
        : new WP_Error('tio2_publication_unstable_error', (string) $message);
    throw new Tio2_Publication_Test_Die($error);
}

/**
 * @return WP_Error|null
 */
function tio2_publication_test_capture_rejection(callable $callback): ?WP_Error
{
    $handler_filter = static fn (): string => 'tio2_publication_test_die_handler';
    add_filter('wp_die_handler', $handler_filter);
    try {
        $callback();
    } catch (Tio2_Publication_Test_Die $error) {
        return $error->error;
    } finally {
        remove_filter('wp_die_handler', $handler_filter);
    }
    return null;
}

function tio2_publication_test_expect_rejected_status(
    int $post_id,
    string $requested_status,
    string $expected_code,
    string $expected_message,
    array $extra_post_data = []
): void {
    $result = tio2_publication_test_capture_rejection(static function () use (
        $post_id,
        $requested_status,
        $extra_post_data
    ): void {
        wp_update_post(array_merge([
            'ID' => $post_id,
            'post_status' => $requested_status,
        ], $extra_post_data), true);
    });

    tio2_publication_test_assert(
        $result instanceof WP_Error && $expected_code === $result->get_error_code(),
        "{$requested_status} request did not return stable error {$expected_code}."
    );
    tio2_publication_test_assert(
        $result instanceof WP_Error && $expected_message === $result->get_error_message(),
        "{$requested_status} request did not return the stable publication message."
    );
    tio2_publication_test_assert(
        'draft' === get_post_status($post_id),
        "{$requested_status} request was persisted or silently rewritten instead of being rejected."
    );

    if ('draft' !== get_post_status($post_id)) {
        wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
    }
}

register_shutdown_function('tio2_publication_test_cleanup');

function tio2_assert_public_route_inventory(): void
{
    $inventory = tio2_load_public_route_inventory();
    $expected_routes = [
        'tio2-a' => ['expectedPublicUrls' => 1, 'path' => '/', 'template' => 'site-a-homepage-editorial-v0.2'],
        'tio2-b' => ['expectedPublicUrls' => 1, 'path' => '/', 'template' => 'site-b-homepage-v0.1-frozen'],
    ];

    foreach ($expected_routes as $site_id => $expected) {
        if (($inventory['sites'][$site_id]['expectedPublicUrls'] ?? null) !== $expected['expectedPublicUrls']) {
            tio2_publication_fail("Public route inventory count drifted for {$site_id}.");
        }

        if (($inventory['sites'][$site_id]['routes'] ?? null) !== [[
            'path' => $expected['path'],
            'template' => $expected['template'],
        ]]) {
            tio2_publication_fail("Public route inventory mapping drifted for {$site_id}.");
        }
    }

    foreach ([
        '{"version":"root-only-v0.1","sites":{"tio2-a":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"site-a-homepage-editorial-v0.2"}]}}}',
        '{"version":"root-only-v0.1","sites":{"tio2-a":{"expectedPublicUrls":1,"routes":[{"path":"products","template":"site-a-homepage-editorial-v0.2"}]},"tio2-b":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"site-b-homepage-v0.1-frozen"}]}}}',
        '{"version":"root-only-v0.1","sites":{"tio2-a":{"expectedPublicUrls":2,"routes":[{"path":"/","template":"site-a-homepage-editorial-v0.2"},{"path":"/","template":"site-a-homepage-editorial-v0.2"}]},"tio2-b":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"site-b-homepage-v0.1-frozen"}]}}}',
        '{"version":"root-only-v0.1","sites":{"tio2-a":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"invalid-template"}]},"tio2-b":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"site-b-homepage-v0.1-frozen"}]}}}',
        '{"version":"root-only-v0.1","sites":{"tio2-a":{"expectedPublicUrls":2,"routes":[{"path":"/","template":"site-a-homepage-editorial-v0.2"}]},"tio2-b":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"site-b-homepage-v0.1-frozen"}]}}}',
    ] as $invalid_json) {
        try {
            tio2_load_public_route_inventory_from_json($invalid_json);
            tio2_publication_fail('Invalid public route inventory was accepted.');
        } catch (InvalidArgumentException $error) {
        }
    }
}

tio2_assert_public_route_inventory();

tio2_publication_test_assert(
    function_exists('tio2_guard_managed_publication'),
    'Missing Page/Post publication guard.'
);
tio2_publication_test_assert(
    false !== has_filter('wp_insert_post_data', 'tio2_guard_managed_publication'),
    'Page/Post publication guard is not registered before persistence.'
);
tio2_publication_test_assert(
    false !== has_filter('rest_pre_insert_page', 'tio2_guard_managed_rest_publication') &&
        false !== has_filter('rest_pre_insert_post', 'tio2_guard_managed_rest_publication'),
    'Page/Post REST publication guards are not registered before persistence.'
);

$stable_messages = [
    'not_approved' => 'This Page or Post cannot be published because its exact site path is absent from the approved public route inventory.',
    'reserved_homepage' => 'The site root can be published only by its dedicated TiO2 Homepage record.',
    'invalid_scope' => 'This Page or Post cannot be published because it must have exactly one supported site scope.',
    'duplicate' => 'This Page or Post cannot be published because its site scope and public path do not have exactly one owner.',
    'invalid_path' => 'This Page or Post cannot be published because its public path is not normalized.',
];

$page_id = tio2_publication_test_managed_post('page', '/publication-guard-page');
tio2_publication_test_expect_rejected_status(
    $page_id,
    'publish',
    'tio2_publication_route_not_approved',
    $stable_messages['not_approved']
);

$post_id = tio2_publication_test_managed_post('post', '/publication-guard-post');
$future_local = gmdate('Y-m-d H:i:s', time() + (2 * DAY_IN_SECONDS));
tio2_publication_test_expect_rejected_status(
    $post_id,
    'future',
    'tio2_publication_route_not_approved',
    $stable_messages['not_approved'],
    [
        'post_date' => get_date_from_gmt($future_local),
        'post_date_gmt' => $future_local,
    ]
);

if (function_exists('tio2_validate_managed_publication_candidate')) {
    $root_error = tio2_validate_managed_publication_candidate(
        'page',
        'publish',
        'tio2-a',
        '/',
        0
    );
    tio2_publication_test_assert(
        $root_error instanceof WP_Error &&
            'tio2_publication_homepage_reserved' === $root_error->get_error_code() &&
            $stable_messages['reserved_homepage'] === $root_error->get_error_message(),
        'Page root ownership did not return the stable dedicated-Homepage error.'
    );
} else {
    tio2_publication_test_assert(false, 'Missing publication candidate validator.');
}

$unknown_scope_id = tio2_publication_test_managed_post('page', '/publication-guard-unknown', []);
tio2_publication_test_expect_rejected_status(
    $unknown_scope_id,
    'publish',
    'tio2_publication_invalid_site_scope',
    $stable_messages['invalid_scope']
);

$ambiguous_scope_id = tio2_publication_test_managed_post(
    'page',
    '/publication-guard-ambiguous',
    ['tio2-a', 'tio2-b']
);
tio2_publication_test_expect_rejected_status(
    $ambiguous_scope_id,
    'publish',
    'tio2_publication_invalid_site_scope',
    $stable_messages['invalid_scope']
);

$mixed_unknown_scope_id = tio2_publication_test_managed_post(
    'page',
    '/publication-guard-mixed-unknown',
    ['tio2-a']
);
tio2_publication_test_expect_rejected_status(
    $mixed_unknown_scope_id,
    'publish',
    'tio2_publication_invalid_site_scope',
    $stable_messages['invalid_scope'],
    ['tax_input' => ['site_scope' => ['tio2-a', 'tio2-missing-site']]]
);

$duplicate_owner_id = tio2_publication_test_managed_post('page', '/publication-guard-duplicate');
$duplicate_id = tio2_publication_test_managed_post('post', '/publication-guard-duplicate');
tio2_publication_test_expect_rejected_status(
    $duplicate_id,
    'publish',
    'tio2_publication_duplicate_route',
    $stable_messages['duplicate']
);

$ambiguous_claim_candidate_id = tio2_publication_test_managed_post(
    'page',
    '/publication-guard-ambiguous-claimant',
    ['tio2-a']
);
$ambiguous_claimant_id = tio2_publication_test_managed_post(
    'post',
    '/publication-guard-ambiguous-claimant',
    ['tio2-a', 'tio2-b']
);
tio2_publication_test_expect_rejected_status(
    $ambiguous_claim_candidate_id,
    'publish',
    'tio2_publication_duplicate_route',
    $stable_messages['duplicate']
);
tio2_publication_test_assert(
    [$ambiguous_claim_candidate_id, $ambiguous_claimant_id] ===
        tio2_find_managed_route_post_ids('tio2-a', '/publication-guard-ambiguous-claimant'),
    'Ambiguous persisted claimant was discarded from exact site/path ownership.'
);

$unnormalized_id = tio2_publication_test_managed_post('page', '/Publication-Guard-Unnormalized');
tio2_publication_test_expect_rejected_status(
    $unnormalized_id,
    'publish',
    'tio2_publication_invalid_public_path',
    $stable_messages['invalid_path']
);

$draft_id = tio2_publication_test_managed_post('page', '/publication-guard-draft-edit');
$draft_update = wp_update_post([
    'ID' => $draft_id,
    'post_title' => 'TiO2 publication guard draft edit allowed',
], true);
tio2_publication_test_assert(! is_wp_error($draft_update), 'Draft edit returned an error.');
tio2_publication_test_assert('draft' === get_post_status($draft_id), 'Draft edit changed publication status.');
tio2_publication_test_assert(
    'TiO2 publication guard draft edit allowed' === get_post_field('post_title', $draft_id),
    'Draft edit was not persisted.'
);

$original_post_values = $_POST;
try {
    $_POST = [
        'post_ID' => (string) $draft_id,
        'post_status' => 'publish',
        'tax_input' => ['site_scope' => ['tio2-a']],
    ];
    $acf_publish_validation = apply_filters(
        'acf/validate_value/name=public_path',
        true,
        '/publication-guard-draft-edit',
        [],
        'acf[field_tio2_public_path]'
    );
    tio2_publication_test_assert(
        $stable_messages['not_approved'] === $acf_publish_validation,
        'ACF publish validation did not return the stable inventory rejection.'
    );

    $_POST['tax_input']['site_scope'] = ['tio2-a', 'tio2-missing-site'];
    $acf_mixed_scope_validation = apply_filters(
        'acf/validate_value/name=public_path',
        true,
        '/publication-guard-draft-edit',
        [],
        'acf[field_tio2_public_path]'
    );
    tio2_publication_test_assert(
        $stable_messages['invalid_scope'] === $acf_mixed_scope_validation,
        'ACF mixed supported/unknown scope submission was not rejected as ambiguous.'
    );

    $_POST['post_status'] = 'draft';
    $acf_draft_validation = apply_filters(
        'acf/validate_value/name=public_path',
        true,
        '/publication-guard-draft-edit',
        [],
        'acf[field_tio2_public_path]'
    );
    tio2_publication_test_assert(true === $acf_draft_validation, 'ACF draft edit was rejected.');
} finally {
    $_POST = $original_post_values;
}

$revision_id = tio2_publication_test_insert([
    'post_type' => 'revision',
    'post_status' => 'inherit',
    'post_parent' => $draft_id,
    'post_name' => $draft_id . '-revision-v1',
    'post_title' => 'TiO2 publication guard revision',
]);
$autosave_id = tio2_publication_test_insert([
    'post_type' => 'revision',
    'post_status' => 'inherit',
    'post_parent' => $draft_id,
    'post_name' => $draft_id . '-autosave-v1',
    'post_title' => 'TiO2 publication guard autosave',
]);
tio2_publication_test_assert((bool) wp_is_post_revision($revision_id), 'Revision save was not preserved.');
tio2_publication_test_assert((bool) wp_is_post_autosave($autosave_id), 'Autosave was not preserved.');

$rest_page_id = tio2_publication_test_managed_post('page', '/publication-guard-rest');
$previous_user_id = get_current_user_id();
$administrators = get_users(['role' => 'administrator', 'number' => 1, 'fields' => 'ID']);
tio2_publication_test_assert([] !== $administrators, 'Missing administrator for REST publication test.');
if ([] !== $administrators) {
    wp_set_current_user((int) $administrators[0]);
    remove_filter('wp_insert_post_data', 'tio2_guard_managed_publication', 10);
    try {
        $rest_request = new WP_REST_Request('POST', '/wp/v2/pages/' . $rest_page_id);
        $rest_request->set_param('status', 'publish');
        $rest_response = rest_do_request($rest_request);
    } finally {
        add_filter('wp_insert_post_data', 'tio2_guard_managed_publication', 10, 4);
        wp_set_current_user($previous_user_id);
    }
    $rest_data = $rest_response->get_data();
    tio2_publication_test_assert(
        409 === $rest_response->get_status() &&
            is_array($rest_data) &&
            'tio2_publication_route_not_approved' === ($rest_data['code'] ?? null) &&
            $stable_messages['not_approved'] === ($rest_data['message'] ?? null),
        'REST publication did not return the stable inventory rejection: status=' .
            $rest_response->get_status() . '; body=' . wp_json_encode($rest_data)
    );
    tio2_publication_test_assert(
        'draft' === get_post_status($rest_page_id),
        'REST publication rejection occurred after persistence.'
    );
    if ('draft' !== get_post_status($rest_page_id)) {
        wp_update_post(['ID' => $rest_page_id, 'post_status' => 'draft']);
    }
}

foreach (['tio2-a', 'tio2-b'] as $site_id) {
    $homepage_ids = get_posts([
        'post_type' => 'tio2_homepage',
        'post_status' => 'publish',
        'fields' => 'ids',
        'posts_per_page' => -1,
        'tax_query' => [[
            'taxonomy' => 'site_scope',
            'field' => 'slug',
            'terms' => [$site_id],
        ]],
    ]);
    tio2_publication_test_assert(1 === count($homepage_ids), "Missing unique published Homepage for {$site_id}.");
    if (1 === count($homepage_ids)) {
        $homepage_error = tio2_publication_test_capture_rejection(static function () use ($homepage_ids): void {
            wp_update_post(['ID' => (int) $homepage_ids[0], 'post_status' => 'publish'], true);
        });
        tio2_publication_test_assert(null === $homepage_error, "Page/Post guard rejected {$site_id} Homepage.");
        tio2_publication_test_assert(
            'publish' === get_post_status((int) $homepage_ids[0]),
            "Page/Post guard changed {$site_id} Homepage status."
        );
    }
}

$raw_publish_id = tio2_publication_test_managed_post('page', '/publication-guard-database-bypass');
global $wpdb;
$raw_update = $wpdb->update(
    $wpdb->posts,
    ['post_status' => 'publish'],
    ['ID' => $raw_publish_id],
    ['%s'],
    ['%d']
);
clean_post_cache($raw_publish_id);
tio2_publication_test_assert(1 === $raw_update, 'Could not create database-bypass publication fixture.');
tio2_publication_test_assert(
    'publish' === get_post_status($raw_publish_id),
    'Database-bypass publication fixture did not reach publish status.'
);
tio2_publication_test_assert(
    function_exists('tio2_publication_route_is_approved') &&
        ! tio2_publication_route_is_approved('tio2-a', '/publication-guard-database-bypass'),
    'An accidental database-level publish changed inventory authorization.'
);

if ([] !== $GLOBALS['tio2_publication_test_errors']) {
    tio2_publication_fail(implode("\n", $GLOBALS['tio2_publication_test_errors']));
}
tio2_publication_test_cleanup();
fwrite(STDOUT, "TiO2 public route inventory test passed\n");
