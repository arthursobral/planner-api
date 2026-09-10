"""Busca por similaridade no pgvector — a peça de retrieval da Fase 2, hoje
reaproveitada como a ferramenta "buscar_nos_registros" do agente (Fase 2, ver
app/rag/agente.py e app/rag/ferramentas.py). A orquestração (montar prompt,
decidir ferramenta, gerar resposta) mudou de lugar; buscar continua aqui.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.rag.embeddings import embed_consulta

TOP_K = 5


@dataclass
class Fonte:
    entidade: str
    entidade_id: int
    texto: str


def buscar_fragmentos(db: Session, pergunta: str, top_k: int = TOP_K) -> list[models.Fragmento]:
    vetor = embed_consulta(pergunta)
    stmt = select(models.Fragmento).order_by(models.Fragmento.embedding.cosine_distance(vetor)).limit(top_k)
    return list(db.scalars(stmt))
