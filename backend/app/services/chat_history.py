from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.core.crypto import ChatCryptoError, decrypt_text, encrypt_text
from app.db.session import SessionLocal
from app.models.chat_message import ChatMessage
from app.schemas.chat_history import ChatHistoryOut, ChatMessageOut

log = logging.getLogger("kisanai.history")


def save_message(db: Session, user_id: int, role: str, payload: dict) -> Optional[int]:
    """Encrypt and store one message. Never raises: a storage problem must not
    break the farmer's answer. Returns the new row id, or None on failure."""
    try:
        token = encrypt_text(user_id, role, json.dumps(payload, ensure_ascii=False))
        row = ChatMessage(user_id=user_id, role=role, content_enc=token)
        db.add(row)
        db.commit()
        return row.id
    except Exception:  # noqa: BLE001
        db.rollback()
        log.exception("Could not save chat message (user_id=%s, role=%s)", user_id, role)
        return None


def save_message_new_session(user_id: int, role: str, payload: dict) -> Optional[int]:
    """For streaming: the request's DB session may already be closed when the
    answer finishes, so use a short-lived session of our own."""
    db = SessionLocal()
    try:
        return save_message(db, user_id, role, payload)
    finally:
        db.close()


def _to_out(row: ChatMessage) -> ChatMessageOut:
    try:
        data = json.loads(decrypt_text(row.user_id, row.role, row.content_enc))
    except (ChatCryptoError, ValueError):
        log.warning("Message %s could not be decrypted", row.id)
        return ChatMessageOut(id=row.id, role=row.role, created_at=row.created_at, unreadable=True)
    if row.role == "user":
        return ChatMessageOut(id=row.id, role="user", created_at=row.created_at, text=data.get("text", ""))
    return ChatMessageOut(id=row.id, role="assistant", created_at=row.created_at, advice=data)


def list_history(db: Session, user_id: int, limit: int = 50, before_id: Optional[int] = None) -> ChatHistoryOut:
    """Newest `limit` messages (older than before_id if given), returned oldest-first."""
    q = db.query(ChatMessage).filter(ChatMessage.user_id == user_id)
    if before_id is not None:
        q = q.filter(ChatMessage.id < before_id)
    rows = q.order_by(ChatMessage.id.desc()).limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit][::-1]
    return ChatHistoryOut(
        messages=[_to_out(r) for r in rows],
        has_more=has_more,
        next_before_id=rows[0].id if has_more and rows else None,
    )


def clear_history(db: Session, user_id: int) -> int:
    n = db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete(synchronize_session=False)
    db.commit()
    return n


def delete_message(db: Session, user_id: int, message_id: int) -> bool:
    n = (db.query(ChatMessage)
           .filter(ChatMessage.user_id == user_id, ChatMessage.id == message_id)
           .delete(synchronize_session=False))
    db.commit()
    return n > 0
