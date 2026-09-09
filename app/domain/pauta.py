"""Montagem da pauta de 1:1. Portado de Planner-v2/src/domain/umAum.ts
(montarPauta / pautaEmMarkdown) — é a peça mais interessante do domínio: uma
função pura que decide o que é "novidade" desde a última conversa com cada
pessoa, sem tocar em banco nem UI, e por isso testável isoladamente.

Corte de propósito em relação à fonte: lá, `marcoAtual`/`proximoMarco` carregam o
texto de critérios de progressão do RH do empregador do autor (em inglês,
verbatim). Isso é conteúdo institucional de um terceiro, não deste projeto — não
faz sentido versionar num repositório de portfólio. Aqui o marco é só um rótulo;
quem quiser a seção de expectativas preenche `criterios.local.json` (gitignored,
ver README) com {"marco_id": {"titulo": str, "secoes": [{"titulo": str, "itens": [str]}]}}.
Sem o arquivo, a pauta funciona igual — só omite essa seção.
"""

from __future__ import annotations

import datetime as dt
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.domain.progression import MARCOS, marco_de_progressao, tempo_de_casa

ROTULO_GRAU_NEGATIVO = {
    "Critico": "Crítico",
    "Medio": "Médio",
    "Baixo": "Baixo",
    "Evoluido": "Evoluído",
}

_MESES_ABREV = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
]

_CRITERIOS_PATH = Path(__file__).resolve().parents[2] / "criterios.local.json"


def _carregar_criterios() -> dict[str, Any]:
    if not _CRITERIOS_PATH.exists():
        return {}
    return json.loads(_CRITERIOS_PATH.read_text(encoding="utf-8"))


@dataclass
class Marco:
    id: str
    titulo: str
    secoes: list[dict] = field(default_factory=list)


def _marco(criterios: dict[str, Any], marco_id: str) -> Marco:
    dados = criterios.get(marco_id, {})
    # Sem criterios.local.json, o título é só o id do marco — os chamadores que
    # exibem "marco {titulo}" continuam legíveis ("marco 3") sem duplicar a palavra.
    return Marco(id=marco_id, titulo=dados.get("titulo", marco_id), secoes=dados.get("secoes", []))


@dataclass
class Pauta:
    pessoa: Any  # objeto com .nome / .data_admissao / .ultimo_1a1 — ver nota de tipagem no README
    tempo_de_casa: str
    marco_atual: Marco
    proximo_marco: Marco | None
    desde: dt.datetime | None
    novidades: list
    anteriores: list
    abertos: list
    evoluidos: list
    fortes: list


def montar_pauta(pessoa: Any, pontos: list, anotacoes: list, agora: dt.datetime | None = None) -> Pauta:
    """`pessoa`, cada item de `pontos` e de `anotacoes` só precisam responder aos
    atributos usados abaixo (duck typing) — funciona tanto com os modelos do
    SQLAlchemy quanto com objetos simples em teste, sem acoplar este módulo ao
    banco."""
    agora = agora or dt.datetime.now(dt.timezone.utc)
    criterios = _carregar_criterios()

    marco_id = marco_de_progressao(pessoa.data_admissao, agora.date())
    indice = MARCOS.index(marco_id)
    desde = pessoa.ultimo_1a1

    vivos = [p for p in pontos if not p.removido_em and p.arquivado_em is None]
    negativos = [p for p in vivos if p.tipo == "negativo"]

    ordenadas = sorted((a for a in anotacoes if not a.removido_em), key=lambda a: a.em, reverse=True)
    corte = desde.date() if desde else None

    return Pauta(
        pessoa=pessoa,
        tempo_de_casa=tempo_de_casa(pessoa.data_admissao, agora.date()),
        marco_atual=_marco(criterios, marco_id),
        proximo_marco=_marco(criterios, MARCOS[indice + 1]) if indice < len(MARCOS) - 1 else None,
        desde=desde,
        novidades=[a for a in ordenadas if a.em >= corte] if corte else ordenadas,
        anteriores=[a for a in ordenadas if a.em < corte] if corte else [],
        abertos=[p for p in negativos if p.grau != "Evoluido"],
        evoluidos=[p for p in negativos if p.grau == "Evoluido"],
        fortes=[p for p in vivos if p.tipo == "positivo"],
    )


def pauta_em_markdown(pauta: Pauta, agora: dt.datetime | None = None) -> str:
    """Markdown, não PDF: o destino é um campo de texto de outro sistema
    (Bamboo, Teams), não um documento para arquivar."""
    agora = agora or dt.datetime.now(dt.timezone.utc)
    linhas: list[str] = []

    linhas.append(f"# 1:1 com {pauta.pessoa.nome}")
    linhas.append("")
    linhas.append(f"{agora.strftime('%d/%m/%Y')} · {pauta.tempo_de_casa} de casa · marco {pauta.marco_atual.titulo}")
    linhas.append("")

    linhas.append(f"## Desde {pauta.desde.strftime('%d/%m/%Y')}" if pauta.desde else "## Primeira conversa registrada")
    linhas.append("")
    if not pauta.novidades:
        linhas.append("Nada anotado no período.")
    else:
        for a in pauta.novidades:
            linhas.append(f"- {_formatar_dia(a.em)}: {a.texto}")
    linhas.append("")

    if pauta.abertos:
        linhas.append("## A trabalhar")
        linhas.append("")
        for p in pauta.abertos:
            linhas.append(f"- {p.texto} ({ROTULO_GRAU_NEGATIVO.get(p.grau, p.grau)})")
        linhas.append("")

    if pauta.evoluidos:
        linhas.append("## Evoluiu")
        linhas.append("")
        for p in pauta.evoluidos:
            quando = f" (em {_formatar_dia(p.resolvido_em.date())})" if p.resolvido_em else ""
            linhas.append(f"- {p.texto}{quando}")
        linhas.append("")

    if pauta.fortes:
        linhas.append("## Pontos fortes")
        linhas.append("")
        for p in pauta.fortes:
            linhas.append(f"- {p.texto} ({p.grau})")
        linhas.append("")

    if pauta.marco_atual.secoes:
        linhas.append(f"## Expectativas do marco: {pauta.marco_atual.titulo}")
        linhas.append("")
        for secao in pauta.marco_atual.secoes:
            if len(pauta.marco_atual.secoes) > 1:
                linhas.append(f"**{secao['titulo']}**")
            for item in secao["itens"]:
                linhas.append(f"- {item}")
            linhas.append("")

    if pauta.proximo_marco and pauta.proximo_marco.secoes:
        linhas.append(f"## Próximo marco: {pauta.proximo_marco.titulo}")
        linhas.append("")
        for secao in pauta.proximo_marco.secoes:
            for item in secao["itens"]:
                linhas.append(f"- {item}")
        linhas.append("")

    return "\n".join(linhas)


def _formatar_dia(dia: dt.date) -> str:
    return f"{dia.day} de {_MESES_ABREV[dia.month - 1]}"
