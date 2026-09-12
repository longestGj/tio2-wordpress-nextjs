from __future__ import annotations

import sys
import unittest
from dataclasses import FrozenInstanceError
from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parents[2] / "ops" / "production" / "server"
sys.path.insert(0, str(SERVER_ROOT))

from release_classifier import ChangeSet, classify_release  # noqa: E402
from release_contract import ReleaseError  # noqa: E402


class ReleaseClassifierTests(unittest.TestCase):
    def changes(self, **overrides: object) -> ChangeSet:
        values: dict[str, object] = {
            "git_paths": ("app/(en)/page.tsx",),
            "site_ids": ("tio2-my",),
            "content_scopes": (),
            "cms_contract_changed": False,
            "host_paths": (),
            "receipt_ids": ("DEV-17",),
        }
        values.update(overrides)
        return ChangeSet(**values)  # type: ignore[arg-type]

    def test_classifies_site_frontend_and_scoped_content_as_combined(self) -> None:
        units = classify_release(
            self.changes(
                content_scopes=("tio2-my",),
            )
        )
        self.assertEqual([(unit.subject, unit.release_type) for unit in units], [("tio2-my", "combined")])

    def test_cross_subject_change_returns_separate_campaign_units(self) -> None:
        units = classify_release(self.changes(site_ids=("tio2-my", "site-b")))
        self.assertEqual([(unit.subject, unit.release_type) for unit in units], [("site-b", "frontend-only"), ("tio2-my", "frontend-only")])
        self.assertEqual({unit.paths for unit in units}, {("app/(en)/page.tsx",)})

    def test_classifies_single_scope_content_without_frontend(self) -> None:
        units = classify_release(
            self.changes(
                git_paths=("content/tio2-my/records.json",),
                site_ids=(),
                content_scopes=("tio2-my",),
            )
        )
        self.assertEqual([(unit.subject, unit.release_type) for unit in units], [("tio2-my", "content-only")])

    def test_host_resources_take_priority_over_site_attribution(self) -> None:
        path = "ops/production/server/controller.py"
        units = classify_release(self.changes(git_paths=(path,), host_paths=(path,)))
        self.assertEqual([(unit.subject, unit.release_type, unit.paths) for unit in units], [("host", "host-infrastructure", (path,))])

    def test_cms_shared_resources_and_cross_scope_content_are_platform_units(self) -> None:
        cms = classify_release(
            self.changes(
                git_paths=("wordpress/plugins/shared/plugin.php",),
                site_ids=("site-b", "tio2-my"),
                cms_contract_changed=True,
            )
        )
        self.assertEqual([(unit.subject, unit.release_type) for unit in cms], [("cms", "cms-platform")])

        cross_scope = classify_release(
            self.changes(
                git_paths=("content/site-b/records.json", "content/tio2-my/records.json"),
                site_ids=("site-b", "tio2-my"),
                content_scopes=("site-b", "tio2-my"),
            )
        )
        self.assertEqual([(unit.subject, unit.release_type) for unit in cross_scope], [("cms", "cms-platform")])

    def test_host_cms_and_site_changes_remain_separate_units_in_priority_order(self) -> None:
        host = "ops/production/server/controller.py"
        units = classify_release(
            self.changes(
                git_paths=("app/page.tsx", host, "wordpress/plugins/shared.php"),
                cms_contract_changed=True,
                host_paths=(host,),
            )
        )
        self.assertEqual(
            [(unit.subject, unit.release_type) for unit in units],
            [("host", "host-infrastructure"), ("cms", "cms-platform"), ("tio2-my", "frontend-only")],
        )

    def test_missing_receipts_unknown_paths_and_unknown_consumers_fail_closed(self) -> None:
        cases = (
            self.changes(receipt_ids=()),
            self.changes(git_paths=("unknown/file.xyz",), site_ids=()),
            self.changes(git_paths=("components/shared.tsx",), site_ids=()),
            self.changes(site_ids=("site-b", "tio2-my"), content_scopes=("site-b", "tio2-my")),
            self.changes(git_paths=()),
        )
        for change_set in cases:
            with self.subTest(change_set=change_set), self.assertRaisesRegex(ReleaseError, "unclassified release change"):
                classify_release(change_set)

    def test_change_set_sorts_deduplicates_and_freezes_all_collections(self) -> None:
        change_set = self.changes(
            git_paths=("z", "a", "z"),
            site_ids=("tio2-my", "site-b", "site-b"),
            content_scopes=("tio2-my", "tio2-my"),
            host_paths=("z", "z"),
            receipt_ids=("DEV-2", "DEV-1", "DEV-1"),
        )
        self.assertEqual(change_set.git_paths, ("a", "z"))
        self.assertEqual(change_set.site_ids, ("site-b", "tio2-my"))
        self.assertEqual(change_set.content_scopes, ("tio2-my",))
        self.assertEqual(change_set.host_paths, ("z",))
        self.assertEqual(change_set.receipt_ids, ("DEV-1", "DEV-2"))
        with self.assertRaises(FrozenInstanceError):
            change_set.site_ids = ()  # type: ignore[misc]

    def test_release_units_carry_sorted_paths_and_receipts(self) -> None:
        units = classify_release(
            self.changes(
                git_paths=("components/z.tsx", "app/a.tsx"),
                receipt_ids=("DEV-2", "DEV-1"),
            )
        )
        self.assertEqual(units[0].paths, ("app/a.tsx", "components/z.tsx"))
        self.assertEqual(units[0].receipt_ids, ("DEV-1", "DEV-2"))


if __name__ == "__main__":
    unittest.main()
