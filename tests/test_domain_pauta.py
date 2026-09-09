"""Mesmo caso que `umAum.test.ts` cobre na inspiração (Planner-v2), agora em
Python. `montar_pauta` é função pura: os objetos abaixo só precisam ter os
atributos usados pelo domínio, sem precisar de um banco de verdade."""

import datetime as dt
from types import SimpleNamespace

from app.domain.pauta import montar_pauta, pauta_em_markdown


def _pessoa(ultimo_1a1=None, data_admissao=dt.date(2024, 1, 1), nome="Fulana"):
    return SimpleNamespace(id=1, nome=nome, data_admissao=data_admissao, ultimo_1a1=ultimo_1a1)


def _anotacao(em, texto, removido_em=None):
    return SimpleNamespace(em=em, texto=texto, removido_em=removido_em)


def _ponto(tipo, grau, texto="ponto", removido_em=None, arquivado_em=None, resolvido_em=None):
    return SimpleNamespace(
        tipo=tipo, grau=grau, texto=texto, removido_em=removido_em, arquivado_em=arquivado_em, resolvido_em=resolvido_em
    )


def test_sem_1a1_registrado_tudo_e_novidade():
    """Regra explícita da fonte: sem um 1:1 registrado, tudo é novidade — é o
    comportamento certo para a primeira conversa."""
    pessoa = _pessoa(ultimo_1a1=None)
    anotacoes = [_anotacao(dt.date(2025, 1, 1), "nota antiga"), _anotacao(dt.date(2026, 1, 1), "nota nova")]

    pauta = montar_pauta(pessoa, [], anotacoes)

    assert pauta.desde is None
    assert len(pauta.novidades) == 2
    assert pauta.anteriores == []


def test_dia_do_1a1_conta_como_novidade():
    """O dia do próprio 1:1 é novidade: o que foi anotado naquele dia
    provavelmente saiu da conversa."""
    corte = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)
    pessoa = _pessoa(ultimo_1a1=corte)
    anotacoes = [
        _anotacao(dt.date(2025, 12, 1), "antes do corte"),
        _anotacao(dt.date(2026, 1, 1), "no dia do corte"),
        _anotacao(dt.date(2026, 2, 1), "depois do corte"),
    ]

    pauta = montar_pauta(pessoa, [], anotacoes)

    assert [a.texto for a in pauta.novidades] == ["depois do corte", "no dia do corte"]
    assert [a.texto for a in pauta.anteriores] == ["antes do corte"]


def test_pontos_removidos_e_arquivados_ficam_fora_da_pauta():
    pessoa = _pessoa()
    agora = dt.datetime.now(dt.timezone.utc)
    pontos = [
        _ponto("negativo", "Medio", texto="vivo"),
        _ponto("negativo", "Medio", texto="removido", removido_em=agora),
        _ponto("negativo", "Medio", texto="arquivado", arquivado_em=agora),
        _ponto("negativo", "Evoluido", texto="evoluiu"),
        _ponto("positivo", "Bom", texto="forte"),
    ]

    pauta = montar_pauta(pessoa, pontos, [])

    assert [p.texto for p in pauta.abertos] == ["vivo"]
    assert [p.texto for p in pauta.evoluidos] == ["evoluiu"]
    assert [p.texto for p in pauta.fortes] == ["forte"]


def test_markdown_omite_secao_de_expectativas_sem_criterios_locais():
    """Sem `criterios.local.json` (nunca versionado — é conteúdo do empregador
    do usuário), a pauta ainda funciona, só sem a seção de expectativas."""
    pessoa = _pessoa()
    pauta = montar_pauta(pessoa, [], [])

    texto = pauta_em_markdown(pauta)

    assert "Expectativas do marco" not in texto
    assert f"# 1:1 com {pessoa.nome}" in texto


def test_markdown_primeira_conversa_sem_novidades():
    pessoa = _pessoa(ultimo_1a1=None)
    pauta = montar_pauta(pessoa, [], [])

    texto = pauta_em_markdown(pauta)

    assert "## Primeira conversa registrada" in texto
    assert "Nada anotado no período." in texto
