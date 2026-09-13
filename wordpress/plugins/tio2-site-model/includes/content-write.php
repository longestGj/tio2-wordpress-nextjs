<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;

/** Request-local authority is private, exact, non-nestable, and always cleared. */
final class Tio2_Approved_Content_Write {
    private static ?array $context = null;

    public static function active(): bool { return self::$context !== null; }

    public static function permits_meta(int $id, string $key, $value): bool {
        foreach (self::$context['records'] ?? [] as $record) {
            if ($id === $record['postId'] && $key === $record['metaKey'] && is_string($value) &&
                current_user_can('edit_post', $id) && $value === $record['content'] &&
                get_post_meta($id, $key, true) === $record['before']) return true;
        }
        return false;
    }

    public static function permits_status(int $id, string $status): bool {
        foreach (self::$context['records'] ?? [] as $record) {
            if ($id === $record['postId'] && $status === 'publish' && self::capable($id) &&
                get_post_meta($id, $record['metaKey'], true) === $record['content']) return true;
        }
        return false;
    }

    /** Returns true only while a transaction owns this event. Existing ordinary queues are untouched. */
    public static function defer_event(int $id, ?array $affected): bool {
        if (!self::active()) return false;
        if ($affected !== null) {
            $old = self::$context['events'][$id] ?? null;
            self::$context['events'][$id] = is_array($old) ? tio2_merge_webhook_affected_state($old, $affected) : $affected;
        }
        return true;
    }

    private static function capable(int $id): bool {
        $type = get_post_type_object(get_post_type($id));
        return $type && current_user_can('edit_post', $id) && current_user_can($type->cap->publish_posts);
    }

    private static function query(string $sql): void {
        global $wpdb;
        if ($wpdb->query($sql) === false) throw new RuntimeException('write_database');
    }

    /** Explicit next-key locks under REPEATABLE READ, in one fixed order.
     * MY scope membership and target slug ranges prevent new competing identities.
     * MY post rows prevent a non-target type becoming a target while we validate.
     * Metadata locks cover only target families and MY Page/Post route competitors;
     * A/B writers and other MY families' metadata are not serialized by this service.
     */
    private static function lock_records(array $pages): void {
        global $wpdb;
        self::query("SELECT term_id FROM {$wpdb->terms} FORCE INDEX (slug) WHERE slug='tio2-my' ORDER BY term_id FOR UPDATE");
        $terms=array_map('intval',array_column($wpdb->last_result,'term_id'));
        if(count($terms)!==1) throw new RuntimeException('write_identity');
        self::query("SELECT term_taxonomy_id FROM {$wpdb->term_taxonomy} FORCE INDEX (term_id_taxonomy) WHERE term_id={$terms[0]} AND taxonomy='site_scope' ORDER BY term_taxonomy_id FOR UPDATE");
        $taxonomies=array_map('intval',array_column($wpdb->last_result,'term_taxonomy_id'));
        if(count($taxonomies)!==1) throw new RuntimeException('write_identity');
        self::query("SELECT object_id FROM {$wpdb->term_relationships} FORCE INDEX (term_taxonomy_id) WHERE term_taxonomy_id={$taxonomies[0]} ORDER BY object_id FOR UPDATE");
        $ids=array_map('intval',array_column($wpdb->last_result,'object_id'));
        $target_ids=[]; $types=['page','post'];
        foreach($pages as $page) {
            $def=tio2_content_write_registry()[$page]; $types[]=$def['type'];
            self::query($wpdb->prepare("SELECT ID FROM {$wpdb->posts} FORCE INDEX (post_name) WHERE post_name=%s ORDER BY ID FOR UPDATE",$def['slug']));
            foreach($wpdb->last_result as $row) { $ids[]=(int)$row->ID; $target_ids[]=(int)$row->ID; }
        }
        $ids=array_values(array_unique($ids)); sort($ids,SORT_NUMERIC);
        if(!$ids) throw new RuntimeException('write_identity');
        self::query("SELECT ID,post_type FROM {$wpdb->posts} FORCE INDEX (PRIMARY) WHERE ID IN (".implode(',',$ids).") ORDER BY ID FOR UPDATE");
        $meta_ids=$target_ids;
        foreach($wpdb->last_result as $row) if(in_array($row->post_type,$types,true)) $meta_ids[]=(int)$row->ID;
        $meta_ids=array_values(array_unique($meta_ids)); sort($meta_ids,SORT_NUMERIC);
        // The MY secondary-index range alone cannot block another site's scope
        // being appended to a target. Lock each candidate's entire PRIMARY
        // (object_id, term_taxonomy_id) range, including insertion gaps.
        foreach($meta_ids as $id) self::query("SELECT term_taxonomy_id FROM {$wpdb->term_relationships} FORCE INDEX (PRIMARY) WHERE object_id={$id} ORDER BY term_taxonomy_id FOR UPDATE");
        foreach($meta_ids as $id) self::query("SELECT meta_id FROM {$wpdb->postmeta} FORCE INDEX (post_id) WHERE post_id={$id} ORDER BY meta_id FOR UPDATE");
    }

