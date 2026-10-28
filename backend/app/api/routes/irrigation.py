from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.farm import Farm
from app.models.user import User
from app.modules.irrigation.service import get_irrigation_recommendation


router = APIRouter()


@router.get("/{farm_id}")
async def get_irrigation(
    farm_id: int,
    soil_feedback: Optional[str] = Query(
        default=None,
        description="Farmer observation: too dry, normal, or too wet",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    farm = (
        db.query(Farm)
        .filter(
            Farm.id == farm_id,
            Farm.user_id == current_user.id,
        )
        .first()
    )

    if not farm:
        raise HTTPException(
            status_code=404,
            detail="Farm not found",
        )

    # Validate farmer's soil observation
    if soil_feedback:
        soil_feedback = soil_feedback.lower().strip()

        allowed_feedback = {
            "too dry",
            "normal",
            "too wet",
        }

        if soil_feedback not in allowed_feedback:
            raise HTTPException(
                status_code=400,
                detail=(
                    "soil_feedback must be one of: "
                    "too dry, normal, too wet"
                ),
            )

    try:
        return await get_irrigation_recommendation(
            farm=farm,
            soil_feedback=soil_feedback,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        print(
            f"Irrigation recommendation error for farm {farm_id}: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to generate irrigation recommendation.",
        )


@router.post("/{farm_id}/log")
def log_irrigation(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    farm = (
        db.query(Farm)
        .filter(
            Farm.id == farm_id,
            Farm.user_id == current_user.id,
        )
        .first()
    )

    if not farm:
        raise HTTPException(
            status_code=404,
            detail="Farm not found",
        )

    farm.last_irrigation_date = date.today()

    db.commit()
    db.refresh(farm)

    return {
        "success": True,
        "farm_id": farm.id,
        "last_irrigation_date": farm.last_irrigation_date.isoformat(),
        "message": "Irrigation recorded successfully.",
    }