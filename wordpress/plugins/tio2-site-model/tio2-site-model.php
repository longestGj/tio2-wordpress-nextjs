<?php
/**
 * Plugin Name: TiO2 Site Model
 * Description: Registers optional TiO2 content types and isolated site publishing fields.
 * Version: 0.1.0
 * Requires at least: 6.7
 * Requires PHP: 8.1
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/includes/content-types.php';
require_once __DIR__ . '/includes/publication.php';
require_once __DIR__ . '/includes/homepage-rfq-copy.php';
require_once __DIR__ . '/includes/fields.php';
require_once __DIR__ . '/includes/product-fields.php';
require_once __DIR__ . '/includes/product-graphql.php';
require_once __DIR__ . '/includes/product-contract.php';
require_once __DIR__ . '/includes/product-publication.php';
require_once __DIR__ . '/includes/application-resource-fields.php';
require_once __DIR__ . '/includes/application-resource-contract.php';
require_once __DIR__ . '/includes/application-resource-publication.php';
require_once __DIR__ . '/includes/application-resource-preview.php';
require_once __DIR__ . '/includes/application-resource-graphql.php';
require_once __DIR__ . '/includes/homepage-v02.php';
require_once __DIR__ . '/includes/webhooks.php';
require_once __DIR__ . '/includes/preview.php';

add_action('init', 'tio2_register_content_types');
add_action('init', 'tio2_register_product_family_taxonomy', 11);
add_action('init', 'tio2_maybe_migrate_product_rewrite_rules', 99);
add_filter('wp_insert_post_data', 'tio2_guard_managed_publication', 10, 4);
add_filter('wp_insert_post_data', 'tio2_guard_product_publication', 20, 4);
add_filter('wp_insert_post_data', 'tio2_guard_application_resource_publication', 30, 4);
add_filter('rest_pre_insert_page', 'tio2_guard_managed_rest_publication', 10, 2);
add_filter('rest_pre_insert_post', 'tio2_guard_managed_rest_publication', 10, 2);
add_filter('graphql_pre_model_data_is_private', 'tio2_homepage_graphql_visibility', 10, 3);
add_filter('graphql_pre_model_data_is_private', 'tio2_product_graphql_visibility', 20, 3);
add_filter('graphql_pre_model_data_is_private', 'tio2_application_resource_graphql_visibility', 30, 3);
add_action('wp_after_insert_post', 'tio2_backstop_product_publication', 20, 3);
add_action('wp_after_insert_post', 'tio2_backstop_application_resource_publication', 30, 3);
add_action('acf/init', 'tio2_register_acf_fields');
add_action('acf/init', 'tio2_register_product_settings_page');
add_action('acf/init', 'tio2_register_product_acf_fields');
add_action('acf/init', 'tio2_register_application_resource_acf_fields');
add_action('acf/save_post', 'tio2_save_product_contract_feedback', 30);
add_action('acf/save_post', 'tio2_save_application_resource_contract_feedback', 40);
add_filter('acf/prepare_field/key=field_tio2_home_rfq_intro', 'tio2_prepare_homepage_rfq_copy_field');
add_filter('acf/prepare_field/key=field_tio2_home_rfq_privacy_text', 'tio2_prepare_homepage_rfq_copy_field');
add_filter('acf/prepare_field/key=field_tio2_home_rfq_success_heading', 'tio2_prepare_homepage_rfq_copy_field');
add_filter('acf/prepare_field/key=field_tio2_home_rfq_success_message', 'tio2_prepare_homepage_rfq_copy_field');
add_filter('acf/validate_value/name=public_path', 'tio2_validate_public_path', 10, 4);
add_action('acf/save_post', 'tio2_begin_homepage_acf_save', 1);
add_action('acf/save_post', 'tio2_sync_managed_post_routing', 20);
add_action('acf/save_post', 'tio2_enforce_homepage_from_acf', 30);
add_action('save_post_tio2_homepage', 'tio2_enforce_homepage_contract', 100);
add_action('rest_after_insert_tio2_homepage', 'tio2_enforce_homepage_after_rest', 10, 3);
add_action('admin_notices', 'tio2_managed_route_admin_notice');
add_action('admin_notices', 'tio2_product_contract_admin_notice');
add_action('admin_notices', 'tio2_application_resource_contract_admin_notice');
add_filter('sanitize_title', 'tio2_preserve_internal_slug', 10, 3);
add_action('transition_post_status', 'tio2_handle_post_transition', 10, 3);
add_filter('update_post_metadata', 'tio2_capture_post_meta_before_mutation', 10, 5);
add_filter('delete_post_metadata', 'tio2_capture_post_meta_before_mutation', 10, 5);
add_action('added_post_meta', 'tio2_handle_post_meta_change', 10, 4);
add_action('updated_post_meta', 'tio2_handle_post_meta_change', 10, 4);
add_action('deleted_post_meta', 'tio2_handle_deleted_post_meta', 10, 4);
add_action('added_option', 'tio2_handle_product_option_change', 10, 2);
add_action('updated_option', 'tio2_handle_product_option_change', 10, 3);
add_action('deleted_option', 'tio2_handle_product_option_change', 10, 1);
add_action('added_post_meta', 'tio2_enforce_homepage_after_meta_mutation', 20, 4);
add_action('updated_post_meta', 'tio2_enforce_homepage_after_meta_mutation', 20, 4);
add_action('deleted_post_meta', 'tio2_enforce_homepage_after_meta_mutation', 20, 4);
add_action('set_object_terms', 'tio2_handle_site_scope_set', 10, 6);
add_action('set_object_terms', 'tio2_backstop_application_resource_scope_publication', 15, 6);
add_action('set_object_terms', 'tio2_enforce_homepage_after_site_scope_mutation', 20, 6);
add_action('deleted_term_relationships', 'tio2_handle_deleted_term_relationships', 10, 3);
add_action('deleted_term_relationships', 'tio2_enforce_homepage_after_site_scope_removal', 20, 3);
add_action('transition_post_status', 'tio2_enforce_homepage_dependencies_after_transition', 20, 3);
add_action('post_updated', 'tio2_enforce_homepage_dependencies_after_slug_change', 20, 3);
add_action('deleted_post', 'tio2_enforce_homepage_dependencies_after_delete', 20, 2);
add_action('shutdown', 'tio2_flush_webhook_queue');
add_action('rest_api_init', 'tio2_register_preview_rest_route');
add_filter('preview_post_link', 'tio2_filter_preview_post_link', 10, 2);

register_activation_hook(__FILE__, 'tio2_activate_site_model');
