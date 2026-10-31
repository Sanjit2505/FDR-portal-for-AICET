from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import User
from app.services.graph.graph_service import build_relationship_graph

router = APIRouter(prefix="/graph", tags=["Relationship Graph"])

@router.get("")
def get_graph(
    institution_id: Optional[str] = Query(None),
    fdr_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "institution_user" and not institution_id:
        from app.models.entities import InstitutionMembership
        m = db.query(InstitutionMembership).filter(InstitutionMembership.user_id == current_user.id).first()
        if m:
            institution_id = m.institution_id

    return build_relationship_graph(db=db, institution_id=institution_id, fdr_id=fdr_id)

