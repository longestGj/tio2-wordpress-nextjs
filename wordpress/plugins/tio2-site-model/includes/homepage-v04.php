<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_HOMEPAGE_CONTRACT_META = '_tio2_my_homepage_contract_json';

function tio2_my_homepage_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-homepage.json';
}

/** @return string|WP_Error */
function tio2_my_homepage_approved_contract_json()
{
    $path = tio2_my_homepage_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    if (! is_string($json) || '' === $json) {
        return new WP_Error(
            'tio2_my_homepage_contract_missing',
            'The approved Malaysia Homepage contract is unavailable.'
        );
    }
    return $json;
}

/** @return true|WP_Error */
function tio2_validate_homepage_v04_contract(int $post_id)
{
    if ('tio2-my' !== tio2_get_homepage_site_id($post_id)) {
        return new WP_Error(
            'tio2_my_homepage_invalid_scope',
            'The Malaysia Homepage contract is valid only for site_scope=tio2-my.'
        );
    }

    $approved = tio2_my_homepage_approved_contract_json();
    if (is_wp_error($approved)) {
        return $approved;
    }
    $stored = get_post_meta($post_id, '_tio2_my_homepage_contract_json', true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error(
            'tio2_my_homepage_contract_mismatch',
            'The stored Malaysia Homepage payload does not match the approved contract.'
        );
    }

    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        'HOME-001-G7-HANDOFF-01' !== ($contract['packageId'] ?? null) ||
        'HOME-001' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        '/' !== ($contract['identity']['path'] ?? null) ||
        'homepage-v0.4-malaysia' !== ($contract['identity']['schemaVersion'] ?? null)
    ) {
        return new WP_Error(
            'tio2_my_homepage_contract_invalid',
            'The Malaysia Homepage payload identity is invalid.'
        );
    }

    return true;
}

/** @param mixed $source */
function tio2_resolve_malaysia_homepage_contract_json($source): ?string
{
    $post = function_exists('tio2_editorial_graphql_source_post')
        ? tio2_editorial_graphql_source_post($source)
        : ($source instanceof WP_Post ? $source : null);
    if (! $post instanceof WP_Post || 'tio2_homepage' !== $post->post_type) {
        return null;
    }
    $validation = tio2_validate_homepage_contract((int) $post->ID);
    if (is_wp_error($validation) || 'tio2-my' !== tio2_get_homepage_site_id((int) $post->ID)) {
        return null;
    }
    $json = get_post_meta((int) $post->ID, TIO2_MY_HOMEPAGE_CONTRACT_META, true);
    return is_string($json) && '' !== $json ? $json : null;
}

function tio2_register_homepage_v04_graphql_field(): void
{
    register_graphql_field('Tio2Homepage', 'malaysiaHomepageContractJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_homepage_contract_json',
        'description' => 'Approved, scope-bound HOME-001 contract for TiO2 Malaysia.',
    ]);
}

/** @return array<string, mixed> */
function tio2_serialize_homepage_v04_preview(WP_Post $post, string $site_id): array
{
    if ('tio2-my' !== $site_id) {
        return [];
    }
    $payload = tio2_serialize_homepage_preview($post, $site_id);
    $payload['malaysiaHomepageContractJson'] = (string) get_post_meta(
        (int) $post->ID,
        TIO2_MY_HOMEPAGE_CONTRACT_META,
        true
    );
    return $payload;
}

add_action('graphql_register_types', 'tio2_register_homepage_v04_graphql_field');
