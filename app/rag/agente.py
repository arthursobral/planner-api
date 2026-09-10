"""Loop do agente: manda a conversa + as ferramentas disponíveis pro LLM, executa
o que ele decidir chamar, devolve o resultado, repete até ele responder em texto
ou estourar o limite de iterações.

`executar_loop` recebe `chamar` como parâmetro (o cliente Ollama real como
padrão) de propósito: é o que permite testar a lógica do loop — múltiplas
rodadas de ferramenta, erro tratado, limite de iterações — sem precisar de um
Ollama de verdade rodando (ver tests/test_rag_agente.py). Mesmo espírito de
`app/domain/pauta.py` aceitar `agora` injetável.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from sqlalchemy.orm import Session

from app.rag import ferramentas
from app.rag.ollama_client import chat as chat_ollama
from app.rag.perguntar import Fonte, buscar_fragmentos

MAX_ITERACOES = 5

_SISTEMA = """Você ajuda um team lead a consultar os próprios registros: tickets, \
anotações de diário, calls, acompanhamentos e pontos de avaliação da equipe.

Use "buscar_nos_registros" para perguntas sobre o conteúdo de algum registro.
Use "consultar_metricas" para perguntas quantitativas (quantos, contagem).
Use "calcular" para contas matemáticas.
Use "dias_uteis_ate" para prazos em dias úteis.

Depois que uma ferramenta devolver um resultado, sua resposta final deve se
basear literalmente nesse resultado — cite o número, texto ou fato exato que
ela retornou, não responda sobre outro assunto.

Nunca invente informação. Se as ferramentas não derem a resposta, diga que não
encontrou. Responda sempre em português, direto."""

ChamarLLM = Callable[[list[dict], list[dict]], dict]
ExecutarFerramenta = Callable[[str, dict], str]


@dataclass
class ResultadoAgente:
    resposta: str
    ferramentas_usadas: list[str] = field(default_factory=list)


@dataclass
class RespostaComFontes:
    resposta: str
    ferramentas_usadas: list[str]
    fontes: list[Fonte]


def executar_loop(
    mensagens: list[dict],
    executar_ferramenta: ExecutarFerramenta,
    chamar: ChamarLLM = chat_ollama,
    max_iteracoes: int = MAX_ITERACOES,
) -> ResultadoAgente:
    usadas: list[str] = []

    for _ in range(max_iteracoes):
        resposta = chamar(mensagens, ferramentas.SCHEMAS)
        tool_calls = resposta.get("tool_calls") or []

        if not tool_calls:
            return ResultadoAgente(resposta=resposta.get("content", ""), ferramentas_usadas=usadas)

        mensagens.append(resposta)
        for chamada in tool_calls:
            nome = chamada["function"]["name"]
            argumentos = chamada["function"]["arguments"]
            print(f"[agente] chamando ferramenta: {nome}({argumentos})")  # noqa: T201 — log de decisão, ver README
            usadas.append(nome)
            resultado = executar_ferramenta(nome, argumentos)
            mensagens.append({"role": "tool", "content": resultado, "name": nome})

    return ResultadoAgente(
        resposta="Não consegui concluir a resposta a tempo (limite de passos do agente atingido).",
        ferramentas_usadas=usadas,
    )


def perguntar_com_agente(db: Session, pergunta: str) -> RespostaComFontes:
    fontes: list[Fonte] = []

    def _executar(nome: str, argumentos: dict) -> str:
        if nome == "buscar_nos_registros":
            encontrados = buscar_fragmentos(db, argumentos.get("consulta", pergunta))
            fontes.extend(
                Fonte(entidade=f.entidade, entidade_id=f.entidade_id, texto=f.texto) for f in encontrados
            )
            if not encontrados:
                return "Nada encontrado nos registros para essa busca."
            return "\n\n".join(f"[{f.entidade} #{f.entidade_id}] {f.texto}" for f in encontrados)
        return ferramentas.executar(db, nome, argumentos)

    mensagens = [
        {"role": "system", "content": _SISTEMA},
        {"role": "user", "content": pergunta},
    ]
    resultado = executar_loop(mensagens, executar_ferramenta=_executar)

    return RespostaComFontes(
        resposta=resultado.resposta,
        ferramentas_usadas=resultado.ferramentas_usadas,
        fontes=fontes,
    )
