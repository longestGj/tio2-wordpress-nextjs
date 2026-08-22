<?php
/**
 * Plugin Name: TiO2 Site Model
 * Description: Registers the shared TiO2 content model and site publishing fields.
 * Version: 0.1.0
 * Requires at least: 6.7
 * Requires PHP: 8.1
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/includes/content-types.php';
require_once __DIR__ . '/includes/fields.php';

add_action('init', 'tio2_register_content_types');
add_action('acf/init', 'tio2_register_acf_fields');
add_filter('acf/validate_value/name=public_path', 'tio2_validate_public_path', 10, 4);

register_activation_hook(__FILE__, 'tio2_activate_site_model');
