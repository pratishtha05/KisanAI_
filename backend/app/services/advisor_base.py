from __future__ import annotations

from typing import Iterator, Optional

from app.schemas.farm_advisor import FarmAdvisorQueryRequest, FarmAdvisorResponse
from app.services.advisor_context import AdvisorContext


class FarmAdvisorService:
    def get_advice(self, request: FarmAdvisorQueryRequest, ctx: Optional[AdvisorContext] = None) -> FarmAdvisorResponse:
        raise NotImplementedError

    def stream_advice(self, request: FarmAdvisorQueryRequest, ctx: Optional[AdvisorContext] = None) -> Iterator[dict]:
        """Yield events: {"type": "status"|"token"|"result", ...}.
        Default (non-streaming services): one `result` event."""
        yield {"type": "result", "data": self.get_advice(request, ctx).model_dump()}

    def warmup(self) -> None:
        """Called once at server start. Override to preload heavy resources."""

    def status(self) -> dict:
        return {"mode": "mock", "state": "ready", "error": None}
