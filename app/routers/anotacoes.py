from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.db import get_db
from app.security import get_current_user

router = APIRouter(prefix="/anotacoes", tags=["anotacoes"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=schemas.AnotacaoFora, status_code=201)
def criar(dados: schemas.AnotacaoCriar, db: Session = Depends(get_db)):
    return crud.criar_anotacao(db, dados)


@router.get("", response_model=list[schemas.AnotacaoFora])
def listar(pessoa_id: int, db: Session = Depends(get_db)):
    return crud.listar_anotacoes(db, pessoa_id)


@router.delete("/{id_}", status_code=204)
def remover(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.Anotacao, id_)
    crud.soft_delete(db, obj, "anotacao")


@router.post("/{id_}/restaurar", response_model=schemas.AnotacaoFora)
def restaurar(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.Anotacao, id_)
    crud.restore(db, obj, "anotacao")
    return obj
