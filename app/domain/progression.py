"""Marco de progressão por tempo de casa. Portado de
Planner-v2/src/domain/progression.ts — sem o texto institucional (ver
app/domain/pauta.py para o porquê: aquele conteúdo pertence ao empregador do
usuário, não ao projeto).

Usa `dateutil.relativedelta` para meses de calendário, na mesma lógica de
`differenceInMonths` do date-fns na fonte: a alternativa ingênua (dias / 30.44)
foi justamente o bug que a fonte documenta ter corrigido.
"""

from __future__ import annotations

import datetime as dt

from dateutil.relativedelta import relativedelta

MARCOS = ["0", "1.5", "1", "3", "6", "9", "12", "13"]


def _meses_completos(inicio: dt.date, agora: dt.date) -> int:
    rd = relativedelta(agora, inicio)
    return rd.years * 12 + rd.months


def marco_de_progressao(data_admissao: dt.date, agora: dt.date | None = None) -> str:
    """Data de admissão futura (cadastro adiantado, fuso errado) sempre cai em
    '0', nunca em marco "negativo" — o app original usava `abs()` e por isso
    podia devolver marco positivo para quem ainda nem começou."""
    agora = agora or dt.date.today()
    dias = (agora - data_admissao).days
    if dias < 0 or dias < 11:
        return "0"
    if dias / 7 < 4:
        return "1.5"

    meses = _meses_completos(data_admissao, agora)
    if meses < 3:
        return "1"
    if meses < 6:
        return "3"
    if meses < 9:
        return "6"
    if meses < 12:
        return "9"
    if meses < 13:
        return "12"
    return "13"


def tempo_de_casa(data_admissao: dt.date, agora: dt.date | None = None) -> str:
    """Tempo de casa em texto pt-BR, para exibição."""
    agora = agora or dt.date.today()
    dias = (agora - data_admissao).days
    if dias < 0:
        return "ainda não iniciou"

    meses = _meses_completos(data_admissao, agora)
    if meses < 1:
        return f"{dias} {'dia' if dias == 1 else 'dias'}"

    anos, resto_meses = divmod(meses, 12)
    partes = []
    if anos > 0:
        partes.append(f"{anos} {'ano' if anos == 1 else 'anos'}")
    if resto_meses > 0:
        partes.append(f"{resto_meses} {'mês' if resto_meses == 1 else 'meses'}")
    return " e ".join(partes)
