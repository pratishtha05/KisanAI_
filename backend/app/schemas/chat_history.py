from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ChatMessageOut(BaseModel):
    id: int
    role: str                              # "user" | "assistant"
    created_at: datetime
    text: Optional[str] = None             # set for role == "user"
    advice: Optional[dict] = None          # set for role == "assistant": recommendation, reason, actions, watch_out, confidence, sources
    unreadable: bool = False               # True if the message could not be decrypted


class ChatHistoryOut(BaseModel):
    messages: List[ChatMessageOut]         # oldest -> newest, ready to render top to bottom
    has_more: bool                         # more (older) messages exist
    next_before_id: Optional[int] = None   # pass as ?before_id= to load the next older page
