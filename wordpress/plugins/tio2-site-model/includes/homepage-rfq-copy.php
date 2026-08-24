<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_HOMEPAGE_RFQ_COPY_JSON = <<<'JSON'
{"tio2-a":{"id":"site-a-rfq-copy-v0.1","fields":{"rfq.intro":["This v0.1 local demo does not send or store inquiry data."],"rfq.privacyText":["This local demo does not send or save entered information."],"rfq.success.heading":["Local check complete"],"rfq.success.message":["Nothing was transmitted or saved by this Site A local demo."]}},"tio2-b":{"id":"site-b-rfq-copy-v0.1-frozen","fields":{"rfq.intro":["This v0.1 local demo does not send or store inquiry data."],"rfq.privacyText":["This Site B local demo does not send or save entered information."],"rfq.success.heading":["Site B local check complete"],"rfq.success.message":["No Site B information was transmitted or saved by this local demo."]}}}
JSON;

/**
 * @return array{id: string, fields: array<string, list<string>>}|null
 */
function tio2_homepage_rfq_copy_contract(string $site_id): ?array
{
    if (! in_array($site_id, ['tio2-a', 'tio2-b'], true)) {
        return null;
    }

    static $contracts = null;
    if (null === $contracts) {
        try {
            $decoded = json_decode(TIO2_HOMEPAGE_RFQ_COPY_JSON, true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException $error) {
            return null;
        }
        $contracts = is_array($decoded) ? $decoded : [];
    }

    $contract = $contracts[$site_id] ?? null;
    if (
        ! is_array($contract) ||
        ! is_string($contract['id'] ?? null) ||
        ! is_array($contract['fields'] ?? null)
    ) {
        return null;
    }
    return $contract;
}

function tio2_homepage_rfq_field_path(string $field_name): ?string
{
    return [
        'rfq_intro' => 'rfq.intro',
        'rfq_privacy_text' => 'rfq.privacyText',
        'rfq_success_heading' => 'rfq.success.heading',
        'rfq_success_message' => 'rfq.success.message',
    ][$field_name] ?? null;
}

function tio2_homepage_normalize_rfq_copy(string $value): string
{
    $normalized = preg_replace('/\s+/u', ' ', trim($value));
    return is_string($normalized) ? $normalized : trim($value);
}

/**
 * @return list<string>
 */
function tio2_homepage_rfq_copy_choices(string $site_id, string $field_name): array
{
    $contract = tio2_homepage_rfq_copy_contract($site_id);
    $field_path = tio2_homepage_rfq_field_path($field_name);
    if (null === $contract || null === $field_path) {
        return [];
    }
    $choices = $contract['fields'][$field_path] ?? null;
    if (! is_array($choices) || [] === $choices) {
        return [];
    }
    foreach ($choices as $choice) {
        if (! is_string($choice) || '' === $choice || $choice !== wp_strip_all_tags($choice)) {
            return [];
        }
    }
    return array_values($choices);
}

/**
 * @return string|WP_Error
 */
function tio2_validate_homepage_rfq_copy($value, string $site_id, string $field_name, int $maxlength)
{
    if (! is_scalar($value) && null !== $value) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} must be plain text.");
    }
    $text = trim((string) $value);
    if (
        '' === $text ||
        $text !== wp_strip_all_tags($text) ||
        (function_exists('mb_strlen') ? mb_strlen($text) : strlen($text)) > $maxlength
    ) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} is invalid.");
    }
    $normalized = tio2_homepage_normalize_rfq_copy($text);
    if (! in_array($normalized, tio2_homepage_rfq_copy_choices($site_id, $field_name), true)) {
        return new WP_Error(
            'tio2_homepage_invalid_field',
            "Homepage field {$field_name} must match its owning site's controlled RFQ copy."
        );
    }
    return $normalized;
}

/**
 * @return array<string, mixed>
 */
function tio2_homepage_rfq_copy_field(string $key, string $name): array
{
    return [
        'key' => $key,
        'label' => ucwords(str_replace('_', ' ', $name)),
        'name' => $name,
        'type' => 'select',
        'required' => 1,
        'choices' => [],
        'allow_null' => 0,
        'ui' => 1,
        'return_format' => 'value',
        'show_in_graphql' => 1,
    ];
}

function tio2_homepage_rfq_acf_post_id(array $field): int
{
    if (isset($field['post_id']) && is_numeric($field['post_id'])) {
        return (int) $field['post_id'];
    }
    if (function_exists('acf_get_form_data')) {
        $post_id = acf_get_form_data('post_id');
        if (is_numeric($post_id)) {
            return (int) $post_id;
        }
    }
    return 0;
}

/**
 * @param array<string, mixed> $field
 * @return array<string, mixed>
 */
function tio2_prepare_homepage_rfq_copy_field(array $field): array
{
    $post_id = tio2_homepage_rfq_acf_post_id($field);
    $site_id = $post_id > 0 && 'tio2_homepage' === get_post_type($post_id)
        ? tio2_get_homepage_site_id($post_id)
        : null;
    if (null !== $site_id && [$post_id] !== tio2_find_homepage_ids($site_id)) {
        $site_id = null;
    }
    $choices = null === $site_id
        ? []
        : tio2_homepage_rfq_copy_choices($site_id, (string) ($field['name'] ?? ''));
    $field['choices'] = array_combine($choices, $choices) ?: [];
    if ([] === $field['choices']) {
        $field['disabled'] = 1;
        $field['instructions'] = 'Save exactly one supported site owner before choosing controlled RFQ copy.';
        return $field;
    }
    $contract = tio2_homepage_rfq_copy_contract($site_id);
    $field['disabled'] = 0;
    $field['instructions'] = 'Controlled RFQ copy contract: ' . $contract['id'];
    return $field;
}
