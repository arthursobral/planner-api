"""Camada de persistência. Dois padrões atravessam toda entidade mutável, para
não repetir a mesma regra oito vezes:

- Soft delete via `removido_em` (nunca DELETE) — remover marca o campo, restaurar
  limpa. Um `delete` de verdade é purga, e não existe endpoint para ela: se um dia
  fizer falta, é operação separada sobre quem já tem `removido_em`.
- Toda mutação chama `log_evento`, exceto o autosave de Reuniao (`salvar_reuniao`),
  que fica mudo de propósito para não afogar o histórico.
"""

from __future__ import annotations

import datetime as dt

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.domain.todos_parser import parse_todos


def _agora() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def log_evento(db: Session, entidade: str, entidade_id: int, campo: str, de: str | None, para: str | None) -> None:
    db.add(
        models.Evento(
            entidade=entidade,
            entidade_id=str(entidade_id),
            campo=campo,
            de=de,
            para=para,
            em=_agora(),
            origem="app",
        )
    )


def soft_delete(db: Session, obj, entidade: str) -> None:
    obj.removido_em = _agora()
    log_evento(db, entidade, obj.id, "removido_em", None, str(obj.removido_em))
    db.commit()


def restore(db: Session, obj, entidade: str) -> None:
    obj.removido_em = None
    log_evento(db, entidade, obj.id, "removido_em", "removido", None)
    db.commit()


def _buscar_ou_404(db: Session, modelo, id_: int):
    obj = db.get(modelo, id_)
    if obj is None or obj.removido_em is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{modelo.__name__} não encontrado")
    return obj


def obter_ou_404(db: Session, modelo, id_: int):
    """Busca por id sem filtrar `removido_em` — usado pelos endpoints de excluir
    (que agem sobre um registro vivo) e restaurar (que agem sobre um removido)."""
    obj = db.get(modelo, id_)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{modelo.__name__} não encontrado")
    return obj


# --- Pessoa ---------------------------------------------------------------


def criar_pessoa(db: Session, dados: schemas.PessoaCriar) -> models.Pessoa:
    pessoa = models.Pessoa(nome=dados.nome, data_admissao=dados.data_admissao)
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    return pessoa


def listar_pessoas(db: Session) -> list[models.Pessoa]:
    return list(db.scalars(select(models.Pessoa).order_by(models.Pessoa.data_admissao)))


def buscar_pessoa(db: Session, id_: int) -> models.Pessoa:
    pessoa = db.get(models.Pessoa, id_)
    if pessoa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pessoa não encontrada")
    return pessoa


def registrar_1a1(db: Session, id_: int, quando: dt.datetime | None = None) -> models.Pessoa:
    pessoa = buscar_pessoa(db, id_)
    pessoa.ultimo_1a1 = quando or _agora()
    log_evento(db, "pessoa", pessoa.id, "ultimo_1a1", None, str(pessoa.ultimo_1a1))
    db.commit()
    db.refresh(pessoa)
    return pessoa


# --- Atividade ---------------------------------------------------------------


def criar_atividade(db: Session, dados: schemas.AtividadeCriar) -> models.Atividade:
    atividade = models.Atividade(nome=dados.nome, prioridade=dados.prioridade, descricao=dados.descricao)
    db.add(atividade)
    db.commit()
    db.refresh(atividade)
    return atividade


def listar_atividades(db: Session, correntes: bool = True, limit: int = 100, offset: int = 0) -> list[models.Atividade]:
    filtro = models.Atividade.arquivada_em.is_(None) if correntes else models.Atividade.arquivada_em.is_not(None)
    stmt = (
        select(models.Atividade)
        .where(models.Atividade.removido_em.is_(None), filtro)
        .order_by(models.Atividade.criado_em)
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt))


def buscar_atividade(db: Session, id_: int) -> models.Atividade:
    return _buscar_ou_404(db, models.Atividade, id_)


def mudar_status_atividade(db: Session, id_: int, para: str) -> models.Atividade:
    atividade = buscar_atividade(db, id_)
    de = atividade.status
    atividade.status = para
    log_evento(db, "atividade", atividade.id, "status", de, para)
    db.commit()
    db.refresh(atividade)
    return atividade


def mudar_prioridade_atividade(db: Session, id_: int, para: str) -> models.Atividade:
    atividade = buscar_atividade(db, id_)
    de = atividade.prioridade
    atividade.prioridade = para
    log_evento(db, "atividade", atividade.id, "prioridade", de, para)
    db.commit()
    db.refresh(atividade)
    return atividade


def arquivar_atividade(db: Session, id_: int) -> models.Atividade:
    atividade = buscar_atividade(db, id_)
    atividade.arquivada_em = _agora()
    log_evento(db, "atividade", atividade.id, "arquivada_em", None, str(atividade.arquivada_em))
    db.commit()
    db.refresh(atividade)
    return atividade


