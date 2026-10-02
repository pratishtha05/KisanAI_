from pydantic import BaseModel
from typing import List, Optional

class FarmAdvisorQueryRequest(BaseModel):
    query: str
    farm_id: Optional[int] = None
    crop: Optional[str] = None
    location: Optional[str] = None
    soil_type: Optional[str] = None
    crop_stage: Optional[str] = None

class FarmAdvisorResponse(BaseModel):
    recommendation: str
    reason: str
    actions: List[str]
    watch_out: Optional[str] = None
    confidence: float
