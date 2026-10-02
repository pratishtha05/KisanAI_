from typing import List, Optional

from pydantic import BaseModel, Field

class KnowledgeSource(BaseModel):
    organization: str
    title: str
    source_type: str
    url: str

class DiseasePrediction(BaseModel):
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    class_index: int = Field(ge=0)

class DiseaseAnalysisResponse(BaseModel):
    status: str
    crop: str
    predicted_crop: str | None = None
    predicted_disease: str | None = None
    confidence: float

    message: str

    description: str | None = None
    symptoms: list[str] = Field(default_factory=list)
    causes: list[str] = Field(default_factory=list)
    favourable_conditions: list[str] = Field(default_factory=list)
    prevention: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)

    source: KnowledgeSource | None = None

    top_predictions: list[DiseasePrediction] = Field(
        default_factory=list
    )

    model_name: str
    model_version: str





