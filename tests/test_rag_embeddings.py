"""Smoke test real (baixa o modelo fastembed, ~100MB, na primeira execução) —
sem Ollama envolvido, então roda em CI sem problema. Confirma que o pipeline
de embeddings está de pé e que a busca por similaridade faz sentido mínimo."""

from math import dist

from app.rag.embeddings import DIMENSAO, embed_consulta, embed_documentos


def test_embed_documentos_tem_a_dimensao_esperada():
    vetores = embed_documentos(["um texto de teste", "outro texto qualquer"])
    assert len(vetores) == 2
    assert len(vetores[0]) == DIMENSAO


def test_embed_consulta_tem_a_dimensao_esperada():
    assert len(embed_consulta("uma pergunta de teste")) == DIMENSAO


def test_textos_parecidos_ficam_mais_proximos_que_textos_diferentes():
    gatos = embed_consulta("gatos são animais domésticos comuns")
    caes = embed_consulta("cachorros também são animais de estimação comuns")
    impostos = embed_consulta("declaração de imposto de renda")

    assert dist(gatos, caes) < dist(gatos, impostos)
