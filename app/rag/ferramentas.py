"""As ferramentas que o agente (app/rag/agente.py) pode decidir chamar. Cada uma
tem um schema JSON (o que vai pro Ollama descrever a ferramenta) e uma função
Python que a executa de verdade.

Erro de ferramenta nunca sobe como exceção para o loop do agente — vira texto
de erro, que é o "resultado" que o modelo recebe de volta. É assim que ele
consegue decidir o que fazer a seguir (tentar de outro jeito, desistir, avisar
o usuário) em vez de o processo inteiro quebrar.
"""

from __future__ import annotations

import ast
import datetime as dt
import operator

import holidays
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models
from app.domain.aging import dias_desde, faixa_idade
from app.rag.perguntar import buscar_fragmentos

# --- schemas (formato "tools" do Ollama /api/chat, compatível com OpenAI) --------

SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "buscar_nos_registros",
            "description": (
                "Busca semântica no texto dos próprios tickets, anotações de diário, "
                "calls, acompanhamentos e pontos de avaliação. Use para perguntas sobre "
                "o CONTEÚDO de algum registro (o que foi dito, decidido, observado)."
            ),
            "parameters": {
                "type": "object",
                "properties": {"consulta": {"type": "string", "description": "A pergunta ou termo de busca"}},
                "required": ["consulta"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_metricas",
            "description": (
                "Contagens agregadas que não estão em nenhum texto — use para perguntas "
                "quantitativas como 'quantos tickets estão parados'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "metrica": {
                        "type": "string",
                        "enum": [
                            "tickets_parados",
                            "tickets_em_atencao",
                            "pontos_negativos_abertos",
                            "acompanhamentos_pausados",
                        ],
                    }
                },
                "required": ["metrica"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calcular",
            "description": "Avalia uma expressão aritmética simples (+, -, *, /, **, parênteses).",
            "parameters": {
                "type": "object",
                "properties": {"expressao": {"type": "string", "description": "Ex.: '(120 + 30) / 3'"}},
                "required": ["expressao"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "dias_uteis_ate",
            "description": "Quantos dias úteis (sem fim de semana nem feriado nacional) faltam até uma data.",
            "parameters": {
                "type": "object",
                "properties": {"data": {"type": "string", "description": "Data no formato AAAA-MM-DD"}},
                "required": ["data"],
            },
        },
    },
]


# --- calcular ---------------------------------------------------------------

_OPERADORES = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _avaliar_no(no: ast.AST) -> float:
    if isinstance(no, ast.Constant) and isinstance(no.value, (int, float)):
        return no.value
    if isinstance(no, ast.BinOp) and type(no.op) in _OPERADORES:
        return _OPERADORES[type(no.op)](_avaliar_no(no.left), _avaliar_no(no.right))
    if isinstance(no, ast.UnaryOp) and type(no.op) in _OPERADORES:
        return _OPERADORES[type(no.op)](_avaliar_no(no.operand))
    raise ValueError("Expressão não é aritmética pura (só números, + - * / ** e parênteses)")


def calcular(expressao: str) -> str:
    """Sem `eval()`: só os nós de AST na whitelist acima passam — qualquer nome,
    chamada de função ou atributo (ex.: `__import__(...)`) é rejeitado antes de
    rodar qualquer coisa."""
    arvore = ast.parse(expressao, mode="eval")
    resultado = _avaliar_no(arvore.body)
    return f"{resultado}"


# --- dias_uteis_ate ---------------------------------------------------------

_FERIADOS_BR = holidays.Brazil()


def dias_uteis_ate(data: str, hoje: dt.date | None = None) -> str:
    """`hoje` é injetável só para teste — em produção é sempre `date.today()`."""
    hoje = hoje or dt.date.today()
    alvo = dt.date.fromisoformat(data)
    if alvo < hoje:
        return f"{data} já passou (hoje é {hoje.isoformat()})."

    dias = 0
    cursor = hoje
    while cursor < alvo:
        cursor += dt.timedelta(days=1)
        if cursor.weekday() < 5 and cursor not in _FERIADOS_BR:
            dias += 1
    return f"Faltam {dias} dias úteis até {data} (hoje é {hoje.isoformat()})."


# --- consultar_metricas ---------------------------------------------------------


def consultar_metricas(db: Session, metrica: str) -> str:
    if metrica == "tickets_parados":
        n = sum(
            1
            for a in db.scalars(
                select(models.Atividade).where(
                    models.Atividade.removido_em.is_(None), models.Atividade.arquivada_em.is_(None)
                )
            )
            if faixa_idade(dias_desde(a.criado_em)) == "parado"
        )
        return f"{n} ticket(s) parado(s) (mais de 22 dias sem mudança)."

    if metrica == "tickets_em_atencao":
        n = sum(
            1
            for a in db.scalars(
                select(models.Atividade).where(
                    models.Atividade.removido_em.is_(None), models.Atividade.arquivada_em.is_(None)
                )
            )
            if faixa_idade(dias_desde(a.criado_em)) == "atencao"
        )
        return f"{n} ticket(s) em atenção (entre 8 e 22 dias sem mudança)."

    if metrica == "pontos_negativos_abertos":
        n = db.scalar(
            select(func.count()).select_from(models.PontoAvaliacao).where(
                models.PontoAvaliacao.tipo == "negativo",
                models.PontoAvaliacao.grau != "Evoluido",
                models.PontoAvaliacao.removido_em.is_(None),
                models.PontoAvaliacao.arquivado_em.is_(None),
            )
        )
        return f"{n} ponto(s) negativo(s) em aberto (não evoluído)."

    if metrica == "acompanhamentos_pausados":
        n = db.scalar(
            select(func.count()).select_from(models.Acompanhamento).where(
                models.Acompanhamento.status == "Pausado",
                models.Acompanhamento.removido_em.is_(None),
            )
        )
        return f"{n} acompanhamento(s) pausado(s)."

    raise ValueError(f"Métrica desconhecida: {metrica}")


# --- despacho ---------------------------------------------------------------


def executar(db: Session, nome: str, argumentos: dict) -> str:
    """Dispatch por nome. Chamado pelo loop do agente (app/rag/agente.py) — nunca
    deixa uma exceção escapar, sempre volta um texto (de sucesso ou de erro)."""
    try:
        if nome == "buscar_nos_registros":
            fragmentos = buscar_fragmentos(db, argumentos["consulta"])
            if not fragmentos:
                return "Nada encontrado nos registros para essa busca."
            return "\n\n".join(f"[{f.entidade} #{f.entidade_id}] {f.texto}" for f in fragmentos)
        if nome == "consultar_metricas":
            return consultar_metricas(db, argumentos["metrica"])
        if nome == "calcular":
            return calcular(argumentos["expressao"])
        if nome == "dias_uteis_ate":
            return dias_uteis_ate(argumentos["data"])
        return f"Ferramenta desconhecida: {nome}"
    except Exception as exc:  # noqa: BLE001 — de propósito: qualquer falha vira resultado, não exceção
        return f"Erro ao executar {nome}: {exc}"
