
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.farm import Farm
from app.models.user import User

from app.modules.fertilizer.schemas import FertilizerRequest
from app.modules.fertilizer.service import get_fertilizer_recommendation

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{farm_id}")
async def get_fertilizer(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate fertilizer and plant-protection guidance from saved farm data."""

    farm = (
        db.query(Farm)
        .filter(
            Farm.id == farm_id,
            Farm.user_id == current_user.id,
        )
        .first()
    )

    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")

    try:
        request = FertilizerRequest()

        return await get_fertilizer_recommendation(
            farm=farm,
            request=request,
        )

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception:
        logger.exception(
            "Fertilizer recommendation failed for farm %s",
            farm_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to generate fertilizer recommendation.",
        )


@router.post("/{farm_id}/evaluate")
async def evaluate_fertilizer(
    farm_id: int,
    request: FertilizerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Evaluate fertilizer requirements using additional farmer/soil-test data."""

    farm = (
        db.query(Farm)
        .filter(
            Farm.id == farm_id,
            Farm.user_id == current_user.id,
        )
        .first()
    )

    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")

    try:
        return await get_fertilizer_recommendation(
            farm=farm,
            request=request,
        )

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception:
        logger.exception(
            "Fertilizer evaluation failed for farm %s",
            farm_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to evaluate fertilizer requirements.",
        )
