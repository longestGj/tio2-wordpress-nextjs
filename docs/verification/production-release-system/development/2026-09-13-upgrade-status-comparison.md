# Upgrade status comparison correction

- Subject: `tio2-my`; user requested continuation after root diagnosis.
- Scope: correct the administrator runner postcheck, preserve raw-file checks;
  no CMS/frontend/configuration changes or new upgrade plan.
- Base: `f5386a5ac57dd82ebcfe2c21557709e30b347215`.
- Reviewed implementation: `e11d0b424404ab3cbf7eda44a8be1f021fa2072c`.
- Branch: `codex/fix-upgrade-status-comparison`.
- Status: `MERGED_TO_DEVELOP`; merge `acce162f9da194b8f505784bd33035bf16be000a`.
- Merged-checkout regression: 4 tests passed (10.909 seconds).

## Cause and correction

Root diagnostic showed program pointer at `upgrade-6405fe791c0854937f2405bdfa0f564c06cdb5dd`,
status OK, `ROLLED_BACK`, frontend capability true, recovery/window false,
`RAW_STATE_MATCH=False`, `REDACTED_STATE_MATCH=True`.
The administrator runner compared the controller's redacted public view with
raw state. The correction imports `redact` and applies it to the comparison's
stored-state side. No other production logic changes.

`ProgramUpgrade._check_plan` still validates raw preserved files before and after
verification. Thus the public comparison cannot hide sensitive-state drift.

## Verification

- New actual-main postcheck fixture reproduced the original failure before fix.
- Windows: 4 tests passed (8.893 seconds), including non-sensitive drift,
  capability/recovery guards, and real ProgramUpgrade raw-sensitive-state drift.
- Linux root: 21 tests passed (19.417 seconds), no skips; actual-main regression
  plus existing upgrade/resume/recovery tests using protected temporary fixtures.
  Command: `python -B -m unittest tests.production.test_upgrade_status_comparison tests.production.test_phase1_program_upgrade.ProgramUpgradeTests`.
- Independent reviewer `review_analytics_config_update`: approved exact HEAD,
  no actionable findings, conditioned on Linux suite which subsequently passed.
  Reviewer read code and ran diff check, did not claim an independent full run.

## Recovery delivery

Export the corrected runner from exact committed Git blob under a new filename
beside the original `/root/d16-program-upgrade-6405fe79` runner and unchanged admin
bundle. Resume `apply` with the SAME approved plan hash:
`be61dab5b83a5e3f78ee2bdc3ec1d037c8969f8798beb521691098455de1db15`.
Do not edit/delete the original runner, empty failed output, journal or plan.
Use a new output filename. Existing apply may rewrite identical generation
files; approved hashes are checked. Do not construct a new upgrade plan or
publish the website as part of this postcheck repair.

No production write was executed while developing this correction.
