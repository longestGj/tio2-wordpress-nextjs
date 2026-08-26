<?php

function fixture_core_fail(string $message): void
{
    fwrite(STDERR, $message . "\n");
    exit(1);
}

function fixture_core_assert(bool $condition, string $message): void
{
    if (! $condition) {
        fixture_core_fail($message);
    }
}

function fixture_core_expect_exception(callable $callback, string $message_fragment): void
{
    try {
        $callback();
    } catch (Throwable $error) {
        fixture_core_assert(
            str_contains($error->getMessage(), $message_fragment),
            "Wrong exception: {$error->getMessage()}"
        );
        return;
    }
    fixture_core_fail("Expected exception containing: {$message_fragment}");
}

require '/workspace/wordpress/seed/site-a-editorial-fixture-core.php';

$manifest = json_decode(
    (string) file_get_contents('/workspace/wordpress/seed/representative-content.json'),
    true,
    512,
    JSON_THROW_ON_ERROR
);
$fields = tio2_local_editorial_validate_manifest($manifest);
fixture_core_assert(28 === count($fields), 'The exact Site A fixture field count was not enforced.');

$GLOBALS['tio2_homepage_acf_save_in_progress'] = [11 => 'existing'];
$suppression_token = tio2_local_editorial_begin_enforcement_suppression(77);
fixture_core_assert(
    true === $GLOBALS['tio2_homepage_acf_save_in_progress'][77] &&
    'existing' === $GLOBALS['tio2_homepage_acf_save_in_progress'][11],
    'The real enforcement suppression marker was not installed safely.'
);
tio2_local_editorial_restore_enforcement_suppression($suppression_token);
fixture_core_assert(
    [11 => 'existing'] === $GLOBALS['tio2_homepage_acf_save_in_progress'],
    'The real enforcement suppression global was not restored exactly.'
);
unset($GLOBALS['tio2_homepage_acf_save_in_progress']);

$invalid_count = $manifest;
array_pop($invalid_count['sites'][0]['homepage']['decision_questions']);
fixture_core_expect_exception(
    static fn () => tio2_local_editorial_validate_manifest($invalid_count),
    'decision_questions must contain exactly 6 rows'
);
$invalid_status = $manifest;
$invalid_status['sites'][0]['homepage']['evidence_items'][0]['verification_status'] = 'needs_review';
fixture_core_expect_exception(
    static fn () => tio2_local_editorial_validate_manifest($invalid_status),
    'verification_status must be demo'
);
$invalid_link = $manifest;
$invalid_link['sites'][0]['homepage']['direct_answer_body'] = 'See HTTPS://EXAMPLE.TEST/unsafe';
fixture_core_expect_exception(
    static fn () => tio2_local_editorial_validate_manifest($invalid_link),
    'forbidden link or claim'
);
$invalid_verified = $manifest;
$invalid_verified['sites'][0]['homepage']['direct_answer_body'] = 'VERIFIED external claim';
fixture_core_expect_exception(
    static fn () => tio2_local_editorial_validate_manifest($invalid_verified),
    'forbidden link or claim'
);
$invalid_extra = $manifest;
$invalid_extra['sites'][0]['homepage']['product_routes'] = [];
fixture_core_expect_exception(
    static fn () => tio2_local_editorial_validate_manifest($invalid_extra),
    'missing or out-of-scope Homepage fields'
);
$invalid_nested_route = $manifest;
$invalid_nested_route['sites'][0]['homepage']['supply_routes'][0]['product_path'] = '/products/unsafe';
fixture_core_expect_exception(
    static fn () => tio2_local_editorial_validate_manifest($invalid_nested_route),
    'missing or out-of-scope row fields'
);

foreach (['faqs_notes', '_metrics_cache', 'rfq_labels_backup'] as $collision_key) {
    fixture_core_assert(
        ! tio2_local_editorial_is_v01_meta_key($collision_key),
        "Legacy-prefix collision {$collision_key} was classified as managed ACF content."
    );
    fixture_core_assert(
        ! tio2_local_editorial_is_managed_content_meta_key($collision_key),
        "Unmanaged invariant excluded legacy-prefix collision {$collision_key}."
    );
}
fixture_core_assert(
    ! tio2_local_editorial_is_managed_content_meta_key('geo_faqs_notes'),
    'Unmanaged invariant excluded a current-field prefix collision.'
);
foreach ([
    'faqs_9_faq_answer',
    '_rfq_labels_rfq_label_name',
    '_metrics',
    'geo_faqs_7_faq_answer',
    '_hero_heading',
] as $managed_key) {
    fixture_core_assert(
        tio2_local_editorial_is_managed_content_meta_key($managed_key),
        "Known ACF meta {$managed_key} was not classified as managed content."
    );
}

