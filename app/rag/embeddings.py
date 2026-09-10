"""Embeddings locais via fastembed (ONNX Runtime) — sem PyTorch, sem API paga,
sem chamada de rede depois do primeiro download do modelo (feito uma vez, fica
em cache no volume do container). Modelo multilíngue porque o conteúdo
indexado (anotações, calls, pontos de avaliação) é pt-BR.

`paraphrase-multilingual-MiniLM-L12-v2` (não um E5) de propósito: é o modelo
multilíngue pequeno que o fastembed de fato empacota — a família E5 só está
disponível nele na variante "large" (1024 dimensões, bem mais pesada). Sem
prefixo "query:"/"passage:" na entrada: essa convenção é específica dos
modelos E5, não deste.
"""

from __future__ import annotations

from fastembed import TextEmbedding

MODELO = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
DIMENSAO = 384

_modelo: TextEmbedding | None = None


def _carregar() -> TextEmbedding:
    global _modelo
    if _modelo is None:
        _modelo = TextEmbedding(model_name=MODELO)
    return _modelo


def embed_documentos(textos: list[str]) -> list[list[float]]:
    return [vetor.tolist() for vetor in _carregar().embed(textos)]


def embed_consulta(texto: str) -> list[float]:
    (vetor,) = _carregar().embed([texto])
    return vetor.tolist()
