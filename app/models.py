"""Modelos ORM. Domínio inspirado em Planner-v2 (ver o plano da Fase 1 para a
tabela de origem de cada campo/regra).

Diferença deliberada da fonte: lá os ids de Atividade/Acompanhamento/Todo eram
`Date.now()` (sem servidor, sem sequence) e o de PontoAvaliacao era uma string
composta `pessoa:tipo:texto` (sem id real, o texto era a identidade). Aqui é
tudo `SERIAL`/identity do Postgres — é o banco resolvendo unicidade em vez de um
truque de aplicação, e a identidade de PontoAvaliacao vira uma UNIQUE constraint
em vez de compor a chave primária.
"""

from __future__ import annotations

import datetime as dt

from sqlalchemy import Date, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _agora() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class Pessoa(Base):
    __tablename__ = "pessoas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str]
    data_admissao: Mapped[dt.date] = mapped_column(Date)
    ultimo_1a1: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class Atividade(Base):
    """Ticket de trabalho. `arquivada_em` (saiu da lista corrente) é distinto de
    `removido_em` (apagado de propósito) — arquivar é passo obrigatório antes de
    poder remover, espelhando a regra da fonte."""

    __tablename__ = "atividades"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str]
    prioridade: Mapped[str]
    descricao: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[str] = mapped_column(default="Pendente")
    criado_em: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_agora)
    arquivada_em: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    removido_em: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(primary_key=True)
    texto: Mapped[str] = mapped_column(Text)
    concluido: Mapped[bool] = mapped_column(default=False)
    status: Mapped[str] = mapped_column(default="todo")
    nivel: Mapped[int] = mapped_column(default=0)
    criado_em: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_agora)
    removido_em: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class Acompanhamento(Base):
    """`pessoa` é texto livre de propósito: os dados reais da fonte citam gente
    de fora da equipe (a régua de 5 pessoas governa avaliação, não isto).
    `pessoa_id_equipe`/`atividade_id` são resolvidos por match de nome quando
    possível, nunca exigidos."""

    __tablename__ = "acompanhamentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    atividade: Mapped[str]
    atividade_id: Mapped[int | None] = mapped_column(ForeignKey("atividades.id"), default=None)
    pessoa: Mapped[str]
    pessoa_id_equipe: Mapped[int | None] = mapped_column(ForeignKey("pessoas.id"), default=None)
    status: Mapped[str] = mapped_column(default="Em Andamento")
    observacoes: Mapped[str | None] = mapped_column(Text, default=None)
    criado_em: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_agora)
    removido_em: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class Anotacao(Base):
    """Diário por pessoa. `em` é a data do fato, editável e separada de
    `criado_em` — quase sempre se registra depois da conversa."""

    __tablename__ = "anotacoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    pessoa_id: Mapped[int] = mapped_column(ForeignKey("pessoas.id"))
    texto: Mapped[str] = mapped_column(Text)
    em: Mapped[dt.date] = mapped_column(Date)
    criado_em: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_agora)
    removido_em: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class PontoAvaliacao(Base):
    """Identidade = (pessoa, tipo, texto): recriar o mesmo texto reativa um ponto
    arquivado/removido em vez de duplicar (ver crud.criar_ponto).
    `arquivado_em` = o sistema deduziu que saiu da última avaliação corrente;
    `removido_em` = o usuário apagou de propósito. São conceitos diferentes."""

    __tablename__ = "pontos"
    __table_args__ = (UniqueConstraint("pessoa_id", "tipo", "texto", name="uq_ponto_identidade"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    pessoa_id: Mapped[int] = mapped_column(ForeignKey("pessoas.id"))
    tipo: Mapped[str]
    texto: Mapped[str] = mapped_column(Text)
    grau: Mapped[str]
    criado_em: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_agora)
    resolvido_em: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    arquivado_em: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    removido_em: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class Reuniao(Base):
    """Nota de call/reunião — rascunho ao vivo, distinto do diário (Anotacao).
    Atualizado via autosave; ver crud.salvar_reuniao, que de propósito não grava
    evento (dezenas de PATCH por minuto afogariam o histórico)."""

    __tablename__ = "reunioes"

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str]
    em: Mapped[dt.date] = mapped_column(Date)
    texto: Mapped[str] = mapped_column(Text, default="")
    criado_em: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_agora)
    atualizado_em: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_agora, onupdate=_agora)
    removido_em: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class Evento(Base):
    """Log de auditoria. Toda mutação grava um evento aqui, exceto o autosave de
    Reuniao — é o que sustenta idade de ticket, tempo de ciclo e histórico."""

    __tablename__ = "eventos"

    id: Mapped[int] = mapped_column(primary_key=True)
    entidade: Mapped[str]
    entidade_id: Mapped[str]
    campo: Mapped[str]
    de: Mapped[str | None] = mapped_column(Text, default=None)
    para: Mapped[str | None] = mapped_column(Text, default=None)
    em: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_agora)
    origem: Mapped[str] = mapped_column(default="app")