final class FixtureCoreFakeWpdb
{
    public string $postmeta = 'wp_postmeta';

    /** @var array<string, string> */
    public array $rows = [
        'product_routes' => '2',
        '_product_routes' => 'field_tio2_home_product_routes',
        'product_routes_0_product_path' => '/products/demo',
        '_product_routes_0_product_path' => 'field_tio2_home_product_path',
        'applications_99_application_path' => '/applications/demo',
        '_applications_99_application_path' => 'field_tio2_home_application_path',
        'faqs_0_faq_related_path' => '/products/legacy',
        '_faqs_0_faq_related_path' => 'field_tio2_home_faq_related_path',
        'faqs_notes' => 'preserve collision notes',
        '_metrics_cache' => 'preserve collision cache',
        'rfq_labels_backup' => 'preserve collision backup',
        'product_routes_0_product_path_extra' => 'preserve collision suffix',
        'hero_heading' => 'Shared hero',
        '_hero_heading' => 'field_tio2_home_hero_heading',
        'application_briefs_0_application_name' => 'v0.2 value',
        '_application_briefs_0_application_name' => 'field_tio2_geo_application_name',
        '_unmanaged_probe' => 'preserve me',
    ];

    /** @var array<int, mixed> */
    public array $preparedArgs = [];

    public function prepare(string $query, ...$args): string
    {
        $this->preparedArgs = $args;
        return $query;
    }

    /** @return list<string> */
    public function get_col(string $query): array
    {
        return array_keys($this->rows);
    }

    /** @param array<string, mixed> $where */
    public function delete(string $table, array $where, array $where_format): int|false
    {
        $key = (string) ($where['meta_key'] ?? '');
        if (! array_key_exists($key, $this->rows)) {
            return 0;
        }
        unset($this->rows[$key]);
        return 1;
    }
}

$wpdb = new FixtureCoreFakeWpdb();
$deleted = tio2_local_editorial_delete_v01_meta(77);
fixture_core_assert(count($deleted) >= 8, 'Legacy value/reference meta were not deleted.');
fixture_core_assert(
    [] === tio2_local_editorial_find_v01_meta_keys(77),
    'Legacy Homepage meta remained after cleanup.'
);
fixture_core_assert(
    isset($wpdb->rows['hero_heading'], $wpdb->rows['_hero_heading']),
    'Shared Hero meta was deleted.'
);
fixture_core_assert(
    isset(
        $wpdb->rows['application_briefs_0_application_name'],
        $wpdb->rows['_application_briefs_0_application_name'],
        $wpdb->rows['_unmanaged_probe'],
        $wpdb->rows['faqs_notes'],
        $wpdb->rows['_metrics_cache'],
        $wpdb->rows['rfq_labels_backup'],
        $wpdb->rows['product_routes_0_product_path_extra']
    ),
    'v0.2, unmanaged, or legacy-prefix collision meta was deleted.'
);

final class FixtureCoreHarness
{
    /** @var array<string, mixed> */
    public array $fields = [];
    /** @var array<string, string> */
    public array $legacy = [
        'product_routes_0_product_path' => '/products/legacy',
        '_product_routes_0_product_path' => 'field_tio2_home_product_path',
        'applications_0_application_path' => '/applications/legacy',
        '_applications_0_application_path' => 'field_tio2_home_application_path',
    ];
    /** @var list<string> */
    public array $events = [];
    /** @var list<string> */
    public array $queue = ['before'];
    /** @var array<string, string> */
    public array $unmanaged = [
        '_unmanaged_probe' => 'preserve',
        'faqs_notes' => 'preserve collision notes',
        '_metrics_cache' => 'preserve collision cache',
        'rfq_labels_backup' => 'preserve collision backup',
    ];
    public string $status = 'publish';
    public bool $suppressed = false;
    public bool $namedLock = false;
    public bool $transaction = false;
    public bool $invariantLocks = false;
    public int $enforcementCount = 0;
    public int $invariantChecks = 0;
    public int $intermediateEnforcementCount = 0;
    /** @var array<string, mixed>|null */
    private ?array $transactionSnapshot = null;

