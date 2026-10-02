from fastapi import APIRouter, Depends, UploadFile, File
from app.schemas.disease_detection import DiseaseAnalysisResponse
from app.services.disease_detection_service import disease_detection_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/analyze", response_model=DiseaseAnalysisResponse)
async def analyze_crop(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    content = await file.read()
    return disease_detection_service.analyze_image(content)