def reabrir_atividade(db: Session, id_: int) -> models.Atividade:
    atividade = buscar_atividade(db, id_)
    atividade.arquivada_em = None
    log_evento(db, "atividade", atividade.id, "arquivada_em", "arquivada", None)
    db.commit()
    db.refresh(atividade)
    return atividade


# --- Todo ---------------------------------------------------------------


def criar_todos_de_texto(db: Session, texto: str, somente_marcados: bool = False) -> list[models.Todo]:
    itens = parse_todos(texto, somente_marcados=somente_marcados)
    todos = [
        models.Todo(texto=i.texto, concluido=i.concluido, status=i.status, nivel=i.nivel)
        for i in itens
    ]
    db.add_all(todos)
    db.commit()
    for t in todos:
        db.refresh(t)
    return todos


def listar_todos(db: Session) -> list[models.Todo]:
    stmt = select(models.Todo).where(models.Todo.removido_em.is_(None)).order_by(models.Todo.id)
    return list(db.scalars(stmt))


def buscar_todo(db: Session, id_: int) -> models.Todo:
    return _buscar_ou_404(db, models.Todo, id_)


def mudar_status_todo(db: Session, id_: int, para: str) -> models.Todo:
    todo = buscar_todo(db, id_)
    de = todo.status
    todo.status = para
    todo.concluido = para == "concluido"
    log_evento(db, "todo", todo.id, "status", de, para)
    db.commit()
    db.refresh(todo)
    return todo


def alternar_todo(db: Session, id_: int) -> models.Todo:
    todo = buscar_todo(db, id_)
    de = todo.status
    todo.concluido = not todo.concluido
    todo.status = "concluido" if todo.concluido else "todo"
    log_evento(db, "todo", todo.id, "status", de, todo.status)
    db.commit()
    db.refresh(todo)
    return todo


# --- Acompanhamento ---------------------------------------------------------------


def _resolver_atividade_id(db: Session, nome_atividade: str) -> int | None:
    stmt = select(models.Atividade.id).where(models.Atividade.nome.ilike(nome_atividade))
    return db.scalar(stmt)


def _resolver_pessoa_id(db: Session, nome_pessoa: str) -> int | None:
    stmt = select(models.Pessoa.id).where(models.Pessoa.nome.ilike(nome_pessoa))
    return db.scalar(stmt)


def criar_acompanhamento(db: Session, dados: schemas.AcompanhamentoCriar) -> models.Acompanhamento:
    """`pessoa` é texto livre — gente fora da equipe aparece nos dados reais.
    `atividade_id`/`pessoa_id_equipe` são só um bônus de correlação quando o nome bate."""
    acompanhamento = models.Acompanhamento(
        atividade=dados.atividade,
        pessoa=dados.pessoa,
        observacoes=dados.observacoes,
        atividade_id=_resolver_atividade_id(db, dados.atividade),
        pessoa_id_equipe=_resolver_pessoa_id(db, dados.pessoa),
    )
    db.add(acompanhamento)
    db.commit()
    db.refresh(acompanhamento)
    return acompanhamento


def listar_acompanhamentos(db: Session) -> list[models.Acompanhamento]:
    stmt = (
        select(models.Acompanhamento)
        .where(models.Acompanhamento.removido_em.is_(None))
        .order_by(models.Acompanhamento.criado_em)
    )
    return list(db.scalars(stmt))


def buscar_acompanhamento(db: Session, id_: int) -> models.Acompanhamento:
    return _buscar_ou_404(db, models.Acompanhamento, id_)


def mudar_status_acompanhamento(db: Session, id_: int, para: str) -> models.Acompanhamento:
    acompanhamento = buscar_acompanhamento(db, id_)
    de = acompanhamento.status
    acompanhamento.status = para
    log_evento(db, "acompanhamento", acompanhamento.id, "status", de, para)
    db.commit()
    db.refresh(acompanhamento)
    return acompanhamento


def remover_acompanhamentos_da_pessoa(db: Session, pessoa: str) -> list[int]:
    stmt = select(models.Acompanhamento).where(
        models.Acompanhamento.pessoa.ilike(pessoa), models.Acompanhamento.removido_em.is_(None)
    )
    itens = list(db.scalars(stmt))
    for item in itens:
        item.removido_em = _agora()
        log_evento(db, "acompanhamento", item.id, "removido_em", None, str(item.removido_em))
    db.commit()
    return [item.id for item in itens]


# --- Anotacao (diário) ---------------------------------------------------------------


def criar_anotacao(db: Session, dados: schemas.AnotacaoCriar) -> models.Anotacao:
    anotacao = models.Anotacao(pessoa_id=dados.pessoa_id, texto=dados.texto, em=dados.em)
    db.add(anotacao)
    db.commit()
    db.refresh(anotacao)
    return anotacao


