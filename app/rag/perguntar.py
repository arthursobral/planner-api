"""Orquestra a pergunta: embed -> busca por distância de cosseno no pgvector ->
monta prompt citando a fonte -> gera resposta via Ollama. Nada aqui é uma
função "pura" no sentido do domínio de negócio (fala com banco e com o
Ollama), então não tenta ser testada sem os dois — é o smoke test manual de
`scripts/avaliar_rag.py`.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.rag.embeddings import embed_consulta
from app.rag.ollama_client import gerar

TOP_K = 5

_PROMPT = """Responda a pergunta usando SOMENTE os trechos abaixo, retirados dos \
próprios registros do usuário. Se a resposta não estiver nos trechos, diga que não \
encontrou essa informação — não invente. Responda em português, direto.

Trechos:
{trechos}

Pergunta: {pergunta}
"""


@dataclass
class Fonte:
    entidade: str
    entidade_id: int
    texto: str


@dataclass
class Resposta:
    resposta: str
    fontes: list[Fonte]


def buscar_fragmentos(db: Session, pergunta: str, top_k: int = TOP_K) -> list[models.Fragmento]:
    vetor = embed_consulta(pergunta)
    stmt = select(models.Fragmento).order_by(models.Fragmento.embedding.cosine_distance(vetor)).limit(top_k)
    return list(db.scalars(stmt))


def perguntar(db: Session, pergunta: str) -> Resposta:
    fragmentos = buscar_fragmentos(db, pergunta)
    if not fragmentos:
        return Resposta(resposta="Nada indexado ainda — rode POST /rag/reindexar primeiro.", fontes=[])

    trechos = "\n\n".join(f"[{f.entidade} #{f.entidade_id}] {f.texto}" for f in fragmentos)
    resposta = gerar(_PROMPT.format(trechos=trechos, pergunta=pergunta))

    return Resposta(
        resposta=resposta,
        fontes=[Fonte(entidade=f.entidade, entidade_id=f.entidade_id, texto=f.texto) for f in fragmentos],
    )
