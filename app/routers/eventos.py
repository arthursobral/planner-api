from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.db import get_db
from app.security import get_current_user

router = APIRouter(prefix="/eventos", tags=["eventos"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.EventoFora])
def listar(entidade: str | None = None, entidade_id: int | None = None, db: Session = Depends(get_db)):
    """Histórico de auditoria — o que sustenta idade de ticket e diffs de status."""
    return crud.listar_eventos(db, entidade, entidade_id)
