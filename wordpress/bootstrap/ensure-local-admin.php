<?php

if (! defined('ABSPATH') || ! defined('WP_CLI') || ! WP_CLI) {
    exit(1);
}

$login = (string) getenv('WORDPRESS_ADMIN_USER');
$password = (string) getenv('WORDPRESS_ADMIN_PASSWORD');
$email = sanitize_email((string) getenv('WORDPRESS_ADMIN_EMAIL'));
if (
    '' === $login ||
    'admin' === strtolower($login) ||
    1 !== preg_match('/^[0-9a-f]{64}$/', $password) ||
    '' === $email
) {
    WP_CLI::error('Generated local administrator configuration is invalid.');
}

$configured_user = get_user_by('login', $login);
if (! $configured_user instanceof WP_User) {
    $email_owner = get_user_by('email', $email);
    $creation_email = $email_owner instanceof WP_User
        ? sanitize_user($login, true) . '@invalid.example'
        : $email;
    $configured_id = wp_insert_user([
        'user_login' => $login,
        'user_pass' => $password,
        'user_email' => $creation_email,
        'display_name' => 'TiO2 Local Editor',
        'role' => 'administrator',
    ]);
    if (is_wp_error($configured_id)) {
        WP_CLI::error($configured_id->get_error_message());
    }
    $configured_user = get_user_by('id', (int) $configured_id);
}
if (! $configured_user instanceof WP_User) {
    WP_CLI::error('Could not create the configured local administrator.');
}

$configured_user->set_role('administrator');
wp_set_password($password, $configured_user->ID);

$legacy_admin = get_user_by('login', 'admin');
if ($legacy_admin instanceof WP_User && $legacy_admin->ID !== $configured_user->ID) {
    require_once ABSPATH . 'wp-admin/includes/user.php';
    if (! wp_delete_user($legacy_admin->ID, $configured_user->ID)) {
        WP_CLI::error('Could not remove the legacy admin login.');
    }
}

$updated_id = wp_update_user([
    'ID' => $configured_user->ID,
    'user_email' => $email,
    'display_name' => 'TiO2 Local Editor',
]);
if (is_wp_error($updated_id)) {
    WP_CLI::error($updated_id->get_error_message());
}
clean_user_cache($configured_user->ID);

WP_CLI::success('Local administrator migrated to the generated credential contract.');
