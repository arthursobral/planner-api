import datetime as dt

from app.domain.aging import DIAS_ATENCAO, DIAS_PARADO, dias_desde, faixa_idade, proporcao_da_barra


def test_faixa_idade_nas_bordas():
    assert faixa_idade(DIAS_ATENCAO - 1) == "em-dia"
    assert faixa_idade(DIAS_ATENCAO) == "atencao"
    assert faixa_idade(DIAS_PARADO - 1) == "atencao"
    assert faixa_idade(DIAS_PARADO) == "parado"


def test_dias_desde_nunca_fica_negativo():
    agora = dt.datetime(2026, 1, 10, tzinfo=dt.timezone.utc)
    criado_no_futuro = dt.datetime(2026, 1, 20, tzinfo=dt.timezone.utc)
    assert dias_desde(criado_no_futuro, agora) == 0


def test_proporcao_da_barra_tem_piso_visivel():
    assert proporcao_da_barra(0, 30) == 0.06
    assert proporcao_da_barra(30, 30) == 1.0
    assert proporcao_da_barra(5, 0) == 0.0
