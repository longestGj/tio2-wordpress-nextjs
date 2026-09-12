<?php
declare(strict_types=1);
require_once __DIR__.'/content-release-validation.php';
if (! defined('ABSPATH')) exit;

const TIO2_MY_COUNTRY_MARKET_CONTRACT_META = '_tio2_my_country_market_contract_json';
const TIO2_MY_COUNTRY_MARKET_NONCE_FIELD = '_tio2_my_country_market_nonce';

/** @return array<string,array{slug:string,path:string,config:string}> */
function tio2_my_country_market_identities(): array
{
    return [
        'MARKET-EU-ES' => ['slug' => 'tio2-my-market-eu-es', 'path' => '/markets/spain', 'config' => 'tio2-my-market-eu-es.json'],
        'MARKET-IN-001' => ['slug' => 'tio2-my-market-in-001', 'path' => '/markets/india', 'config' => 'tio2-my-market-in-001.json'],
        'MARKET-EU-NL' => ['slug' => 'tio2-my-market-eu-nl', 'path' => '/markets/netherlands', 'config' => 'tio2-my-market-eu-nl.json'],
        'MARKET-EU-BE' => ['slug' => 'tio2-my-market-eu-be', 'path' => '/markets/belgium', 'config' => 'tio2-my-market-eu-be.json'],
    ];
}

function tio2_my_country_market_config_json(string $page_id): string
{
    $identity = tio2_my_country_market_identities()[$page_id] ?? null;
    if (! is_array($identity)) return '';
    $json = file_get_contents(dirname(__DIR__) . '/config/' . $identity['config']);
    return is_string($json) ? $json : '';
}

/** @return int[] */
function tio2_my_country_market_candidate_ids(string $page_id): array
{
    $identity = tio2_my_country_market_identities()[$page_id] ?? null;
    if (! is_array($identity)) return [];
    $candidate_ids = get_posts([
        'post_type' => 'tio2_market_page', 'post_status' => ['publish', 'draft', 'pending', 'private', 'future'],
        'fields' => 'ids', 'numberposts' => -1, 'suppress_filters' => false,
    ]);
    return array_values(array_filter(array_map('intval', $candidate_ids), static function (int $id) use ($identity): bool {
        return $identity['slug'] === get_post_field('post_name', $id) ||
            $identity['path'] === get_post_meta($id, 'public_path', true);
    }));
}

/** @return true|WP_Error */
function tio2_validate_country_market_v01_payload(string $json, string $page_id)
{
    $approved_json = tio2_my_country_market_config_json($page_id);
    $approved = json_decode($approved_json, true);
    $stored = json_decode($json, true);
    if (! is_array($approved) || ! is_array($stored) || !tio2_my_content_matches($stored, $approved) ||
        $page_id !== ($stored['identity']['pageId'] ?? null) || 'tio2-my' !== ($stored['identity']['siteScope'] ?? null)) {
        return new WP_Error('country_market_payload', 'Changed or invalid country Market payload.');
    }
    return true;
}

/** @return true|WP_Error */
function tio2_validate_country_market_v01_stored_identity(int $post_id, string $page_id)
{
    $identity = tio2_my_country_market_identities()[$page_id] ?? null;
    if (! is_array($identity)) return new WP_Error('country_market_id', 'Invalid country Market identity.');
    if ('tio2_market_page' !== get_post_type($post_id)) return new WP_Error('country_market_type', 'Invalid country Market type.');
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('country_market_scope', 'Invalid country Market site_scope.');
    }
    if ($identity['path'] !== get_post_meta($post_id, 'public_path', true) ||
        $identity['slug'] !== get_post_field('post_name', $post_id)) {
        return new WP_Error('country_market_identity', 'Invalid country Market route identity.');
    }
    $stored_json = get_post_meta($post_id, TIO2_MY_COUNTRY_MARKET_CONTRACT_META, true);
    if (! is_string($stored_json) || '' === $stored_json) return new WP_Error('country_market_payload', 'Missing country Market payload.');
    $stored = json_decode($stored_json, true);
    $expected_identity = [
        'pageId' => $page_id,
        'siteScope' => 'tio2-my',
        'locale' => 'en',
        'path' => $identity['path'] . '/',
        'schemaVersion' => 'market-country-v0.1',
    ];
    if (! is_array($stored) || $expected_identity !== ($stored['identity'] ?? null)) {
        return new WP_Error('country_market_payload_identity', 'Invalid country Market payload identity.');
    }
    return true;
}

/** @return true|WP_Error */
function tio2_validate_country_market_v01_contract(int $post_id, string $page_id, bool $require_publish = true)
{
    $identity_result = tio2_validate_country_market_v01_stored_identity($post_id, $page_id);
    if (is_wp_error($identity_result)) return $identity_result;
    if ($require_publish && 'publish' !== get_post_status($post_id)) {
        return new WP_Error('country_market_status', 'Country Market record is not published.');
    }
    $stored_json = get_post_meta($post_id, TIO2_MY_COUNTRY_MARKET_CONTRACT_META, true);
    return tio2_validate_country_market_v01_payload($stored_json, $page_id);
}

