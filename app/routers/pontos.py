from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.db import get_db
from app.security import get_current_user

router = APIRouter(prefix="/pontos", tags=["pontos"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=schemas.PontoFora, status_code=201)
def criar(dados: schemas.PontoCriar, db: Session = Depends(get_db)):
    return crud.criar_ponto(db, dados)


@router.get("", response_model=list[schemas.PontoFora])
def listar(pessoa_id: int, db: Session = Depends(get_db)):
    return crud.listar_pontos(db, pessoa_id)


@router.post("/{id_}/evoluir", response_model=schemas.PontoFora)
def evoluir(id_: int, db: Session = Depends(get_db)):
    return crud.marcar_ponto_evoluido(db, id_)


@router.delete("/{id_}", status_code=204)
def remover(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.PontoAvaliacao, id_)
    crud.soft_delete(db, obj, "ponto")


@router.post("/{id_}/restaurar", response_model=schemas.PontoFora)
def restaurar(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.PontoAvaliacao, id_)
    crud.restore(db, obj, "ponto")
    return obj
