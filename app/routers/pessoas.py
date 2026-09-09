from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.db import get_db
from app.security import get_current_user

router = APIRouter(prefix="/pessoas", tags=["pessoas"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=schemas.PessoaFora, status_code=201)
def criar(dados: schemas.PessoaCriar, db: Session = Depends(get_db)):
    return crud.criar_pessoa(db, dados)


@router.get("", response_model=list[schemas.PessoaFora])
def listar(db: Session = Depends(get_db)):
    return crud.listar_pessoas(db)


@router.post("/{id_}/1a1", response_model=schemas.PessoaFora)
def registrar_1a1(id_: int, db: Session = Depends(get_db)):
    return crud.registrar_1a1(db, id_)