    /** @return array<string, callable> */
    public function operations(): array
    {
        return [
            'snapshot_queue' => function (): array {
                $this->events[] = 'snapshot_queue';
                return $this->queue;
            },
            'restore_queue' => function (array $queue): void {
                $this->events[] = 'restore_queue';
                $this->queue = $queue;
            },
            'acquire_lock' => function (): bool {
                $this->events[] = 'acquire_lock';
                $this->namedLock = true;
                return true;
            },
            'release_lock' => function (): void {
                $this->events[] = 'release_lock';
                $this->namedLock = false;
            },
            'begin_transaction' => function (): void {
                fixture_core_assert($this->namedLock, 'Transaction began without the advisory lock.');
                $this->events[] = 'begin_transaction';
                $this->transaction = true;
                $this->transactionSnapshot = unserialize(serialize([
                    'fields' => $this->fields,
                    'legacy' => $this->legacy,
                    'queue' => $this->queue,
                    'unmanaged' => $this->unmanaged,
                    'status' => $this->status,
                ]));
            },
            'lock_invariants' => function (): void {
                fixture_core_assert($this->transaction, 'Invariant locks were acquired outside the transaction.');
                $this->events[] = 'lock_invariants';
                $this->invariantLocks = true;
            },
            'preflight' => function (): array {
                fixture_core_assert(
                    $this->transaction && $this->invariantLocks,
                    'Preflight ran before transaction invariant locks.'
                );
                $this->events[] = 'preflight';
                return [
                    'identity' => 'site-a-identity',
                    'siteB' => 'site-b-frozen',
                    'root' => 'root-frozen',
                    'unmanaged' => $this->unmanaged,
                ];
            },
            'begin_suppression' => function (): bool {
                $this->events[] = 'begin_suppression';
                $previous = $this->suppressed;
                $this->suppressed = true;
                return $previous;
            },
            'restore_suppression' => function (bool $previous): void {
                $this->events[] = 'restore_suppression';
                $this->suppressed = $previous;
            },
            'write_field' => function (string $name, mixed $value): void {
                $this->events[] = 'write:' . $name;
                if (! $this->suppressed) {
                    $this->intermediateEnforcementCount++;
                    $this->status = 'draft';
                }
                $this->fields[$name] = $value;
                $this->queue[] = 'field:' . $name;
            },
            'delete_legacy' => function (): void {
                $this->events[] = 'delete_legacy';
                $this->legacy = [];
            },
            'assert_no_legacy' => function (): void {
                $this->events[] = 'assert_no_legacy';
                fixture_core_assert([] === $this->legacy, 'Legacy meta survived batch cleanup.');
            },
            'enforce' => function (): void {
                $this->events[] = 'enforce';
                $this->enforcementCount++;
                fixture_core_assert($this->suppressed, 'Final enforcement ran outside suppression.');
                fixture_core_assert(
                    'homepage-v0.2-editorial-geo' === ($this->fields['homepage_schema_version'] ?? null),
                    'Final enforcement ran before the schema version write.'
                );
                fixture_core_assert([] === $this->legacy, 'Final enforcement saw legacy meta.');
            },
            'readback' => function (array $expected): void {
                $this->events[] = 'readback';
                $actual = $this->fields;
                ksort($expected, SORT_STRING);
                ksort($actual, SORT_STRING);
                fixture_core_assert($expected === $actual, 'Exact field readback failed.');
                fixture_core_assert([] === $this->legacy, 'Readback found legacy meta.');
            },
            'assert_invariants' => function (array $preflight): void {
                $this->events[] = 'assert_invariants';
                $this->invariantChecks++;
                fixture_core_assert(
                    $this->transaction && $this->invariantLocks,
                    'Final invariants ran without transaction locks.'
                );
                fixture_core_assert(
                    'site-a-identity' === $preflight['identity'] &&
                    'site-b-frozen' === $preflight['siteB'] &&
                    'root-frozen' === $preflight['root'] &&
                    $this->unmanaged === $preflight['unmanaged'],
                    'A non-content invariant changed.'
                );
            },
            'commit' => function (): void {
                fixture_core_assert($this->transaction, 'Commit ran without a transaction.');
                $this->events[] = 'commit';
                $this->transaction = false;
                $this->transactionSnapshot = null;
            },
            'rollback' => function (): void {
                $this->events[] = 'rollback';
                if (is_array($this->transactionSnapshot)) {
                    $this->fields = $this->transactionSnapshot['fields'];
                    $this->legacy = $this->transactionSnapshot['legacy'];
                    $this->queue = $this->transactionSnapshot['queue'];
                    $this->unmanaged = $this->transactionSnapshot['unmanaged'];
                    $this->status = $this->transactionSnapshot['status'];
                }
                $this->transaction = false;
                $this->transactionSnapshot = null;
            },
        ];
    }
}

