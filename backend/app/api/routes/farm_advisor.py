import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.chat_history import ChatHistoryOut
from app.schemas.farm_advisor import FarmAdvisorQueryRequest, FarmAdvisorResponse
from app.services import chat_history
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
    chat_history.save_message(db, current_user.id, "user", {"text": request.query})
    try:
        response = farm_advisor_service.get_advice(request, ctx)
    except AdvisorUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    chat_history.save_message(db, current_user.id, "assistant", response.model_dump())
    return response


@router.post("/stream")
def stream_kisanai(
    request: FarmAdvisorQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Server-Sent Events. Events: status {state}, token {text}, result {...FarmAdvisorResponse}, error {message}."""
    ctx = build_context(db, current_user, request)  # read DB now; the stream outlives the session
    user_id = current_user.id
    chat_history.save_message(db, user_id, "user", {"text": request.query})  # saved before answering, like a sent WhatsApp message

    def events():
        try:
            for ev in farm_advisor_service.stream_advice(request, ctx):
                kind = ev["type"]
                if kind == "token":
                    yield _sse("token", {"text": ev["text"]})
                elif kind == "status":
                    yield _sse("status", {"state": ev["state"]})
                elif kind == "result":
                    chat_history.save_message_new_session(user_id, "assistant", ev["data"])
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


# ---------------------------------------------------------------- chat history
@router.get("/history", response_model=ChatHistoryOut)
def get_history(
    limit: int = Query(50, ge=1, le=200),
    before_id: Optional[int] = Query(None, description="Load messages older than this id (scroll up)."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The signed-in farmer's saved chat, oldest -> newest. Decrypted on the fly."""
    try:
        return chat_history.list_history(db, current_user.id, limit, before_id)
    except Exception as e:  # e.g. CHAT_ENCRYPTION_KEY missing
        log.exception("Could not load chat history")
        raise HTTPException(status_code=503, detail="Chat history is not available right now.") from e


@router.delete("/history")
def clear_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete the signed-in farmer's whole chat."""
    return {"deleted": chat_history.clear_history(db, current_user.id)}


@router.delete("/history/{message_id}")
def delete_history_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not chat_history.delete_message(db, current_user.id, message_id):
        raise HTTPException(status_code=404, detail="Message not found.")
    return {"deleted": 1}