function tio2_my_country_market_page_id_for_post(int $post_id): string
{
    foreach (tio2_my_country_market_identities() as $page_id => $identity) {
        if ($identity['slug'] === get_post_field('post_name', $post_id) ||
            $identity['path'] === get_post_meta($post_id, 'public_path', true)) return $page_id;
    }
    return '';
}

function tio2_add_country_market_v01_meta_box(string $post_type, $post): void
{
    if ('tio2_market_page' !== $post_type || ! $post instanceof WP_Post) return;
    if ('' === tio2_my_country_market_page_id_for_post((int) $post->ID)) return;
    add_meta_box('tio2-my-country-market-contract', 'TiO2 Malaysia country Market contract',
        'tio2_render_country_market_v01_meta_box', 'tio2_market_page', 'normal', 'high');
}
add_action('add_meta_boxes', 'tio2_add_country_market_v01_meta_box', 10, 2);

function tio2_render_country_market_v01_meta_box(WP_Post $post): void
{
    $page_id = tio2_my_country_market_page_id_for_post((int) $post->ID);
    wp_nonce_field('tio2_save_country_market_contract', TIO2_MY_COUNTRY_MARKET_NONCE_FIELD);
    echo '<input type="hidden" name="tio2_my_country_market_page_id" value="' . esc_attr($page_id) . '">';
    echo '<p>This JSON is the approved scope-bound page contract. Invalid or cross-scope content is rejected.</p>';
    echo '<textarea name="tio2_my_country_market_contract_json" rows="32" style="width:100%;font-family:monospace">' .
        esc_textarea((string) get_post_meta((int) $post->ID, TIO2_MY_COUNTRY_MARKET_CONTRACT_META, true)) . '</textarea>';
}

function tio2_save_country_market_v01_meta_box(int $post_id): void
{
    if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || wp_is_post_revision($post_id) ||
        ! isset($_POST[TIO2_MY_COUNTRY_MARKET_NONCE_FIELD]) ||
        ! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST[TIO2_MY_COUNTRY_MARKET_NONCE_FIELD])), 'tio2_save_country_market_contract') ||
        ! current_user_can('edit_post', $post_id) || 'tio2_market_page' !== get_post_type($post_id)) return;

    $page_id = isset($_POST['tio2_my_country_market_page_id'])
        ? sanitize_text_field(wp_unslash($_POST['tio2_my_country_market_page_id'])) : '';
    $identity = tio2_my_country_market_identities()[$page_id] ?? null;
    $json = isset($_POST['tio2_my_country_market_contract_json'])
        ? (string) wp_unslash($_POST['tio2_my_country_market_contract_json']) : '';
    if (! is_array($identity) || $identity['slug'] !== get_post_field('post_name', $post_id) ||
        $identity['path'] !== get_post_meta($post_id, 'public_path', true) ||
        is_wp_error(tio2_validate_country_market_v01_payload($json, $page_id))) return;

    $previous_json = get_post_meta($post_id, TIO2_MY_COUNTRY_MARKET_CONTRACT_META, true);
    update_post_meta($post_id, TIO2_MY_COUNTRY_MARKET_CONTRACT_META, wp_slash($json));
    if (is_wp_error(tio2_validate_country_market_v01_contract($post_id, $page_id, false))) {
        if (is_string($previous_json) && '' !== $previous_json) {
            update_post_meta($post_id, TIO2_MY_COUNTRY_MARKET_CONTRACT_META, wp_slash($previous_json));
        } else {
            delete_post_meta($post_id, TIO2_MY_COUNTRY_MARKET_CONTRACT_META);
        }
    }
}
add_action('save_post_tio2_market_page', 'tio2_save_country_market_v01_meta_box');

function tio2_resolve_malaysia_country_market_record_json($root, array $args): string
{
    $page_id = isset($args['pageId']) ? (string) $args['pageId'] : '';
    $identity = tio2_my_country_market_identities()[$page_id] ?? null;
    if (! is_array($identity)) throw new \GraphQL\Error\UserError('The requested Malaysia country Market is not authorized.');

    $ids = tio2_my_country_market_candidate_ids($page_id);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(0 === count($ids)
            ? 'The requested Malaysia country Market record is missing.'
            : 'Multiple Malaysia country Market records were found.');
    }
    $post_id = $ids[0];
    if (is_wp_error(tio2_validate_country_market_v01_contract($post_id, $page_id))) {
        throw new \GraphQL\Error\UserError('The Malaysia country Market record failed scope or contract validation.');
    }
    return wp_json_encode([
        'id' => 'country-market-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'recordPageId' => $page_id,
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => $identity['path']],
        'malaysiaCountryMarketContractJson' => get_post_meta($post_id, TIO2_MY_COUNTRY_MARKET_CONTRACT_META, true),
    ]);
}

function tio2_register_country_market_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaCountryMarketRecordJson', [
        'type' => ['non_null' => 'String'],
        'args' => ['pageId' => ['type' => ['non_null' => 'String']]],
        'resolve' => 'tio2_resolve_malaysia_country_market_record_json',
        'description' => 'Approved scope-bound country Market record for TiO2 Malaysia.',
    ]);
}
add_action('graphql_register_types', 'tio2_register_country_market_v01_graphql_field');
