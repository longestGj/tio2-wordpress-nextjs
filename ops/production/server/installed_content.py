"""Admission for explicitly enrolled content runtimes; no inferred installation."""
import json
import re

from content_docker import ContentDockerRuntime
from content_release import ContentRelease
from release_contract import ReleaseError, _open_regular_read
from site_content_adapter import SiteContentAdapter, _unique


def content_baselines(subject, state, candidate, runtime):
    observed = runtime.identity()
    if (not isinstance(observed, dict)
            or set(observed) != {'frontendImageId','buildId','configurationSha256','cmsContractSha256'}
            or observed['buildId'] != candidate.build_id
            or not isinstance(observed['frontendImageId'], str)
            or not re.fullmatch(r'sha256:[a-f0-9]{64}',observed['frontendImageId'])
            or any(not isinstance(observed[name],str) or not re.fullmatch(r'[a-f0-9]{64}', observed[name])
                   for name in ('configurationSha256','cmsContractSha256'))):
        raise ReleaseError('live content runtime differs from tested frontend')
    path = subject.configuration/'content-baseline.json'
    ContentDockerRuntime._trusted_file(path)
    with _open_regular_read(path) as source:
        enrolled = json.load(source, object_pairs_hook=_unique)
    if (not isinstance(enrolled, dict)
            or set(enrolled) != {'schemaVersion','subject','previousProductionReceipt'}
            or enrolled['schemaVersion'] != 'd16-content-baseline-v1'
            or enrolled['subject'] != subject.subject_id
            or not isinstance(enrolled['previousProductionReceipt'], str)
            or not 1 <= len(enrolled['previousProductionReceipt']) <= 256):
        raise ReleaseError('content baseline enrollment mismatch')
    details = state.get('details', {})
    previous = (details.get('previousProductionReceipt',enrolled['previousProductionReceipt'])
                if details.get('releaseType') == 'content-only' else enrolled['previousProductionReceipt'])
    if state.get('state') == 'COMPLETED' and candidate.release_id != details.get('releaseId'):
        completion = details.get('completionEvidence', {})
        if details.get('releaseType') == 'content-only':
            if completion.get('phase') != 'completed':
                raise ReleaseError('prior content completion is missing')
            previous = 'content:' + completion['journalSha256']
    return ({'subject':subject.subject_id, 'previousProductionReceipt':previous,
             'configurationSha256':observed['configurationSha256'],
             'cmsContractSha256':observed['cmsContractSha256'], 'runtimeIdentity':observed}, {'subject':'host'})


def installed_adapters(registry):
    adapters = {}
    for subject in registry.sites.values():
        config = subject.configuration/'content-runtime.json'
        if not config.exists() and not config.is_symlink():
            continue
        # Validate config and installed executable ownership before advertising
        # capability. Concrete runtime identity is re-read for every action.
        installed = ContentDockerRuntime.from_path(config, registry.cms.state_root)
        if installed.config['siteId'] != subject.subject_id:
            raise ReleaseError('content runtime enrollment subject mismatch')
        def runtime_for(target, *, registry=registry):
            runtime = ContentDockerRuntime.from_path(target.configuration/'content-runtime.json', registry.cms.state_root)
            if runtime.config['siteId'] != target.subject_id:
                raise ReleaseError('content runtime enrollment subject mismatch')
            return runtime
        def engine(context, *, runtime_for=runtime_for, registry=registry):
            return ContentRelease(runtime_for(context.subject),registry.cms.state_root/'content-window.json')
        def baseline(target, state, candidate, *, runtime_for=runtime_for):
            return content_baselines(target,state,candidate,runtime_for(target))
        key = (subject.adapter,'content-only')
        enrolled = getattr(adapters.get(key),'enrolled_subjects',frozenset())
        adapters[key] = SiteContentAdapter(engine,baseline)
        adapters[key].enrolled_subjects = enrolled | {subject.subject_id}
    return adapters
