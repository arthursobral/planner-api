"""Seed de demonstração — SEMPRE com nomes falsos (Faker). Nunca colocar aqui o
nome de uma pessoa real: isto é o que roda em CI e no `docker compose up` de
qualquer um que clonar o repositório.

Se o Arthur quiser cadastrar o time real para uso pessoal, é pelas rotas da API
(`POST /pessoas` etc.) — esse dado fica só no volume Postgres local, nunca aqui.

O conteúdo dos tickets/anotações/calls abaixo é escrito à mão (não gerado por
Faker) — de propósito: são os fatos que `scripts/avaliar_rag.py` usa para
checar se a busca semântica encontra a coisa certa. Texto do Faker (lorem
ipsum-like) não serviria: não dá pra escrever uma pergunta com resposta certa
sobre frase aleatória.
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
            models.Atividade(
                nome="Migração do pipeline de dados do cliente Atlas",
                prioridade="Alta",
                status="Em Andamento",
                descricao=(
                    "O job noturno estava falhando por timeout na consulta principal; "
                    "aumentamos o timeout e paralelizamos o processamento por região."
                ),
            ),
            models.Atividade(
                nome="Revisão do contrato de SLA com o cliente Nimbus",
                prioridade="Média",
                status="Pendente",
                descricao=(
                    "O jurídico do cliente pediu para aumentar a disponibilidade garantida "
                    "de 99,5% para 99,9%."
                ),
            ),
            models.Atividade(
                nome="Onboarding do fornecedor de logs Datadog",
                prioridade="Baixa",
                status="Concluída",
                descricao="Configuramos o encaminhamento de logs estruturados para o Datadog.",
            ),
            models.Atividade(
                nome="Investigação de lentidão no relatório mensal do cliente Vetra",
                prioridade="Alta",
                status="Em Andamento",
                descricao=(
                    "O relatório estava levando mais de 10 minutos para gerar; identificamos "
                    "um índice faltando na tabela de transações."
                ),
            ),
            models.Atividade(
                nome="Renovação de licença do Grafana",
                prioridade="Baixa",
                status="Pendente",
            ),
        ]
    )
    db.add_all(
        [
            models.Todo(texto="Item de tarefa de exemplo", nivel=0),
            models.Todo(texto="Sub-item de exemplo", nivel=1),
        ]
    )
    db.add_all(
        [
            models.Anotacao(
                pessoa_id=pessoas[0].id,
                em=hoje - dt.timedelta(days=10),
                texto="Comentou que quer assumir mais responsabilidade no projeto do cliente Atlas.",
            ),
            models.Anotacao(
                pessoa_id=pessoas[0].id,
                em=hoje - dt.timedelta(days=3),
                texto="Entregou a migração do pipeline do cliente Atlas antes do prazo combinado.",
            ),
            models.Anotacao(
                pessoa_id=pessoas[1].id,
                em=hoje - dt.timedelta(days=20),
                texto="Relatou dificuldade de comunicação assíncrona com o time do cliente Nimbus por causa do fuso horário.",
            ),
            models.Anotacao(
                pessoa_id=pessoas[2].id,
                em=hoje - dt.timedelta(days=1),
                texto="Pediu para participar do próximo onboarding de fornecedores para aprender mais sobre integrações.",
            ),
        ]
    )
    db.add_all(
        [
            models.Reuniao(
                titulo="Call semanal com o cliente Atlas",
                em=hoje - dt.timedelta(days=3),
                texto=(
                    "Discutimos o andamento da migração do pipeline de dados.\n\n"
                    "O cliente pediu para priorizar a região Europa por causa de um "
                    "lançamento de produto em duas semanas.\n\n"
                    "Próximos passos: paralelizar por região e reportar o progresso toda sexta."
                ),
            ),
            models.Reuniao(
                titulo="Call de renovação de contrato com o cliente Nimbus",
                em=hoje - dt.timedelta(days=8),
                texto=(
                    "O jurídico do cliente pediu aumento da disponibilidade garantida de "
                    "99,5% para 99,9%.\n\n"
                    "Combinamos revisar internamente com o time de infraestrutura antes de responder."
                ),
            ),
            models.Reuniao(
                titulo="Retrospectiva do onboarding do Datadog",
                em=hoje - dt.timedelta(days=15),
                texto=(
                    "O fornecedor anterior de logs tinha custo alto e suporte lento.\n\n"
                    "A migração para o Datadog reduziu o custo mensal em 30%."
                ),
            ),
        ]
    )
    db.add_all(
        [
            models.Acompanhamento(
                atividade="Migração do pipeline de dados do cliente Atlas",
                pessoa=pessoas[0].nome,
                status="Em Andamento",
                observacoes="Aguardando aprovação do cliente para paralelizar por região.",
            ),
            models.Acompanhamento(
                atividade="Revisão do contrato de SLA com o cliente Nimbus",
                pessoa="Marcos",
                status="Pausado",
                observacoes="Aguardando retorno do jurídico interno sobre a nova cláusula de disponibilidade.",
            ),
            models.Acompanhamento(
                atividade="Investigação de lentidão no relatório mensal do cliente Vetra",
                pessoa=pessoas[2].nome,
                status="Finalizado",
                observacoes="Índice criado; tempo de geração do relatório caiu de 10 minutos para 40 segundos.",
            ),
        ]
    )
    db.add_all(
        [
            models.PontoAvaliacao(
                pessoa_id=pessoas[0].id,
                tipo="positivo",
                texto="Entregou a migração do pipeline do cliente Atlas antes do prazo combinado",
                grau="Otimo",
            ),
            models.PontoAvaliacao(
                pessoa_id=pessoas[1].id,
                tipo="negativo",
                texto="Dificuldade de comunicação assíncrona com clientes em fuso horário diferente",
                grau="Medio",
            ),
            models.PontoAvaliacao(
                pessoa_id=pessoas[2].id,
                tipo="positivo",
                texto="Resolveu sozinho a lentidão do relatório mensal do cliente Vetra",
                grau="Bom",
            ),
        ]
    )
    db.commit()
