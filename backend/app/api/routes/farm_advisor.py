from fastapi import APIRouter, Depends
from app.schemas.farm_advisor import FarmAdvisorQueryRequest, FarmAdvisorResponse
from app.services.farm_advisor_service import farm_advisor_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/query", response_model=FarmAdvisorResponse)
def ask_kisanai(request: FarmAdvisorQueryRequest, current_user: User = Depends(get_current_user)):
    return farm_advisor_service.get_advice(request)
