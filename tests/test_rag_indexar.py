"""Integração real: Postgres (com pgvector) + embeddings de verdade, sem
Ollama — reindexar não gera texto, só embeda e grava. Confirma que a coluna
Vector guarda e devolve o embedding certo, ponta a ponta."""

import datetime as dt

from app import models
from app.rag.indexar import reindexar


def test_reindexar_cria_um_fragmento_por_registro_curto(db_session):
    pessoa = models.Pessoa(nome="Fulana", data_admissao=dt.date(2024, 1, 1))
    db_session.add(pessoa)
    db_session.flush()

    db_session.add(models.Atividade(nome="Ticket sobre o cliente Atlas", prioridade="Alta", descricao="Detalhe."))
    db_session.add(models.Anotacao(pessoa_id=pessoa.id, texto="Nota sobre o cliente Atlas.", em=dt.date.today()))
    db_session.commit()

    total = reindexar(db_session)

    assert total == 2
    fragmentos = db_session.query(models.Fragmento).all()
    assert {f.entidade for f in fragmentos} == {"atividade", "anotacao"}
    assert len(fragmentos[0].embedding) == 384


def test_reindexar_ignora_registros_removidos(db_session):
    pessoa = models.Pessoa(nome="Fulana", data_admissao=dt.date(2024, 1, 1))
    db_session.add(pessoa)
    db_session.flush()
    db_session.add(
        models.Anotacao(
            pessoa_id=pessoa.id,
            texto="Nota removida.",
            em=dt.date.today(),
            removido_em=dt.datetime.now(dt.timezone.utc),
        )
    )
    db_session.commit()

    assert reindexar(db_session) == 0


def test_reindexar_quebra_reuniao_longa_em_mais_de_um_fragmento(db_session):
    texto_longo = "\n\n".join(f"Parágrafo número {i} sobre o cliente Atlas." * 10 for i in range(5))
    db_session.add(models.Reuniao(titulo="Call longa", em=dt.date.today(), texto=texto_longo))
    db_session.commit()

    total = reindexar(db_session)

    assert total > 1
