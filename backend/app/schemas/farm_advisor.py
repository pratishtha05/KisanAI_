from pydantic import BaseModel
from typing import List, Optional

class FarmAdvisorQueryRequest(BaseModel):
    query: str
    farm_id: Optional[int] = None
    crop: Optional[str] = None
    location: Optional[str] = None
    soil_type: Optional[str] = None
    crop_stage: Optional[str] = None
    language: Optional[str] = None      # NEW: UI language code ("en", "hi", ...) or name

class FarmAdvisorResponse(BaseModel):
    recommendation: str
    reason: str
    actions: List[str]
    watch_out: Optional[str] = None
    confidence: float
    sources: List[str] = []             # NEW: knowledge-base files the answer was grounded on
    generated_by: str = "mock"          # NEW: "mock" | "local-llm"