    /** Pure, uncached identity/uniqueness read, never calls the mutating reconciler. */
    private static function locate(string $page): array {
        global $wpdb;
        $def = tio2_content_write_registry()[$page];
        $posts = $wpdb->get_results($wpdb->prepare("SELECT ID, post_type, post_name, post_status FROM {$wpdb->posts} WHERE post_type = %s ORDER BY ID", $def['type']), ARRAY_A);
        $owners = [];
        foreach ($posts as $post) {
            $id = (int)$post['ID'];
            $scopes = $wpdb->get_col($wpdb->prepare("SELECT t.slug FROM {$wpdb->terms} t JOIN {$wpdb->term_taxonomy} tt ON tt.term_id=t.term_id JOIN {$wpdb->term_relationships} tr ON tr.term_taxonomy_id=tt.term_taxonomy_id WHERE tr.object_id=%d AND tt.taxonomy='site_scope' ORDER BY t.slug", $id));
            if ($post['post_name'] === $def['slug'] || in_array('tio2-my', $scopes, true)) $owners[] = [$post,$scopes];
        }
        if (count($owners) !== 1) throw new RuntimeException('write_identity');
        [$post,$scopes] = $owners[0]; $id = (int)$post['ID'];
        if ($post['post_name'] !== $def['slug'] || $scopes !== ['tio2-my']) throw new RuntimeException('write_identity');
        $rows = $wpdb->get_results($wpdb->prepare("SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id=%d ORDER BY meta_id", $id), ARRAY_A);
        $meta = [];
        foreach ($rows as $row) $meta[$row['meta_key']][] = $row['meta_value'];
        if (count($meta[$def['meta']] ?? []) !== 1) throw new RuntimeException('write_identity');
        if ($page === 'HOME-001' && ($meta['homepage_schema_version'] ?? []) !== ['homepage-v0.4-malaysia']) throw new RuntimeException('write_identity');
        if ($page === 'APP-000' && ($meta['public_path'] ?? []) !== ['/applications']) throw new RuntimeException('write_identity');
        $conflicts = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id=p.ID JOIN {$wpdb->term_relationships} tr ON tr.object_id=p.ID JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id=tr.term_taxonomy_id JOIN {$wpdb->terms} t ON t.term_id=tt.term_id WHERE p.post_type IN ('page','post') AND m.meta_key='public_path' AND m.meta_value=%s AND tt.taxonomy='site_scope' AND t.slug='tio2-my'", $def['path']));
        if ((int)$conflicts !== 0 || $wpdb->last_error) throw new RuntimeException('write_identity');
        clean_post_cache($id);
        return ['postId'=>$id,'metaKey'=>$def['meta'],'before'=>$meta[$def['meta']][0],'status'=>$post['post_status']];
    }

    private static function approval(string $id, string $operation, array $before, array $after) {
        $proof = tio2_load_content_approval($id);
        if (is_wp_error($proof)) return $proof;
        $environment = defined('TIO2_CONTENT_ENVIRONMENT_ID') && is_string(TIO2_CONTENT_ENVIRONMENT_ID) ? TIO2_CONTENT_ENVIRONMENT_ID : '';
        return tio2_check_content_approval($proof, $environment, $operation, $before, $after, time());
    }

