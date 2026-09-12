import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ops/production/server"))


class AdapterContractTests(unittest.TestCase):
    def test_uninstalled_adapter_has_no_write_fallback(self):
        from release_adapter import UninstalledAdapter
        from release_contract import ReleaseError
        adapter = UninstalledAdapter()
        for action in ("prepare", "backup", "stage", "activate", "verify", "rollback"):
            with self.subTest(action=action), self.assertRaisesRegex(ReleaseError, "capability-not-installed"):
                getattr(adapter, action)(None)

    def test_context_rejects_construction_outside_controller(self):
        from release_adapter import ReleaseContext
        with self.assertRaises(TypeError): ReleaseContext()
