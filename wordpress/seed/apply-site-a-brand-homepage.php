<?php

require_once __DIR__ . '/site-a-brand-homepage-data.php';

if (! function_exists('tio2_find_homepage_ids') || ! function_exists('update_field')) {
    throw new RuntimeException('Run this file through the project WordPress WP-CLI container.');
}

$ids = tio2_find_homepage_ids('tio2-a');
if (1 !== count($ids)) {
    throw new RuntimeException('Expected exactly one local Site A homepage record.');
}
$post_id = (int) $ids[0];
$fields = tio2_site_a_brand_homepage_fields();
$definitions = array_merge(tio2_homepage_field_definitions(), tio2_homepage_v03_field_definitions());
$keys = [];
foreach ($definitions as $definition) $keys[(string) $definition['name']] = (string) $definition['key'];

$previous = get_post_status($post_id);
wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
$GLOBALS['tio2_homepage_acf_save_in_progress'][$post_id] = true;
try {
    $schema = $fields['homepage_schema_version'];
    unset($fields['homepage_schema_version']);
    foreach ($fields as $name => $value) {
        if (! isset($keys[$name])) throw new RuntimeException("Unknown homepage field {$name}.");
        update_field($keys[$name], $value, $post_id);
    }
    update_field($keys['homepage_schema_version'], $schema, $post_id);
} finally {
    unset($GLOBALS['tio2_homepage_acf_save_in_progress'][$post_id]);
}
clean_post_cache($post_id);
$validation = tio2_validate_homepage_contract($post_id);
if (is_wp_error($validation)) throw new RuntimeException($validation->get_error_message());
wp_update_post(['ID' => $post_id, 'post_status' => 'publish']);
if ('publish' !== get_post_status($post_id)) throw new RuntimeException('Site A homepage could not be published.');
echo wp_json_encode(['status' => 'passed', 'postId' => $post_id, 'previousStatus' => $previous, 'schemaVersion' => $schema]) . PHP_EOL;
