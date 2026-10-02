from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.disease_detection import DiseaseAnalysisResponse
from app.services.disease_detection_config import DISEASE_MAX_UPLOAD_BYTES
from app.services.disease_detection_service import (
    DiseaseModelError,
    disease_detection_service,
)

router = APIRouter()


@router.post("/analyze", response_model=DiseaseAnalysisResponse)
async def analyze_crop(
    crop: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not crop or not crop.strip():
        raise HTTPException(
            status_code=400,
            detail="Crop selection is required.",
        )

    content = await file.read(DISEASE_MAX_UPLOAD_BYTES + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    if len(content) > DISEASE_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image is too large. Please upload an image smaller than 10 MB.",
        )

    try:
        return disease_detection_service.analyze_image(
            file_bytes=content,
            selected_crop=crop,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except DiseaseModelError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
