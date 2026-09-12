<?php
// Shared probe: SHORTINIT bypasses plugins; SELECTs run in one read-only snapshot.
// Opaque metadata is hashed verbatim, including embedded IDs/URLs/serialized data.
// Such references may conservatively reject otherwise equivalent database copies.
define('SHORTINIT', true);
require '/var/www/html/wp-load.php';
global $wpdb;

function d16_json($value) {
    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}
function d16_rows($sql) {
    global $wpdb;
    $rows = $wpdb->get_results($sql, ARRAY_A);
    if (!is_array($rows) || $wpdb->last_error !== '') {
        throw new RuntimeException('CMS query failed');
    }
    return $rows;
}
function d16_query($sql) {
    global $wpdb;
    if ($wpdb->query($sql) === false) {
        throw new RuntimeException('CMS snapshot unavailable');
    }
}

try {
    d16_query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    d16_query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    $scope = $wpdb->prepare("p.post_status='publish' AND EXISTS (
        SELECT 1 FROM {$wpdb->term_relationships} sr
        JOIN {$wpdb->term_taxonomy} st ON st.term_taxonomy_id=sr.term_taxonomy_id
        JOIN {$wpdb->terms} s ON s.term_id=st.term_id
        WHERE sr.object_id=p.ID AND st.taxonomy='site_scope' AND s.slug=%s)", 'tio2-my');
    $posts = d16_rows("SELECT p.ID,p.post_type,p.post_name,p.post_title,p.post_content,
        p.post_excerpt,p.post_status,p.menu_order,p.post_password,p.post_parent,
        parent.post_type AS parent_type,parent.post_name AS parent_slug
        FROM {$wpdb->posts} p LEFT JOIN {$wpdb->posts} parent ON parent.ID=p.post_parent
        WHERE $scope");
    if (count($posts) === 0 || count($posts) > 100000) {
        throw new RuntimeException('CMS scope is empty or oversized');
    }
    $records = [];
    foreach ($posts as $p) {
        $parent = (string)$p['post_parent'] === '0' ? null :
            ($p['parent_type'] === null ? ['unresolved', (string)$p['post_parent']] :
            [(string)$p['parent_type'], (string)$p['parent_slug']]);
        $fields = [];
        foreach (['post_type','post_name','post_title','post_content','post_excerpt',
                  'post_status','menu_order','post_password'] as $field) {
            $fields[$field] = (string)$p[$field];
        }
        $records[(string)$p['ID']] = ['fields'=>$fields, 'parent'=>$parent, 'meta'=>[], 'terms'=>[]];
    }
    $metadata = d16_rows("SELECT pm.post_id,pm.meta_key,pm.meta_value
        FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID=pm.post_id
        WHERE $scope ORDER BY pm.meta_id");
    foreach ($metadata as $m) {
        if (in_array($m['meta_key'], ['_edit_lock','_edit_last'], true)) { continue; }
        // WordPress returns the first meta_id for single-value reads. Preserve
        // values within each key, but never hash database-local meta IDs.
        // JSON-encoded keys avoid PHP's numeric-string array-key coercion.
        $key = d16_json((string)$m['meta_key']);
        $records[(string)$m['post_id']]['meta'][$key][] = (string)$m['meta_value'];
    }
    $terms = d16_rows("SELECT tr.object_id,tt.taxonomy AS taxonomy,t.slug,t.name,tt.description,
        parent.slug AS parent_slug,tr.term_order
        FROM {$wpdb->term_relationships} tr
        JOIN {$wpdb->posts} p ON p.ID=tr.object_id
        JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id=tr.term_taxonomy_id
        JOIN {$wpdb->terms} t ON t.term_id=tt.term_id
        LEFT JOIN {$wpdb->terms} parent ON parent.term_id=tt.parent WHERE $scope");
    foreach ($terms as $t) {
        $records[(string)$t['object_id']]['terms'][] = d16_json([
            (string)$t['taxonomy'], (string)$t['slug'], (string)$t['name'],
            (string)$t['description'], $t['parent_slug'], (string)$t['term_order']]);
    }
    $canonical = [];
    foreach ($records as $record) {
        ksort($record['meta'], SORT_STRING);
        sort($record['terms'], SORT_STRING);
        $canonical[] = d16_json($record);
    }
    sort($canonical, SORT_STRING);
    d16_query('ROLLBACK');
    echo d16_json(['schemaVersion'=>'d16-cms-content-snapshot-v1', 'siteScope'=>'tio2-my',
        'publishedRecords'=>count($posts), 'contentSha256'=>hash('sha256', d16_json($canonical))]);
} catch (Throwable $error) {
    $wpdb->query('ROLLBACK');
    // Never expose database errors, content, credentials or metadata.
    fwrite(STDERR, "CMS content snapshot failed\n");
    exit(1);
}
