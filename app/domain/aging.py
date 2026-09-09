"""Idade/staleness de um ticket. Portado de Planner-v2/src/domain/aging.ts.

As faixas (8 / 22 dias) vêm direto da fonte: três semanas é o limite a partir do
qual um ticket deixou de andar, calibrado contra dado real (os tickets abertos do
Planner original tinham 24, 28 e 35 dias — todos caem em "parado").
"""

from __future__ import annotations

import datetime as dt

DIAS_ATENCAO = 8
DIAS_PARADO = 22


def dias_desde(quando: dt.datetime, agora: dt.datetime | None = None) -> int:
    agora = agora or dt.datetime.now(dt.timezone.utc)
    return max(0, (agora.date() - quando.date()).days)


def faixa_idade(dias: int) -> str:
    """Uma de 'em-dia', 'atencao', 'parado'."""
    if dias >= DIAS_PARADO:
        return "parado"
    if dias >= DIAS_ATENCAO:
        return "atencao"
    return "em-dia"


def proporcao_da_barra(dias: int, maior_dias: int) -> float:
    """Largura relativa (0-1) da barra de tempo parado, proporcional ao item mais
    antigo da lista — comparação dentro do conjunto, não escala absoluta."""
    if maior_dias <= 0:
        return 0.0
    return max(0.06, dias / maior_dias)
