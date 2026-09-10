"""Chunking simples por parágrafo, com tamanho máximo. Só usado para
`Reuniao.texto` (rascunho de call, pode crescer) — os outros campos indexados
(nome de ticket, texto de anotação, texto de ponto) já são curtos o
suficiente pra virar um chunk cada, sem chunker nenhum. Complexidade só onde
o dado real precisa dela.
"""

from __future__ import annotations

TAMANHO_MAXIMO = 500


def chunk_por_paragrafo(texto: str, tamanho_maximo: int = TAMANHO_MAXIMO) -> list[str]:
    paragrafos = [p.strip() for p in texto.split("\n\n") if p.strip()]
    chunks: list[str] = []
    atual = ""

    for paragrafo in paragrafos:
        candidato = f"{atual}\n\n{paragrafo}" if atual else paragrafo
        if len(candidato) > tamanho_maximo and atual:
            chunks.append(atual)
            atual = paragrafo
        else:
            atual = candidato

    if atual:
        chunks.append(atual)

    return chunks
