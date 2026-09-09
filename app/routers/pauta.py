from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app import crud
from app.db import get_db
from app.domain.pauta import montar_pauta, pauta_em_markdown
from app.security import get_current_user

router = APIRouter(prefix="/pessoas", tags=["pauta-1a1"], dependencies=[Depends(get_current_user)])


def _montar(db: Session, id_: int):
    pessoa = crud.buscar_pessoa(db, id_)
    pontos = crud.listar_pontos(db, id_)
    anotacoes = crud.listar_anotacoes(db, id_)
    return montar_pauta(pessoa, pontos, anotacoes)


@router.get("/{id_}/pauta")
def obter_pauta(id_: int, db: Session = Depends(get_db)) -> dict:
    """A peça central do projeto: o que mudou desde o último 1:1 registrado com
    esta pessoa, montado sem precisar reler anotação por anotação à mão."""
    pauta = _montar(db, id_)
    return {
        "pessoa": {"id": pauta.pessoa.id, "nome": pauta.pessoa.nome},
        "tempo_de_casa": pauta.tempo_de_casa,
        "marco_atual": {"id": pauta.marco_atual.id, "titulo": pauta.marco_atual.titulo, "secoes": pauta.marco_atual.secoes},
        "proximo_marco": (
            {"id": pauta.proximo_marco.id, "titulo": pauta.proximo_marco.titulo, "secoes": pauta.proximo_marco.secoes}
            if pauta.proximo_marco
            else None
        ),
        "desde": pauta.desde,
        "novidades": [{"em": a.em, "texto": a.texto} for a in pauta.novidades],
        "anteriores": [{"em": a.em, "texto": a.texto} for a in pauta.anteriores],
        "abertos": [{"texto": p.texto, "grau": p.grau} for p in pauta.abertos],
        "evoluidos": [{"texto": p.texto, "grau": p.grau, "resolvido_em": p.resolvido_em} for p in pauta.evoluidos],
        "fortes": [{"texto": p.texto, "grau": p.grau} for p in pauta.fortes],
    }


@router.get("/{id_}/pauta/markdown")
def obter_pauta_markdown(id_: int, db: Session = Depends(get_db)) -> Response:
    """Markdown puro, para colar direto no Bamboo/Teams — não PDF, o destino é
    um campo de texto de outro sistema."""
    pauta = _montar(db, id_)
    return Response(content=pauta_em_markdown(pauta), media_type="text/markdown; charset=utf-8")
