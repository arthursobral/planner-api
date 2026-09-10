from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.db import get_db
from app.rag.indexar import reindexar
from app.rag.perguntar import perguntar
from app.security import get_current_user

router = APIRouter(prefix="/rag", tags=["rag"], dependencies=[Depends(get_current_user)])


@router.post("/reindexar", response_model=schemas.ReindexarFora)
def reindexar_endpoint(db: Session = Depends(get_db)):
    """Full-rebuild de `fragmentos` a partir dos dados atuais. Chamada manual —
    ver app/rag/indexar.py para o porquê de não reindexar em toda escrita."""
    return schemas.ReindexarFora(fragmentos=reindexar(db))


@router.post("/perguntar", response_model=schemas.RespostaRag)
def perguntar_endpoint(dados: schemas.PerguntaRag, db: Session = Depends(get_db)):
    resultado = perguntar(db, dados.pergunta)
    return schemas.RespostaRag(
        resposta=resultado.resposta,
        fontes=[
            schemas.FonteRag(entidade=f.entidade, entidade_id=f.entidade_id, texto=f.texto)
            for f in resultado.fontes
        ],
    )
