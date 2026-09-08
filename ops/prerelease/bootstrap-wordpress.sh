#!/usr/bin/env bash
set -euo pipefail

manifest=/workspace/ops/prerelease/seed-manifest.json
verified=/run-state/verified-seeds.tsv

# Seed scripts consume approved JSON and other files outside their own source.
# A changed input must refresh the scoped CMS even when the apply script is unchanged.
seed_input_fingerprint() {
  (cd "$1" && find wordpress/plugins/tio2-site-model/config wordpress/seed -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}')
}

verify_seed_manifest() {
  MANIFEST_PATH="$manifest" SOURCE_ROOT=/workspace php -r '
    $manifest = json_decode((string) file_get_contents(getenv("MANIFEST_PATH")), true, 512, JSON_THROW_ON_ERROR);
    if (($manifest["schemaVersion"] ?? null) !== 1 || ($manifest["siteScope"] ?? null) !== "tio2-my") {
        fwrite(STDERR, "Invalid prerelease seed manifest.\n"); exit(2);
    }
    foreach (($manifest["seeds"] ?? []) as $seed) {
        $relative = (string) ($seed["path"] ?? "");
        $expected = strtolower((string) ($seed["sha256"] ?? ""));
        $path = rtrim(getenv("SOURCE_ROOT"), "/") . "/" . ltrim($relative, "/");
        $actual = is_file($path) ? hash_file("sha256", $path) : "missing";
        if (!preg_match("/^[a-f0-9]{64}$/", $expected) || !hash_equals($expected, $actual)) {
            fwrite(STDERR, "Seed hash mismatch: {$relative}; expected {$expected}; actual {$actual}\n"); exit(3);
        }
        echo $relative, "\t", $expected, "\n";
    }
  ' > "$verified"
}

