from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text

from app.db.database import Base


class ChatMessage(Base):
    """One chat bubble. The content is AES-256-GCM encrypted (see app/core/crypto.py);
    only the id, owner, role and time are readable in the database."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(10), nullable=False)          # "user" | "assistant"
    content_enc = Column(Text, nullable=False)         # base64(version|nonce|ciphertext|tag)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (Index("ix_chat_messages_user_id_id", "user_id", "id"),)
