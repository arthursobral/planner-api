"""Cliente HTTP fino para o Ollama local — a API dele é só JSON sobre HTTP, não
precisa de SDK. Nenhuma chamada sai da máquina: o host é sempre o serviço
`ollama` do próprio docker-compose (ou `localhost` se você rodar fora dele).
"""

from __future__ import annotations

import httpx

from app.config import settings


def gerar(prompt: str) -> str:
    # temperature=0: resposta deve citar o que está nos trechos, não improvisar
    # — também torna a avaliação (scripts/avaliar_rag.py) reproduzível entre execuções.
    resposta = httpx.post(
        f"{settings.ollama_url}/api/generate",
        json={
            "model": settings.ollama_model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0},
        },
        timeout=120.0,
    )
    resposta.raise_for_status()
    return resposta.json()["response"].strip()