    public static function apply(string $approval_id, string $operation, array $records) {
        global $wpdb;
        if (self::active()) return new WP_Error('write_nested', 'An approved write is already active.');
        if (wp_using_ext_object_cache()) return new WP_Error('write_cache', 'Persistent object cache transaction isolation is not supported.');
        if (!in_array($operation, ['update-published','publish-draft'], true) || !array_is_list($records) || count($records)<1 || count($records)>2) return new WP_Error('write_input','Invalid approved write request.');
        $after = [];
        foreach ($records as $record) {
            if (!is_array($record) || !tio2_content_approval_keys($record,['pageId','content']) || !is_string($record['pageId']) ||
                !isset(tio2_content_write_registry()[$record['pageId']]) || isset($after[$record['pageId']]) || !is_string($record['content'])) return new WP_Error('write_input','Invalid approved write records.');
            $after[$record['pageId']] = $record['content'];
        }
        ksort($after, SORT_STRING);
        // MariaDB exposes actual session transaction state. Unsupported installations fail closed.
        $state = $wpdb->get_row('SELECT @@session.in_transaction AS active, @@session.autocommit AS automatic', ARRAY_A);
        if (!$state || (int)$state['active'] !== 0 || (int)$state['automatic'] !== 1) return new WP_Error('write_transaction','Cannot own the database transaction.');
        foreach ([$wpdb->posts,$wpdb->postmeta,$wpdb->terms,$wpdb->term_taxonomy,$wpdb->term_relationships,$wpdb->options] as $table) {
            $engine = $wpdb->get_var($wpdb->prepare('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s', $table));
            if (strtoupper((string)$engine) !== 'INNODB') return new WP_Error('write_transaction','Transactional storage is required.');
        }
        $begun = false; $touched = []; $before = []; $events = []; $receipt = null;
        $cache_additions_suspended = wp_suspend_cache_addition();
        try {
            wp_suspend_cache_addition(true);
            // NEXT transaction only: does not alter the session isolation default.
            self::query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
            self::query('START TRANSACTION'); $begun = true;
            self::$context = ['records'=>[],'events'=>[]];
            self::lock_records(array_keys($after));
            $located = [];
            foreach ($after as $page=>$content) {
                $record = self::locate($page); $touched[] = $record['postId'];
                if ($record['status'] !== ($operation === 'update-published' ? 'publish' : 'draft')) throw new RuntimeException('write_status');
                if (!self::capable($record['postId'])) throw new RuntimeException('write_capability');
                $before[$page] = $record['before'];
                // Canonical no-op retains original bytes and grants no metadata mutation.
                $record['content'] = tio2_content_digest($content) === tio2_content_digest($record['before']) ? $record['before'] : $content;
                $located[$page] = $record;
            }
            $valid = self::approval($approval_id, $operation, $before, $after);
            if (is_wp_error($valid)) return $valid;
            self::$context['records'] = $located;
            $changed = [];
            foreach ($located as $page=>$record) {
                if (tio2_content_digest($record['before']) !== tio2_content_digest($record['content'])) {
                    if (!update_post_meta($record['postId'],$record['metaKey'],wp_slash($record['content']))) throw new RuntimeException('write_metadata');
                    $changed[] = $page;
                }
                if ($operation === 'publish-draft') {
                    $result = wp_update_post(['ID'=>$record['postId'],'post_status'=>'publish'],true);
                    if (is_wp_error($result) || !$result) throw new RuntimeException('write_status');
                    if (!in_array($page,$changed,true)) $changed[]=$page;
                }
            }
            foreach ($located as $page=>$record) {
                $fresh = self::locate($page);
                if ($fresh['postId'] !== $record['postId'] || $fresh['status'] !== 'publish' ||
                    tio2_content_digest($fresh['before']) !== tio2_content_digest($record['content']) || !self::capable($fresh['postId'])) throw new RuntimeException('write_readback');
            }
            $valid = self::approval($approval_id, $operation, $before, $after);
            if (is_wp_error($valid)) return $valid;
            if ((int)$wpdb->get_var('SELECT @@session.in_transaction') !== 1) throw new RuntimeException('write_transaction');
            $events = self::$context['events'];
            self::query('COMMIT'); $begun = false;
            $receipt = ['siteId'=>'tio2-my','approvalId'=>$approval_id,'operation'=>$operation,
                'changedPages'=>$changed,'beforeDigests'=>array_map('tio2_content_digest',$before),'afterDigests'=>array_map('tio2_content_digest',$after),
                'committed'=>true,'notificationState'=>$events ? 'pending' : 'not-needed','events'=>$events];
        } catch (Throwable $error) {
            return new WP_Error(in_array($error->getMessage(),['write_database','write_identity','write_status','write_capability','write_metadata','write_readback','write_transaction'],true) ? $error->getMessage() : 'write_failed', 'Approved content write did not commit.');
        } finally {
            if ($begun) $wpdb->query('ROLLBACK');
            self::$context = null;
            wp_suspend_cache_addition($cache_additions_suspended);
            foreach ($touched as $id) { clean_post_cache($id); if (function_exists('acf_flush_value_cache')) acf_flush_value_cache($id); }
        }
        // Task 3 consumes only committed receipts. Exceptions cannot report a rollback after COMMIT.
        if ($events && function_exists('tio2_release_approved_content_events')) {
            try { $receipt = tio2_release_approved_content_events($receipt,$events); }
            catch (Throwable $error) { $receipt['notificationState']='failed'; }
        }
        return $receipt;
    }
}

/** records contain pageId/content only. Identity, actual user and proof source are server-owned. */
function tio2_apply_approved_content(string $approval_id, string $operation, array $records) {
    return Tio2_Approved_Content_Write::apply($approval_id,$operation,$records);
}
