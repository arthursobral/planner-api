"""Reindexação: varre as entidades com texto livre e (re)popula `fragmentos`.
Full-rebuild de propósito — o volume de dado pessoal é pequeno (algumas
centenas de linhas), não vale a complexidade de atualização incremental por
enquanto. Reindexar de novo é barato: um `POST /rag/reindexar`.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.rag.chunking import chunk_por_paragrafo
from app.rag.embeddings import embed_documentos

Fonte = tuple[str, int, str]


def _fontes(db: Session) -> list[Fonte]:
    """Uma entrada por chunk a indexar: (entidade, entidade_id, texto)."""
    fontes: list[Fonte] = []

    for a in db.scalars(select(models.Atividade).where(models.Atividade.removido_em.is_(None))):
        texto = f"{a.nome}. {a.descricao or ''}".strip()
        if texto:
            fontes.append(("atividade", a.id, texto))

    for a in db.scalars(select(models.Anotacao).where(models.Anotacao.removido_em.is_(None))):
        if a.texto.strip():
            fontes.append(("anotacao", a.id, a.texto))

    for r in db.scalars(select(models.Reuniao).where(models.Reuniao.removido_em.is_(None))):
        base = f"{r.titulo}\n\n{r.texto}".strip()
        for chunk in chunk_por_paragrafo(base):
            fontes.append(("reuniao", r.id, chunk))

    for ac in db.scalars(select(models.Acompanhamento).where(models.Acompanhamento.removido_em.is_(None))):
        texto = f"{ac.atividade} — {ac.pessoa}. {ac.observacoes or ''}".strip()
        if texto:
            fontes.append(("acompanhamento", ac.id, texto))

    for p in db.scalars(select(models.PontoAvaliacao).where(models.PontoAvaliacao.removido_em.is_(None))):
        if p.texto.strip():
            fontes.append(("ponto", p.id, p.texto))

    return fontes


def reindexar(db: Session) -> int:
    """Apaga e reconstrói `fragmentos` inteira. Retorna quantos fragmentos foram criados."""
    db.query(models.Fragmento).delete()

    fontes = _fontes(db)
    if not fontes:
        db.commit()
        return 0

    embeddings = embed_documentos([texto for _, _, texto in fontes])

    db.add_all(
        models.Fragmento(entidade=entidade, entidade_id=entidade_id, texto=texto, embedding=vetor)
        for (entidade, entidade_id, texto), vetor in zip(fontes, embeddings)
    )
    db.commit()
    return len(fontes)
