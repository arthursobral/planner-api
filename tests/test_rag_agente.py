"""Testa a lógica do loop do agente com um `chamar` falso — sem Ollama de
verdade, sem rede. `chamar` aqui é uma fila de respostas pré-definidas,
simulando o que o Ollama devolveria em cada rodada."""

from app.rag.agente import MAX_ITERACOES, executar_loop


def _chamar_fila(respostas: list[dict]):
    fila = list(respostas)

    def _chamar(mensagens, ferramentas):
        return fila.pop(0)

    return _chamar


def test_responde_direto_sem_ferramenta_nenhuma():
    chamar = _chamar_fila([{"role": "assistant", "content": "Resposta direta."}])

    resultado = executar_loop([{"role": "user", "content": "oi"}], executar_ferramenta=lambda n, a: "", chamar=chamar)

    assert resultado.resposta == "Resposta direta."
    assert resultado.ferramentas_usadas == []


def test_chama_uma_ferramenta_e_depois_responde():
    chamar = _chamar_fila(
        [
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [{"function": {"name": "calcular", "arguments": {"expressao": "1+1"}}}],
            },
            {"role": "assistant", "content": "A conta dá 2."},
        ]
    )

    resultado = executar_loop(
        [{"role": "user", "content": "quanto é 1+1"}],
        executar_ferramenta=lambda nome, args: "2",
        chamar=chamar,
    )

    assert resultado.resposta == "A conta dá 2."
    assert resultado.ferramentas_usadas == ["calcular"]


def test_erro_na_ferramenta_nao_quebra_o_loop_modelo_ve_o_erro():
    chamar = _chamar_fila(
        [
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [{"function": {"name": "calcular", "arguments": {"expressao": "1/0"}}}],
            },
            {"role": "assistant", "content": "Não consegui calcular isso."},
        ]
    )
    def _executar_com_erro(nome, args):
        return "Erro ao executar calcular: division by zero"

    resultado = executar_loop(
        [{"role": "user", "content": "quanto é 1/0"}], executar_ferramenta=_executar_com_erro, chamar=chamar
    )

    assert resultado.resposta == "Não consegui calcular isso."
    assert resultado.ferramentas_usadas == ["calcular"]


def test_estoura_limite_de_iteracoes_e_cai_no_fallback():
    sempre_chama_ferramenta = {
        "role": "assistant",
        "content": "",
        "tool_calls": [{"function": {"name": "calcular", "arguments": {"expressao": "1+1"}}}],
    }
    chamar = _chamar_fila([sempre_chama_ferramenta] * MAX_ITERACOES)

    resultado = executar_loop(
        [{"role": "user", "content": "..."}], executar_ferramenta=lambda n, a: "2", chamar=chamar
    )

    assert "limite" in resultado.resposta.lower()
    assert len(resultado.ferramentas_usadas) == MAX_ITERACOES
