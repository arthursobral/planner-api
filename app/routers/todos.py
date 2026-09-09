from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.db import get_db
from app.security import get_current_user

router = APIRouter(prefix="/todos", tags=["todos"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=list[schemas.TodoFora], status_code=201)
def criar(dados: schemas.TodoCriarLista, db: Session = Depends(get_db)):
    """Corpo é texto colado (lista com marcadores), não um item já estruturado —
    mesma UX da lista de tarefas na inspiração: você cola, o parser separa."""
    return crud.criar_todos_de_texto(db, dados.texto, dados.somente_marcados)


@router.get("", response_model=list[schemas.TodoFora])
def listar(db: Session = Depends(get_db)):
    return crud.listar_todos(db)


@router.patch("/{id_}/status", response_model=schemas.TodoFora)
def mudar_status(id_: int, dados: schemas.TodoStatusIn, db: Session = Depends(get_db)):
    return crud.mudar_status_todo(db, id_, dados.status)


@router.post("/{id_}/alternar", response_model=schemas.TodoFora)
def alternar(id_: int, db: Session = Depends(get_db)):
    return crud.alternar_todo(db, id_)


@router.delete("/{id_}", status_code=204)
def remover(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.Todo, id_)
    crud.soft_delete(db, obj, "todo")


@router.post("/{id_}/restaurar", response_model=schemas.TodoFora)
def restaurar(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.Todo, id_)
    crud.restore(db, obj, "todo")
    return obj