prepare_editorial_reviews() {
  mkdir -p /workspace/.tmp
  SOURCE_CONFIG=/var/www/html/wp-content/plugins/tio2-site-model/config php -r '
    foreach ([
        "tio2-my-editorial-review-evidence.json" => "editorial-source-reviews.json",
        "tio2-my-alternatives-review-evidence.json" => "five-source-reviews.json",
    ] as $source => $target) {
        $document = json_decode((string) file_get_contents(getenv("SOURCE_CONFIG") . "/" . $source), true, 512, JSON_THROW_ON_ERROR);
        $reviews = [];
        foreach (($document["pages"] ?? []) as $page) {
            if (isset($page["pageId"], $page["currentReview"])) $reviews[$page["pageId"]] = $page["currentReview"];
        }
        file_put_contents("/workspace/.tmp/" . $target, json_encode($reviews, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }
  '
}

record_seed_result() {
  local path="$1"
  local hash="$2"
  local output="$3"
  local current
  current="$(wp option get d16_prerelease_seed_records 2>/dev/null || printf '{}')"
  local next_records
  next_records="$(CURRENT_RECORDS="$current" SEED_PATH="$path" SEED_HASH="$hash" SEED_OUTPUT="$output" php -r '
    $records = json_decode((string) getenv("CURRENT_RECORDS"), true);
    if (!is_array($records)) $records = [];
    $payload = json_decode((string) getenv("SEED_OUTPUT"), true);
    if (!is_array($payload)) { fwrite(STDERR, "Seed did not return JSON: " . getenv("SEED_PATH") . "\n"); exit(4); }
    $ids = [];
    $walk = function ($value, $key = null) use (&$walk, &$ids): void {
        if (in_array($key, ["postId", "postIds", "createdIds"], true)) {
            foreach ((array) $value as $candidate) if (is_numeric($candidate) && (int) $candidate > 0) $ids[] = (int) $candidate;
        }
        if (is_array($value)) foreach ($value as $childKey => $child) $walk($child, is_string($childKey) ? $childKey : null);
    };
    $walk($payload);
    $ids = array_values(array_unique($ids)); sort($ids, SORT_NUMERIC);
    $records[getenv("SEED_PATH")] = ["sha256" => getenv("SEED_HASH"), "postIds" => $ids];
    ksort($records);
    echo json_encode($records, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
  ')"
  printf '%s' "$next_records" > /run-state/seed-records.next.json
  if [[ "$next_records" != "$current" ]]; then
    wp option update d16_prerelease_seed_records "$(cat /run-state/seed-records.next.json)" --autoload=no >/dev/null
  fi
}

seed_record_is_current() {
  local path="$1"
  local hash="$2"
  local current
  current="$(wp option get d16_prerelease_seed_records 2>/dev/null || printf '{}')"
  CURRENT_RECORDS="$current" SEED_PATH="$path" SEED_HASH="$hash" php -r '
    $records = json_decode((string) getenv("CURRENT_RECORDS"), true);
    $record = is_array($records) ? ($records[getenv("SEED_PATH")] ?? null) : null;
    exit(is_array($record) && hash_equals((string) ($record["sha256"] ?? ""), getenv("SEED_HASH")) ? 0 : 1);
  '
}

until wp db check --quiet >/dev/null 2>&1; do sleep 2; done

if ! wp core is-installed >/dev/null 2>&1; then
  wp core install \
    --url=http://127.0.0.1:8180 \
    --title='TiO2 Malaysia Local Prerelease' \
    --admin_user="$WORDPRESS_ADMIN_USER" \
    --admin_password="$WORDPRESS_ADMIN_PASSWORD" \
    --admin_email="$WORDPRESS_ADMIN_EMAIL" \
    --skip-email >/dev/null
fi

if wp user get "$WORDPRESS_ADMIN_USER" --field=ID >/dev/null 2>&1; then
  wp user update "$WORDPRESS_ADMIN_USER" --user_pass="$WORDPRESS_ADMIN_PASSWORD" --user_email="$WORDPRESS_ADMIN_EMAIL" >/dev/null
else
  wp user create "$WORDPRESS_ADMIN_USER" "$WORDPRESS_ADMIN_EMAIL" --role=administrator --user_pass="$WORDPRESS_ADMIN_PASSWORD" >/dev/null
fi

for plugin in wp-graphql advanced-custom-fields wordpress-seo wpgraphql-acf add-wpgraphql-seo; do
  wp plugin is-installed "$plugin" >/dev/null 2>&1 || wp plugin install "$plugin" >/dev/null
  wp plugin activate "$plugin" >/dev/null
done
wp plugin activate tio2-site-model >/dev/null
wp term get site_scope tio2-my --by=slug >/dev/null 2>&1 || wp term create site_scope 'TiO2 Malaysia' --slug=tio2-my >/dev/null
wp rewrite structure '/%postname%/' --hard >/dev/null

# Verify every source byte before any seed is allowed to execute.
verify_seed_manifest
prepare_editorial_reviews
input_hash="$(seed_input_fingerprint /workspace)"
previous_input_hash="$(wp option get d16_prerelease_seed_input_sha256 2>/dev/null || true)"

while IFS=$'\t' read -r seed_path seed_hash; do
  option_name="d16_prerelease_seed_${seed_hash}"
  existing_marker="$(wp option get "$option_name" 2>/dev/null || true)"
  if [[ "$previous_input_hash" == "$input_hash" ]] && [[ "$existing_marker" == "$seed_path" ]] && seed_record_is_current "$seed_path" "$seed_hash"; then
    continue
  fi
  case "$seed_path" in
    *apply-tio2-my-editorial.php)
      wp option update tio2_editorial_task_id G8-TRADE4-APP5-20260908-01 --autoload=no >/dev/null
      ;;
    *apply-tio2-my-editorial-five.php)
      wp option update tio2_editorial_task_id G8-DE-IT-SU-R706-CHEMOURS-20260908-01 --autoload=no >/dev/null
      ;;
  esac
  seed_output="$(wp eval-file "/workspace/$seed_path" Apply)"
  record_seed_result "$seed_path" "$seed_hash" "$seed_output"
  if [[ "$existing_marker" != "$seed_path" ]]; then
    wp option update "$option_name" "$seed_path" --autoload=no >/dev/null
  fi
done < "$verified"

wp eval-file /workspace/wordpress/bootstrap/validate-prerelease-site.php > /run-state/site-validation.json
wp option update d16_prerelease_seed_input_sha256 "$input_hash" --autoload=no >/dev/null
printf '%s\n' "$input_hash" > /run-state/seed-input-sha256.txt
bash /workspace/ops/prerelease/collect-cms-identity.sh
