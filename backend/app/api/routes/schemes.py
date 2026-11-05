from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.crypto import ChatCryptoError
from app.db.session import get_db
from app.models.user import User
from app.modules.schemes import service
from app.modules.schemes.profile_store import SchemeAnswers, delete_answers, load_answers, save_answers
from app.modules.schemes.schemas import (AnswersOut, RecommendationsOut, SchemeDetail, SchemeSummary, SearchOut)

router = APIRouter()

# NOTE: static paths (/recommendations, /search, /me/...) are declared BEFORE /{scheme_id}.


@router.get("/recommendations", response_model=RecommendationsOut)
def get_recommendations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Scans the farmer's profile, farms and eligibility answers and returns a ranked analysis:
    what to apply for now, what needs more information, and why other schemes do not fit."""
    facts, problem = service.load_facts(db, current_user)
    return service.recommendations(facts, problem)


@router.get("/search", response_model=SearchOut)
def search_schemes(q: str = Query(..., min_length=1, max_length=100),
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Find a scheme by name, alias (also Hindi), or topic ('insurance', 'loan', 'solar pump').
    Every result already includes the farmer's personal eligibility verdict."""
    facts, _ = service.load_facts(db, current_user)
    return {"query": q, "results": service.search(facts, q)}


@router.get("/", response_model=List[SchemeSummary])
def list_schemes(category: Optional[str] = None, include_other_states: bool = False,
                 db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    facts, _ = service.load_facts(db, current_user)
    return service.catalog(facts, category, include_other_states)


@router.get("/me/answers", response_model=AnswersOut)
def get_answers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    answers, problem = load_answers(db, current_user.id)
    return {"answers": answers, **service.questions_payload(), "encryption_available": service.crypto_ready(),
            "problem": problem, "completeness": service.completeness_of(answers)}


@router.put("/me/answers", response_model=AnswersOut)
def put_answers(body: SchemeAnswers, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Replace the stored answers. Everything is optional; leaving a question out means 'not answered'."""
    try:
        saved = save_answers(db, current_user.id, body)
    except ChatCryptoError:
        raise HTTPException(status_code=503, detail={
            "message": "Saving is switched off because server encryption is not configured.", "state": "no_encryption"})
    return {"answers": saved, **service.questions_payload(), "encryption_available": True,
            "problem": None, "completeness": service.completeness_of(saved)}


@router.delete("/me/answers")
def clear_answers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Erase everything the farmer told us for scheme matching."""
    return {"deleted": delete_answers(db, current_user.id)}


@router.get("/{scheme_id}", response_model=SchemeDetail)
def get_scheme_detail(scheme_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    facts, _ = service.load_facts(db, current_user)
    payload = service.detail(facts, scheme_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return payload
