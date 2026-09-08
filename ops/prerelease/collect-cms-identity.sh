#!/usr/bin/env bash
set -euo pipefail

manifest=/workspace/ops/prerelease/seed-manifest.json
wordpress_version="$(wp core version)"
active_plugins="$(wp plugin list --status=active --fields=name,version --format=json)"
manifest_sha256="$(sha256sum "$manifest" | awk '{print $1}')"
seed_hashes="$(MANIFEST_PATH="$manifest" php -r '$m=json_decode((string)file_get_contents(getenv("MANIFEST_PATH")),true,512,JSON_THROW_ON_ERROR); echo json_encode(array_values(array_map(static fn($s)=>(string)$s["sha256"],$m["seeds"])),JSON_THROW_ON_ERROR);')"
site_counts="$(cat /run-state/site-validation.json)"
initialized_at="$(php -r '
  $path = "/run-state/cms-identity.json";
  if (is_file($path)) {
    $existing = json_decode((string) file_get_contents($path), true);
    if (is_array($existing) && isset($existing["initializedAt"]) && is_string($existing["initializedAt"])) {
      echo $existing["initializedAt"];
      exit;
    }
  }
  echo gmdate("c");
')"

WORDPRESS_VERSION="$wordpress_version" \
ACTIVE_PLUGINS="$active_plugins" \
MANIFEST_SHA256="$manifest_sha256" \
SEED_HASHES="$seed_hashes" \
SITE_COUNTS="$site_counts" \
INITIALIZED_AT="$initialized_at" \
php -r '
  $identity = [
    "schemaVersion" => 1,
    "siteScope" => "tio2-my",
    "wordpressVersion" => getenv("WORDPRESS_VERSION"),
    "activePlugins" => json_decode((string) getenv("ACTIVE_PLUGINS"), true, 512, JSON_THROW_ON_ERROR),
    "seedManifestSha256" => getenv("MANIFEST_SHA256"),
    "orderedSeedHashes" => json_decode((string) getenv("SEED_HASHES"), true, 512, JSON_THROW_ON_ERROR),
    "counts" => json_decode((string) getenv("SITE_COUNTS"), true, 512, JSON_THROW_ON_ERROR)["counts"],
    "initializedAt" => getenv("INITIALIZED_AT"),
  ];
  file_put_contents("/run-state/cms-identity.json", json_encode($identity, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n");
'
