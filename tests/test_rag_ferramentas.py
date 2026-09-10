import datetime as dt

import pytest

from app import models
from app.rag.ferramentas import calcular, consultar_metricas, dias_uteis_ate, executar


def test_calcular_aritmetica_simples():
    assert calcular("(120 + 30) / 3") == "50.0"
    assert calcular("2 ** 10") == "1024"


def test_calcular_rejeita_qualquer_coisa_que_nao_seja_aritmetica():
    with pytest.raises((ValueError, SyntaxError)):
        calcular("__import__('os').system('echo oi')")
    with pytest.raises((ValueError, SyntaxError)):
        calcular("open('/etc/passwd')")


def test_dias_uteis_ate_pula_fim_de_semana():
    # 2026-09-10 é quinta; até 2026-09-14 (segunda) são 2 dias úteis (sex e seg).
    resultado = dias_uteis_ate("2026-09-14", hoje=dt.date(2026, 9, 10))
    assert "2 dias úteis" in resultado


def test_dias_uteis_ate_data_no_passado():
    resultado = dias_uteis_ate("2020-01-01", hoje=dt.date(2026, 9, 10))
    assert "já passou" in resultado


def test_consultar_metricas_tickets_parados(db_session):
    velho = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=30)
    novo = dt.datetime.now(dt.timezone.utc)
    db_session.add(models.Atividade(nome="Velho", prioridade="Alta", criado_em=velho))
    db_session.add(models.Atividade(nome="Novo", prioridade="Alta", criado_em=novo))
    db_session.commit()

    resultado = consultar_metricas(db_session, "tickets_parados")

    assert "1 ticket" in resultado


def test_consultar_metricas_metrica_desconhecida_vira_erro_no_executar(db_session):
    resultado = executar(db_session, "consultar_metricas", {"metrica": "nao_existe"})
    assert "Erro ao executar" in resultado


def test_executar_ferramenta_desconhecida_nao_lanca_excecao(db_session):
    resultado = executar(db_session, "ferramenta_fantasma", {})
    assert "desconhecida" in resultado.lower()
