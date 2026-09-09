from app.domain.todos_parser import parse_todos


def test_reconhece_todos_os_marcadores():
    itens = parse_todos("* um\n- dois\n• tres\n1. quatro")
    assert [i.texto for i in itens] == ["um", "dois", "tres", "quatro"]


def test_checkbox_so_conta_na_posicao_de_checkbox():
    """O app original testava `[x]` contra a linha inteira: um item cujo texto
    mencionasse "[x]" virava concluído sem o usuário pedir. Aqui só a posição de
    checkbox conta."""
    itens = parse_todos("- [x] feito\n- pendente com [x] no meio do texto")
    assert itens[0].concluido is True
    assert itens[0].status == "concluido"
    assert itens[1].concluido is False
    assert itens[1].texto == "pendente com [x] no meio do texto"


def test_somente_marcados_ignora_narrativa():
    itens = parse_todos("Foi uma boa call hoje.\n- ação real combinada", somente_marcados=True)
    assert [i.texto for i in itens] == ["ação real combinada"]


def test_sem_filtro_aceita_linha_sem_marcador():
    itens = parse_todos("linha solta\n- linha marcada")
    assert [i.texto for i in itens] == ["linha solta", "linha marcada"]


def test_nivel_de_indentacao_satura_em_tres():
    itens = parse_todos("\t\t\t\t\titem bem fundo")
    assert itens[0].nivel == 3


def test_linha_vazia_apos_remover_marcador_e_descartada():
    itens = parse_todos("- \n- item real")
    assert [i.texto for i in itens] == ["item real"]
