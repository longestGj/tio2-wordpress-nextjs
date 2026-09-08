import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Poland WordPress runtime', () => {
  it('rejects unsafe records, protects edits and rolls back seed failures without crossing sites', () => {
    const result = spawnSync('docker', ['run', '--rm', '--network', 'none', '-v',
      `${resolve('.')}:/work:ro`, 'wordpress:php8.3-apache', 'php',
      '/work/tests/infrastructure/php/market-poland-runtime.php'], { encoding: 'utf8', timeout: 60_000 });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('Poland runtime PASS');
  }, 65_000);
});
