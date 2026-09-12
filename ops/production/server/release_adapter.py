"""Trusted adapter boundary: only the controller constructs release contexts.

Adapters implement one bounded operation; stage includes internal verification,
activate/rollback are the single active-version commit points. They must not
parse command lines, rediscover subjects, or manage controller state/journals.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Protocol

from candidate_contract import CandidateEnvelope, ValidatedPayload
from release_contract import ReleaseError
from subject_registry import ReleaseSubject


_CONTEXT_AUTHORITY = object()


@dataclass(frozen=True, init=False)
class ReleaseContext:
    subject: ReleaseSubject
    candidate: CandidateEnvelope
    payload: ValidatedPayload
    state: Mapping[str, object]
    subject_baseline: Mapping[str, object]
    global_baseline: Mapping[str, object]
    transaction_path: Path

    def __init__(self, *, _authority=None, **fields):
        if _authority is not _CONTEXT_AUTHORITY or set(fields) != set(self.__annotations__):
            raise TypeError("ReleaseContext must be constructed by ReleaseController")
        for name, value in fields.items():
            object.__setattr__(self, name, value)


class ReleaseAdapter(Protocol):
    version: str
    def prepare(self, context: ReleaseContext) -> Mapping[str, object]: ...
    def backup(self, context: ReleaseContext) -> Mapping[str, object]: ...
    def stage(self, context: ReleaseContext) -> Mapping[str, object]: ...
    def activate(self, context: ReleaseContext) -> Mapping[str, object]: ...
    def verify(self, context: ReleaseContext) -> Mapping[str, object]: ...
    def rollback(self, context: ReleaseContext) -> Mapping[str, object]: ...


class SafeFrontendRollback(ReleaseError):
    """A bounded adapter result, never an inference from exception text.

    The controller validates every identity, backup and public-version field
    before accepting this as recovery. It alone writes release state.
    """
    def __init__(self, evidence):
        super().__init__('frontend action reverted and publicly verified')
        self.evidence = evidence


class UninstalledAdapter:
    version = "not-installed"

    def _unavailable(self, context):
        raise ReleaseError("capability-not-installed")

    prepare = backup = stage = activate = verify = rollback = _unavailable
