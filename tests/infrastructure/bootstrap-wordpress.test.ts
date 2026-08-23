import {spawnSync} from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {delimiter, join} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

describe('WordPress bootstrap readiness', () => {
  const temporaryDirectories: string[] = []

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, {recursive: true, force: true})
    }
  })

  it('waits for database connectivity before checking an installed site', () => {
    const testRoot = mkdtempSync(join(tmpdir(), 'tio2-bootstrap-'))
    temporaryDirectories.push(testRoot)

    const scriptsDirectory = join(testRoot, 'scripts')
    const wordpressDirectory = join(testRoot, 'wordpress')
    const binDirectory = join(testRoot, 'bin')
    const logFile = join(testRoot, 'docker.log')
    const stateFile = join(testRoot, 'docker.state')

    mkdirSync(scriptsDirectory)
    mkdirSync(wordpressDirectory)
    mkdirSync(binDirectory)
    copyFileSync(
      'scripts/bootstrap-wordpress.ps1',
      join(scriptsDirectory, 'bootstrap-wordpress.ps1')
    )
    copyFileSync(
      'scripts/assert-local-wordpress-env.ps1',
      join(scriptsDirectory, 'assert-local-wordpress-env.ps1'),
    )
    writeFileSync(
      join(wordpressDirectory, '.env'),
      [
        'WORDPRESS_ADMIN_USER=tio2-local-editor',
        `WORDPRESS_ADMIN_PASSWORD=${'a'.repeat(64)}`,
        'WORDPRESS_ADMIN_EMAIL=admin@example.test',
        `NEXTJS_REVALIDATION_SECRET_TIO2_A=${'b'.repeat(64)}`,
        `NEXTJS_REVALIDATION_SECRET_TIO2_B=${'c'.repeat(64)}`,
        `NEXTJS_PREVIEW_SECRET_TIO2_A=${'d'.repeat(64)}`,
        `NEXTJS_PREVIEW_SECRET_TIO2_B=${'e'.repeat(64)}`,
      ].join('\n'),
    )
    writeFileSync(join(wordpressDirectory, 'docker-compose.yml'), 'services: {}\n')
    writeFileSync(
      join(binDirectory, 'docker.ps1'),
      `param([Parameter(ValueFromRemainingArguments = $true)][string[]] $Arguments)
$CommandLine = $Arguments -join ' '
Add-Content -LiteralPath $env:TIO2_FAKE_DOCKER_LOG -Value $CommandLine

if ($CommandLine -match ' wp db check') {
    $Attempt = 0
    if (Test-Path -LiteralPath $env:TIO2_FAKE_DOCKER_STATE) {
        $Attempt = [int](Get-Content -LiteralPath $env:TIO2_FAKE_DOCKER_STATE)
    }
    $Attempt++
    Set-Content -LiteralPath $env:TIO2_FAKE_DOCKER_STATE -Value $Attempt
    if ($Attempt -lt 2) {
        Write-Error 'database is starting'
        exit 1
    }
    exit 0
}

if ($CommandLine -match ' wp core is-installed') {
    exit 0
}

if ($CommandLine -match ' wp core install') {
    Write-Error 'core install must not run for an installed site'
    exit 97
}

exit 0
`
    )

    const result = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        join(scriptsDirectory, 'bootstrap-wordpress.ps1'),
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ''}`,
          TIO2_FAKE_DOCKER_LOG: logFile,
          TIO2_FAKE_DOCKER_STATE: stateFile,
        },
      }
    )

    const commands = readFileSync(logFile, 'utf8').trim().split(/\r?\n/)
    const databaseChecks = commands.filter((command) =>
      command.includes(' wp db check')
    )
    const installedCheckIndex = commands.findIndex((command) =>
      command.includes(' wp core is-installed')
    )
    const successfulDatabaseCheckIndex = commands.lastIndexOf(databaseChecks.at(-1) ?? '')

    expect(result.status, result.stderr || result.stdout).toBe(0)
    expect(databaseChecks).toHaveLength(2)
    expect(successfulDatabaseCheckIndex).toBeLessThan(installedCheckIndex)
    expect(commands.some((command) => command.includes(' wp core install'))).toBe(false)
    expect(
      commands.some((command) =>
        command.includes('wp eval-file /workspace/wordpress/bootstrap/ensure-local-admin.php'),
      ),
    ).toBe(true)
    expect(readFileSync(logFile, 'utf8')).not.toContain('a'.repeat(64))
  })

  it('blocks a fresh install that still has placeholder administrator credentials', () => {
    const testRoot = mkdtempSync(join(tmpdir(), 'tio2-bootstrap-secret-'))
    temporaryDirectories.push(testRoot)
    const scriptsDirectory = join(testRoot, 'scripts')
    const wordpressDirectory = join(testRoot, 'wordpress')
    const binDirectory = join(testRoot, 'bin')
    const logFile = join(testRoot, 'docker.log')
    mkdirSync(scriptsDirectory)
    mkdirSync(wordpressDirectory)
    mkdirSync(binDirectory)
    copyFileSync(
      'scripts/bootstrap-wordpress.ps1',
      join(scriptsDirectory, 'bootstrap-wordpress.ps1'),
    )
    copyFileSync(
      'scripts/assert-local-wordpress-env.ps1',
      join(scriptsDirectory, 'assert-local-wordpress-env.ps1'),
    )
    copyFileSync('wordpress/.env.example', join(wordpressDirectory, '.env'))
    writeFileSync(join(wordpressDirectory, 'docker-compose.yml'), 'services: {}\n')
    writeFileSync(
      join(binDirectory, 'docker.ps1'),
      `param([Parameter(ValueFromRemainingArguments = $true)][string[]] $Arguments)
$CommandLine = $Arguments -join ' '
Add-Content -LiteralPath $env:TIO2_FAKE_DOCKER_LOG -Value $CommandLine
if ($CommandLine -match ' wp db check') { exit 0 }
if ($CommandLine -match ' wp core is-installed') { exit 1 }
if ($CommandLine -match ' wp core install') { exit 0 }
exit 0
`,
    )

    const result = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        join(scriptsDirectory, 'bootstrap-wordpress.ps1'),
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ''}`,
          TIO2_FAKE_DOCKER_LOG: logFile,
        },
      },
    )

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('generated 64-hex credentials')
    expect(readFileSync(logFile, 'utf8')).not.toContain(' wp core install')
  })
})
