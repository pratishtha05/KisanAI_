from pydantic import BaseModel
from typing import List, Optional

class DiseaseAnalysisResponse(BaseModel):
    possible_issue: str
    confidence: float
    severity: str
    what_we_found: str
    what_you_can_do: List[str]
