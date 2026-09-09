from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.db import get_db
from app.security import get_current_user

router = APIRouter(prefix="/acompanhamentos", tags=["acompanhamentos"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=schemas.AcompanhamentoFora, status_code=201)
def criar(dados: schemas.AcompanhamentoCriar, db: Session = Depends(get_db)):
    return crud.criar_acompanhamento(db, dados)


@router.get("", response_model=list[schemas.AcompanhamentoFora])
def listar(db: Session = Depends(get_db)):
    return crud.listar_acompanhamentos(db)


@router.patch("/{id_}/status", response_model=schemas.AcompanhamentoFora)
def mudar_status(id_: int, dados: schemas.AcompanhamentoStatusIn, db: Session = Depends(get_db)):
    return crud.mudar_status_acompanhamento(db, id_, dados.status)


@router.delete("/{id_}", status_code=204)
def remover(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.Acompanhamento, id_)
    crud.soft_delete(db, obj, "acompanhamento")


@router.post("/{id_}/restaurar", response_model=schemas.AcompanhamentoFora)
def restaurar(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.Acompanhamento, id_)
    crud.restore(db, obj, "acompanhamento")
    return obj


@router.delete("/pessoa/{pessoa}", response_model=list[int])
def remover_da_pessoa(pessoa: str, db: Session = Depends(get_db)):
    """Remoção em lote de tudo que está agrupado sob um nome (texto livre) —
    espelha o botão de remover-tudo-de-uma-pessoa da inspiração, com undo
    combinado (os ids voltam para o cliente restaurar em lote, se quiser)."""
    return crud.remover_acompanhamentos_da_pessoa(db, pessoa)
