"""Public probes must distinguish real content from stale or serialized values."""
import os
from pathlib import Path
import subprocess
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'production-runtime'))
from content_next_rehearsal import NextRuntime, canonical_url


class ContentNextProbeTests(unittest.TestCase):
    def setUp(self):
        self.runtime=NextRuntime.__new__(NextRuntime)
        self.runtime.changed_fields={'HOME-001':['hero.body']}
        self.record={'pageId':'HOME-001','content':{'hero':{'heading':'Stable heading','body':'New body'},
            'seo':{'title':'Stable title','description':'Stable description'}}}
        self.html='<title>Stable title</title><meta name="description" content="Stable description"><h1>Stable heading</h1><p>New body</p>'

    def test_actual_body_reaches_rendered_document(self):
        self.runtime.assert_rendered_fields(self.record,self.html)

    def test_unchanged_title_does_not_hide_stale_body(self):
        with self.assertRaises(AssertionError):
            self.runtime.assert_rendered_fields(self.record,self.html.replace('New body','Old body'))

    def test_serialized_rsc_text_is_not_visible_body_evidence(self):
        with self.assertRaises(AssertionError):
            self.runtime.assert_rendered_fields(self.record,self.html.replace('New body','Old body')+'<script>New body</script>')

    def test_only_empty_root_is_normalized(self):
        self.assertEqual(canonical_url('https://site.test'),canonical_url('https://site.test/'))
        self.assertNotEqual(canonical_url('https://site.test/a'),canonical_url('https://site.test/a/'))

    def test_close_waits_for_actual_owned_process_exit(self):
        process=subprocess.Popen(['node','-e','setInterval(()=>{},1000)'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
        def cleanup():
            if process.poll() is None:process.kill();process.wait(timeout=10)
        self.addCleanup(cleanup)
        self.runtime.server=None;self.runtime.next=process
        self.runtime.close()
        self.assertIsNotNone(process.poll())


if __name__=='__main__':unittest.main()
