import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.farm_advisor import FarmAdvisorQueryRequest, FarmAdvisorResponse
from app.services.advisor_context import AdvisorUnavailable, build_context
from app.services.farm_advisor_service import farm_advisor_service

log = logging.getLogger("kisanai.advisor")
router = APIRouter()


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/query", response_model=FarmAdvisorResponse)
def ask_kisanai(
    request: FarmAdvisorQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Non-streaming: waits for the full answer. Kept for backwards compatibility."""
    ctx = build_context(db, current_user, request)
    try:
        return farm_advisor_service.get_advice(request, ctx)
    except AdvisorUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/stream")
def stream_kisanai(
    request: FarmAdvisorQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Server-Sent Events. Events: status {state}, token {text}, result {...FarmAdvisorResponse}, error {message}."""
    ctx = build_context(db, current_user, request)  # read DB now; the stream outlives the session

    def events():
        try:
            for ev in farm_advisor_service.stream_advice(request, ctx):
                kind = ev["type"]
                if kind == "token":
                    yield _sse("token", {"text": ev["text"]})
                elif kind == "status":
                    yield _sse("status", {"state": ev["state"]})
                elif kind == "result":
                    yield _sse("result", ev["data"])
        except AdvisorUnavailable as e:
            yield _sse("error", {"message": str(e)})
        except Exception:
            log.exception("Farm advisor stream failed")
            yield _sse("error", {"message": "Something went wrong while preparing your advice. Please try again."})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.get("/status")
def advisor_status(current_user: User = Depends(get_current_user)):
    """{"mode": "mock"|"local", "state": "idle"|"loading"|"ready"|"error", "error": str|null}"""
    return farm_advisor_service.status()
