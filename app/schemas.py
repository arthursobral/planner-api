"""Schemas Pydantic (request/response) por entidade. Nomes de campo em
português, iguais aos do ORM, para bater com o domínio original."""

from __future__ import annotations

import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator

from app.domain import constants

_ORM = ConfigDict(from_attributes=True)


# --- Auth ---------------------------------------------------------------


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Pessoa ---------------------------------------------------------------


class PessoaCriar(BaseModel):
    nome: str
    data_admissao: dt.date


class PessoaFora(BaseModel):
    model_config = _ORM
    id: int
    nome: str
    data_admissao: dt.date
    ultimo_1a1: dt.datetime | None


# --- Atividade ---------------------------------------------------------------


class AtividadeCriar(BaseModel):
    nome: str
    prioridade: Literal[*constants.PRIORIDADES]
    descricao: str | None = None


class AtividadeStatusIn(BaseModel):
    status: Literal[*constants.STATUS_ATIVIDADE]


class AtividadePrioridadeIn(BaseModel):
    prioridade: Literal[*constants.PRIORIDADES]


class AtividadeFora(BaseModel):
    model_config = _ORM
    id: int
    nome: str
    prioridade: str
    descricao: str | None
    status: str
    criado_em: dt.datetime
    arquivada_em: dt.datetime | None
    dias_parado: int
    faixa: str


# --- Todo ---------------------------------------------------------------


class TodoCriarLista(BaseModel):
    """Corpo colado (lista com marcadores) — mesma UX de `parseTodos` na fonte."""

    texto: str
    somente_marcados: bool = False


class TodoStatusIn(BaseModel):
    status: Literal[*constants.STATUS_TODO]


class TodoFora(BaseModel):
    model_config = _ORM
    id: int
    texto: str
    concluido: bool
    status: str
    nivel: int
    criado_em: dt.datetime


# --- Acompanhamento ---------------------------------------------------------------


class AcompanhamentoCriar(BaseModel):
    atividade: str
    pessoa: str
    observacoes: str | None = None


class AcompanhamentoStatusIn(BaseModel):
    status: Literal[*constants.STATUS_ACOMPANHAMENTO]


class AcompanhamentoFora(BaseModel):
    model_config = _ORM
    id: int
    atividade: str
    atividade_id: int | None
    pessoa: str
    pessoa_id_equipe: int | None
    status: str
    observacoes: str | None
    criado_em: dt.datetime


# --- Anotacao (diário) ---------------------------------------------------------------


class AnotacaoCriar(BaseModel):
    pessoa_id: int
    texto: str
    em: dt.date


class AnotacaoFora(BaseModel):
    model_config = _ORM
    id: int
    pessoa_id: int
    texto: str
    em: dt.date
    criado_em: dt.datetime


# --- PontoAvaliacao ---------------------------------------------------------------


class PontoCriar(BaseModel):
    pessoa_id: int
    tipo: Literal[*constants.TIPO_PONTO]
    texto: str
    grau: Literal[*constants.GRAU_POSITIVO, *constants.GRAU_NEGATIVO]

    @model_validator(mode="after")
    def grau_compativel_com_tipo(self) -> PontoCriar:
        graus_validos = constants.GRAU_POSITIVO if self.tipo == "positivo" else constants.GRAU_NEGATIVO
        if self.grau not in graus_validos:
            raise ValueError(f"grau '{self.grau}' não é válido para tipo '{self.tipo}'")
        if self.tipo == "negativo" and self.grau == "Evoluido":
            raise ValueError("'Evoluido' só é definido via POST /pontos/{id}/evoluir, não na criação")
        return self


class PontoFora(BaseModel):
    model_config = _ORM
    id: int
    pessoa_id: int
    tipo: str
    texto: str
    grau: str
    criado_em: dt.datetime
    resolvido_em: dt.datetime | None


# --- Reuniao (call notes) ---------------------------------------------------------------


class ReuniaoCriar(BaseModel):
    titulo: str
    em: dt.date


class ReuniaoAtualizar(BaseModel):
    titulo: str | None = None
    em: dt.date | None = None
    texto: str | None = None


class ReuniaoFora(BaseModel):
    model_config = _ORM
    id: int
    titulo: str
    em: dt.date
    texto: str
    criado_em: dt.datetime
    atualizado_em: dt.datetime


class ReuniaoEnviarTarefas(BaseModel):
    somente_marcados: bool = True


# --- Evento ---------------------------------------------------------------


class EventoFora(BaseModel):
    model_config = _ORM
    id: int
    entidade: str
    entidade_id: str
    campo: str
    de: str | None
    para: str | None
    em: dt.datetime
    origem: str


# --- RAG ---------------------------------------------------------------


class PerguntaRag(BaseModel):
    pergunta: str


class FonteRag(BaseModel):
    entidade: str
    entidade_id: int
    texto: str


class RespostaRag(BaseModel):
    resposta: str
    fontes: list[FonteRag]
    ferramentas_usadas: list[str]


class ReindexarFora(BaseModel):
    fragmentos: int


# --- Pauta de 1:1 ---------------------------------------------------------------


class MarcoFora(BaseModel):
    id: str
    titulo: str
    secoes: list[dict]


class PautaFora(BaseModel):
    pessoa: PessoaFora
    tempo_de_casa: str
    marco_atual: MarcoFora
    proximo_marco: MarcoFora | None
    desde: dt.datetime | None
    novidades: list[AnotacaoFora]
    anteriores: list[AnotacaoFora]
    abertos: list[PontoFora]
    evoluidos: list[PontoFora]
    fortes: list[PontoFora]