$success = new FixtureCoreHarness();
$result = tio2_local_editorial_execute('apply', '', $fields, $success->operations());
fixture_core_assert('apply' === $result['mode'], 'Eligible Apply did not return apply mode.');
fixture_core_assert('publish' === $success->status, 'Intermediate enforcement drafted the eligible target.');
fixture_core_assert(0 === $success->intermediateEnforcementCount, 'An intermediate contract ran.');
fixture_core_assert(1 === $success->enforcementCount, 'Final contract did not run exactly once.');
fixture_core_assert(1 === $success->invariantChecks, 'Final invariants did not run exactly once.');
fixture_core_assert([] === $success->legacy, 'Eligible Apply retained v0.1 meta.');
fixture_core_assert(['before'] === $success->queue, 'Webhook queue was not restored after success.');
fixture_core_assert(! $success->suppressed, 'Suppression marker leaked after success.');
fixture_core_assert(! $success->namedLock && ! $success->transaction, 'Locks leaked after success.');
$schema_event = array_search('write:homepage_schema_version', $success->events, true);
$delete_event = array_search('delete_legacy', $success->events, true);
$last_non_schema_event = array_search('write:editorial_review_scope', $success->events, true);
fixture_core_assert(
    is_int($schema_event) && is_int($delete_event) && is_int($last_non_schema_event) &&
    $last_non_schema_event < $delete_event && $delete_event < $schema_event,
    'Schema version was not written last after legacy cleanup.'
);
fixture_core_assert(
    array_search('begin_transaction', $success->events, true) <
    array_search('lock_invariants', $success->events, true) &&
    array_search('lock_invariants', $success->events, true) <
    array_search('preflight', $success->events, true),
    'Preflight did not run under transaction invariant locks.'
);

$failure = new FixtureCoreHarness();
$failure_before = serialize([
    $failure->fields,
    $failure->legacy,
    $failure->queue,
    $failure->unmanaged,
    $failure->status,
]);
fixture_core_expect_exception(
    static fn () => tio2_local_editorial_execute(
        'apply',
        'after-fields',
        $fields,
        $failure->operations()
    ),
    'Injected failure after Site A editorial fields'
);
fixture_core_assert(
    $failure_before === serialize([
        $failure->fields,
        $failure->legacy,
        $failure->queue,
        $failure->unmanaged,
        $failure->status,
    ]),
    'Injected failure did not restore the exact fake state.'
);
fixture_core_assert(! $failure->suppressed, 'Suppression marker leaked after rollback.');
fixture_core_assert(! $failure->namedLock && ! $failure->transaction, 'Locks leaked after rollback.');
fixture_core_assert(in_array('rollback', $failure->events, true), 'Rollback was not attempted.');

$plan = new FixtureCoreHarness();
$plan_result = tio2_local_editorial_execute('plan', '', $fields, $plan->operations());
fixture_core_assert('plan' === $plan_result['mode'], 'Eligible PlanOnly did not return plan mode.');
fixture_core_assert([] === $plan->fields, 'PlanOnly wrote fields.');
fixture_core_assert(0 === $plan->enforcementCount, 'PlanOnly ran enforcement.');
fixture_core_assert(in_array('rollback', $plan->events, true), 'PlanOnly did not close with rollback.');
fixture_core_assert(['before'] === $plan->queue, 'PlanOnly changed the webhook queue.');

fwrite(STDOUT, "Site A editorial fixture isolated core contract passed\n");
