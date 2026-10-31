from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.entities import User, InstitutionMembership, Institution
from app.schemas.schemas import UserLogin, Token, UserResponse, UserCreate
from app.api.deps import get_current_user
from app.services.audit.audit_service import record_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated",
        )

    access_token = create_access_token(subject=user.id)

    # Get memberships
    memberships = db.query(InstitutionMembership).filter(InstitutionMembership.user_id == user.id).all()
    institutions_data = []
    for m in memberships:
        inst = db.query(Institution).filter(Institution.id == m.institution_id).first()
        if inst:
            institutions_data.append({
                "id": inst.id,
                "name": inst.name,
                "code": inst.code,
                "role": m.role
            })

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        institutions=institutions_data
    )

    record_audit_event(
        db=db,
        event_type="USER_LOGIN_SUCCESS",
        entity_type="User",
        entity_id=user.id,
        payload={"email": user.email, "role": user.role},
        actor_id=user.id
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(InstitutionMembership).filter(InstitutionMembership.user_id == current_user.id).all()
    institutions_data = []
    for m in memberships:
        inst = db.query(Institution).filter(Institution.id == m.institution_id).first()
        if inst:
            institutions_data.append({
                "id": inst.id,
                "name": inst.name,
                "code": inst.code,
                "role": m.role
            })

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        institutions=institutions_data
    )

