"""Cliente HTTP fino para o Ollama local — a API dele é só JSON sobre HTTP, não
precisa de SDK. Nenhuma chamada sai da máquina: o host é sempre o serviço
`ollama` do próprio docker-compose (ou `localhost` se você rodar fora dele).

`/api/chat` (não `/api/generate`): é o endpoint com suporte a `tools` — o que
faz o agente (app/rag/agente.py) funcionar. `/api/generate` só faz texto livre,
sem noção de ferramenta.
"""

from __future__ import annotations

from app.config import settings

import httpx


def chat(mensagens: list[dict], ferramentas: list[dict] | None = None) -> dict:
    """Retorna a `message` da resposta (role, content, e `tool_calls` quando o
    modelo decide chamar uma ferramenta em vez de responder em texto).

    temperature=0: a resposta deve citar o que as ferramentas devolveram, não
    improvisar — também torna a avaliação manual reproduzível entre execuções.
    """
    corpo: dict = {
        "model": settings.ollama_model,
        "messages": mensagens,
        "stream": False,
        "options": {"temperature": 0},
    }
    if ferramentas:
        corpo["tools"] = ferramentas

    resposta = httpx.post(f"{settings.ollama_url}/api/chat", json=corpo, timeout=120.0)
    resposta.raise_for_status()
    return resposta.json()["message"]
