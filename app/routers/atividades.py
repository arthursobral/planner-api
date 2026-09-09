from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.db import get_db
from app.domain.aging import dias_desde, faixa_idade
from app.security import get_current_user

router = APIRouter(prefix="/atividades", tags=["atividades"], dependencies=[Depends(get_current_user)])


def _fora(atividade: models.Atividade) -> schemas.AtividadeFora:
    dias = dias_desde(atividade.criado_em)
    return schemas.AtividadeFora(
        id=atividade.id,
        nome=atividade.nome,
        prioridade=atividade.prioridade,
        descricao=atividade.descricao,
        status=atividade.status,
        criado_em=atividade.criado_em,
        arquivada_em=atividade.arquivada_em,
        dias_parado=dias,
        faixa=faixa_idade(dias),
    )


@router.post("", response_model=schemas.AtividadeFora, status_code=201)
def criar(dados: schemas.AtividadeCriar, db: Session = Depends(get_db)):
    return _fora(crud.criar_atividade(db, dados))


@router.get("", response_model=list[schemas.AtividadeFora])
def listar(correntes: bool = True, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    return [_fora(a) for a in crud.listar_atividades(db, correntes, limit, offset)]


@router.patch("/{id_}/status", response_model=schemas.AtividadeFora)
def mudar_status(id_: int, dados: schemas.AtividadeStatusIn, db: Session = Depends(get_db)):
    return _fora(crud.mudar_status_atividade(db, id_, dados.status))


@router.patch("/{id_}/prioridade", response_model=schemas.AtividadeFora)
def mudar_prioridade(id_: int, dados: schemas.AtividadePrioridadeIn, db: Session = Depends(get_db)):
    return _fora(crud.mudar_prioridade_atividade(db, id_, dados.prioridade))


@router.post("/{id_}/arquivar", response_model=schemas.AtividadeFora)
def arquivar(id_: int, db: Session = Depends(get_db)):
    return _fora(crud.arquivar_atividade(db, id_))


@router.post("/{id_}/reabrir", response_model=schemas.AtividadeFora)
def reabrir(id_: int, db: Session = Depends(get_db)):
    return _fora(crud.reabrir_atividade(db, id_))


@router.delete("/{id_}", status_code=204)
def remover(id_: int, db: Session = Depends(get_db)):
    """Só oferecido a partir do arquivo, mesma regra da inspiração: arquivar é
    passo obrigatório antes de remover."""
    obj = crud.obter_ou_404(db, models.Atividade, id_)
    crud.soft_delete(db, obj, "atividade")


@router.post("/{id_}/restaurar", response_model=schemas.AtividadeFora)
def restaurar(id_: int, db: Session = Depends(get_db)):
    obj = crud.obter_ou_404(db, models.Atividade, id_)
    crud.restore(db, obj, "atividade")
    return _fora(obj)
