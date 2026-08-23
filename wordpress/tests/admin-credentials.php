<?php

if (! defined('ABSPATH')) {
    exit(1);
}

function tio2_admin_credentials_fail(string $message): void
{
    if (defined('WP_CLI') && WP_CLI) {
        WP_CLI::error($message);
    }
    throw new RuntimeException($message);
}

$configured_login = (string) getenv('WORDPRESS_ADMIN_USER');
$configured_password = (string) getenv('WORDPRESS_ADMIN_PASSWORD');
if (
    '' === $configured_login ||
    'admin' === strtolower($configured_login) ||
    1 !== preg_match('/^[0-9a-f]{64}$/', $configured_password)
) {
    tio2_admin_credentials_fail('Local administrator environment is not generated');
}

$configured_user = get_user_by('login', $configured_login);
if (
    ! $configured_user instanceof WP_User ||
    ! in_array('administrator', $configured_user->roles, true) ||
    ! wp_check_password($configured_password, $configured_user->user_pass, $configured_user->ID)
) {
    tio2_admin_credentials_fail('Configured local administrator does not match the generated environment');
}

if (get_user_by('login', 'admin') instanceof WP_User) {
    tio2_admin_credentials_fail('Legacy admin login is still enabled');
}

fwrite(STDOUT, "TiO2 local administrator credential contract passed\n");
