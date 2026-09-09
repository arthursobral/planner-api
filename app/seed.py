"""Seed de demonstração — SEMPRE com nomes falsos (Faker). Nunca colocar aqui o
nome de uma pessoa real: isto é o que roda em CI e no `docker compose up` de
qualquer um que clonar o repositório.

Se o Arthur quiser cadastrar o time real para uso pessoal, é pelas rotas da API
(`POST /pessoas` etc.) — esse dado fica só no volume Postgres local, nunca aqui.
"""

from __future__ import annotations

import datetime as dt

from faker import Faker
from sqlalchemy.orm import Session

from app import models

_fake = Faker("pt_BR")


def banco_esta_vazio(db: Session) -> bool:
    return db.query(models.Pessoa).first() is None


def seed_demo(db: Session, n_pessoas: int = 3) -> None:
    Faker.seed(42)
    hoje = dt.date.today()

    pessoas = [
        models.Pessoa(nome=_fake.first_name(), data_admissao=hoje - dt.timedelta(days=30 * (i + 1) * 4))
        for i in range(n_pessoas)
    ]
    db.add_all(pessoas)
    db.flush()

    db.add_all(
        [
            models.Atividade(nome="Exemplo de ticket em andamento", prioridade="Alta", status="Em Andamento"),
            models.Atividade(nome="Exemplo de ticket pendente", prioridade="Média", status="Pendente"),
        ]
    )
    db.add_all(
        [
            models.Todo(texto="Item de tarefa de exemplo", nivel=0),
            models.Todo(texto="Sub-item de exemplo", nivel=1),
        ]
    )
    db.add(
        models.Anotacao(
            pessoa_id=pessoas[0].id,
            texto="Nota de exemplo de diário — dado fictício.",
            em=hoje,
        )
    )
    db.add(
        models.PontoAvaliacao(
            pessoa_id=pessoas[0].id,
            tipo="positivo",
            texto="Ponto forte de exemplo",
            grau="Bom",
        )
    )
    db.commit()