def listar_anotacoes(db: Session, pessoa_id: int) -> list[models.Anotacao]:
    stmt = (
        select(models.Anotacao)
        .where(models.Anotacao.pessoa_id == pessoa_id, models.Anotacao.removido_em.is_(None))
        .order_by(models.Anotacao.em.desc())
    )
    return list(db.scalars(stmt))


def buscar_anotacao(db: Session, id_: int) -> models.Anotacao:
    return _buscar_ou_404(db, models.Anotacao, id_)


# --- PontoAvaliacao ---------------------------------------------------------------


def criar_ponto(db: Session, dados: schemas.PontoCriar) -> models.PontoAvaliacao:
    """Identidade = (pessoa, tipo, texto). Recriar o mesmo texto reativa um ponto
    arquivado/removido em vez de duplicar; bloqueia só se já existir um vivo igual."""
    stmt = select(models.PontoAvaliacao).where(
        models.PontoAvaliacao.pessoa_id == dados.pessoa_id,
        models.PontoAvaliacao.tipo == dados.tipo,
        models.PontoAvaliacao.texto == dados.texto,
    )
    existente = db.scalar(stmt)

    if existente is not None:
        vivo = existente.removido_em is None and existente.arquivado_em is None
        if vivo:
            raise HTTPException(status.HTTP_409_CONFLICT, "Esse ponto já existe")
        existente.removido_em = None
        existente.arquivado_em = None
        existente.grau = dados.grau
        log_evento(db, "ponto", existente.id, "revivido", None, "revivido")
        db.commit()
        db.refresh(existente)
        return existente

    ponto = models.PontoAvaliacao(pessoa_id=dados.pessoa_id, tipo=dados.tipo, texto=dados.texto, grau=dados.grau)
    db.add(ponto)
    db.commit()
    db.refresh(ponto)
    return ponto


def listar_pontos(db: Session, pessoa_id: int) -> list[models.PontoAvaliacao]:
    stmt = select(models.PontoAvaliacao).where(
        models.PontoAvaliacao.pessoa_id == pessoa_id, models.PontoAvaliacao.removido_em.is_(None)
    )
    return list(db.scalars(stmt))


def buscar_ponto(db: Session, id_: int) -> models.PontoAvaliacao:
    return _buscar_ou_404(db, models.PontoAvaliacao, id_)


def marcar_ponto_evoluido(db: Session, id_: int) -> models.PontoAvaliacao:
    """A ação mais significativa do app — nunca disparada em 14 meses de uso real
    na inspiração deste projeto. Só vale para ponto negativo ainda não evoluído."""
    ponto = buscar_ponto(db, id_)
    if ponto.tipo != "negativo" or ponto.grau == "Evoluido":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Só pontos negativos não evoluídos podem evoluir")
    ponto.grau = "Evoluido"
    ponto.resolvido_em = _agora()
    log_evento(db, "ponto", ponto.id, "grau", "negativo", "Evoluido")
    db.commit()
    db.refresh(ponto)
    return ponto


# --- Reuniao (call notes) ---------------------------------------------------------------


def criar_reuniao(db: Session, dados: schemas.ReuniaoCriar) -> models.Reuniao:
    reuniao = models.Reuniao(titulo=dados.titulo, em=dados.em, texto="")
    db.add(reuniao)
    db.commit()
    db.refresh(reuniao)
    return reuniao


def listar_reunioes(db: Session) -> list[models.Reuniao]:
    stmt = (
        select(models.Reuniao)
        .where(models.Reuniao.removido_em.is_(None))
        .order_by(models.Reuniao.em.desc(), models.Reuniao.criado_em.desc())
    )
    return list(db.scalars(stmt))


def buscar_reuniao(db: Session, id_: int) -> models.Reuniao:
    return _buscar_ou_404(db, models.Reuniao, id_)


def salvar_reuniao(db: Session, id_: int, dados: schemas.ReuniaoAtualizar) -> models.Reuniao:
    """Autosave — deliberadamente NÃO chama log_evento. Dezenas de PATCH por
    minuto durante a digitação afogariam o histórico de eventos."""
    reuniao = buscar_reuniao(db, id_)
    if dados.titulo is not None:
        reuniao.titulo = dados.titulo
    if dados.em is not None:
        reuniao.em = dados.em
    if dados.texto is not None:
        reuniao.texto = dados.texto
    db.commit()
    db.refresh(reuniao)
    return reuniao


# --- Evento ---------------------------------------------------------------


def listar_eventos(db: Session, entidade: str | None = None, entidade_id: int | None = None) -> list[models.Evento]:
    stmt = select(models.Evento).order_by(models.Evento.em.desc())
    if entidade is not None:
        stmt = stmt.where(models.Evento.entidade == entidade)
    if entidade_id is not None:
        stmt = stmt.where(models.Evento.entidade_id == str(entidade_id))
    return list(db.scalars(stmt))
