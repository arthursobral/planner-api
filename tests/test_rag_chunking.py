from app.rag.chunking import chunk_por_paragrafo


def test_paragrafo_unico_vira_um_chunk():
    assert chunk_por_paragrafo("um parágrafo só") == ["um parágrafo só"]


def test_paragrafos_curtos_se_juntam_num_chunk_so():
    texto = "um.\n\ndois.\n\ntres."
    assert chunk_por_paragrafo(texto, tamanho_maximo=100) == [texto]


def test_quebra_em_novo_chunk_quando_excede_tamanho_maximo():
    texto = "\n\n".join(["a" * 10, "b" * 10, "c" * 10])
    assert chunk_por_paragrafo(texto, tamanho_maximo=15) == ["a" * 10, "b" * 10, "c" * 10]


def test_texto_vazio_nao_gera_chunk_nenhum():
    assert chunk_por_paragrafo("") == []
    assert chunk_por_paragrafo("   \n\n   ") == []
