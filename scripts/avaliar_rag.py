"""Avalia a qualidade do RAG contra perguntas fixas com resposta esperada —
keyword match na resposta gerada, simples de propósito (é o que a Fase 2 do
roteiro pede). Não entra no CI: depende do Ollama com um modelo baixado
(~2GB), pesado demais pra rodar a cada push. Ver README, seção RAG.

Uso, com a stack no ar (`docker compose up`, modelo já baixado no Ollama):

    python scripts/avaliar_rag.py --usuario arthur --senha sua-senha

As perguntas abaixo assumem o seed de demonstração padrão (app/seed.py) — se
você já substituiu o banco por dado real, ajuste as perguntas.
"""

from __future__ import annotations

import argparse
import sys

import httpx

# Console do Windows por padrão não é UTF-8; sem isso, acento vira "?" ou lixo.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PERGUNTAS: list[tuple[str, list[str]]] = [
    ("Por que o job de migração do cliente Atlas estava falhando?", ["timeout"]),
    ("Qual cliente pediu aumento da disponibilidade garantida da SLA?", ["Nimbus"]),
    ("Para quanto o cliente Nimbus quer aumentar a disponibilidade da SLA?", ["99,9", "99.9"]),
    ("Qual fornecedor de logs foi escolhido no onboarding?", ["Datadog"]),
    ("Quanto o novo fornecedor de logs reduziu de custo mensal?", ["30"]),
    ("O que causava a lentidão no relatório mensal do cliente Vetra?", ["índice", "indice"]),
    ("Depois da correção, quanto tempo passou a levar o relatório do cliente Vetra?", ["40 segundos", "40"]),
    ("Qual região o cliente Atlas pediu para priorizar?", ["Europa"]),
    ("Por que o cliente Atlas quer priorizar essa região?", ["lançamento", "lancamento"]),
    ("O que está pausando a revisão de contrato do cliente Nimbus?", ["jurídico", "juridico"]),
    ("Qual ponto forte foi registrado sobre a entrega da migração do cliente Atlas?", ["prazo"]),
    ("Por que o fornecedor anterior de logs foi trocado?", ["custo", "suporte"]),
]


def _bate(resposta: str, esperado: list[str]) -> bool:
    resposta_normalizada = resposta.lower()
    return any(palavra.lower() in resposta_normalizada for palavra in esperado)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--usuario", required=True)
    parser.add_argument("--senha", required=True)
    args = parser.parse_args()

    cliente = httpx.Client(base_url=args.base_url, timeout=120.0)

    login = cliente.post("/auth/login", data={"username": args.usuario, "password": args.senha})
    login.raise_for_status()
    cliente.headers["Authorization"] = f"Bearer {login.json()['access_token']}"

    reindexado = cliente.post("/rag/reindexar")
    reindexado.raise_for_status()
    print(f"Reindexado: {reindexado.json()['fragmentos']} fragmentos.\n")

    acertos = 0
    for pergunta, esperado in PERGUNTAS:
        resp = cliente.post("/rag/perguntar", json={"pergunta": pergunta})
        resp.raise_for_status()
        resposta = resp.json()["resposta"]
        ok = _bate(resposta, esperado)
        acertos += ok
        print(f"[{'OK' if ok else 'FALHOU'}] {pergunta}\n       -> {resposta}\n")

    total = len(PERGUNTAS)
    print(f"Taxa de acerto: {acertos}/{total} ({100 * acertos / total:.0f}%)")
    return 0 if acertos == total else 1


if __name__ == "__main__":
    sys.exit(main())
