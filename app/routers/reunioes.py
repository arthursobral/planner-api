from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.db import get_db
from app.domain.todos_parser import parse_todos
from app.security import get_current_user

router = APIRouter(prefix="/reunioes", tags=["reunioes"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=schemas.ReuniaoFora, status_code=201)
def criar(dados: schemas.ReuniaoCriar, db: Session = Depends(get_db)):
    return crud.criar_reuniao(db, dados)


@router.get("", response_model=list[schemas.ReuniaoFora])
def listar(db: Session = Depends(get_db)):
    return crud.listar_reunioes(db)


@router.patch("/{id_}", response_model=schemas.ReuniaoFora)
def salvar(id_: int, dados: schemas.ReuniaoAtualizar, db: Session = Depends(get_db)):
    """Autosave: o cliente chama isto ~900ms depois que o usuário para de
    digitar. Não gera evento de propósito (ver crud.salvar_reuniao)."""
    return crud.salvar_reuniao(db, id_, dados)


@router.delete("/{id_}", status_code=204)
def remover(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.Reuniao, id_)
    crud.soft_delete(db, obj, "reuniao")


@router.post("/{id_}/restaurar", response_model=schemas.ReuniaoFora)
def restaurar(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.Reuniao, id_)
    crud.restore(db, obj, "reuniao")
    return obj


@router.post("/{id_}/enviar-tarefas", response_model=list[schemas.TodoFora])
def enviar_tarefas(id_: int, dados: schemas.ReuniaoEnviarTarefas, db: Session = Depends(get_db)):
    """Só linhas marcadas (`*`, `-`, checkbox) por padrão — sem isso, toda linha de
    narrativa da call viraria tarefa."""
    reuniao = crud.buscar_reuniao(db, id_)
    itens = parse_todos(reuniao.texto, somente_marcados=dados.somente_marcados)
    todos = [models.Todo(texto=i.texto, concluido=i.concluido, status=i.status, nivel=i.nivel) for i in itens]
    db.add_all(todos)
    db.commit()
    for t in todos:
        db.refresh(t)
    return todos
