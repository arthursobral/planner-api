"""Parser de lista colada. Portado de Planner-v2/src/domain/todo-parser.ts.

Reconhece `*`, `-`, `•` e `1.` como marcador de lista, checkbox `[ ]`/`[x]`, e
deduz o nível por indentação (1 tab ou 2 espaços por nível, saturando em 3).

Correção preservada da fonte: o checkbox só conta na posição de checkbox — testar
"[x]" contra a linha inteira (como o app original fazia) marcava como concluído
qualquer item cujo *texto* mencionasse "[x]" sem o usuário pedir.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_MARCADOR = re.compile(r"^([*\-•]|\d+\.)\s*")
_CHECKBOX = re.compile(r"^\[([ xX]?)\]\s*")
NIVEL_MAXIMO = 3


@dataclass
class TodoParseado:
    texto: str
    concluido: bool
    status: str
    nivel: int


def _nivel_da_indentacao(linha: str) -> int:
    indentacao = re.match(r"^[ \t]*", linha).group(0)
    tabs = indentacao.count("\t")
    # Tab tem precedência: quem indenta com tab não mistura com espaço.
    nivel = tabs if tabs > 0 else len(indentacao) // 2
    return min(nivel, NIVEL_MAXIMO)


def parse_todos(entrada: str, somente_marcados: bool = False) -> list[TodoParseado]:
    """`somente_marcados=True` só aceita linha com marcador/checkbox — usado pelas
    anotações de call, onde a maior parte do texto é narrativa e mandar toda linha
    para as tarefas inundaria a lista. Na lista de tarefas o padrão é permissivo,
    porque ali se cola uma lista de propósito."""
    itens: list[TodoParseado] = []

    for linha in entrada.split("\n"):
        conteudo = linha.strip()
        if not conteudo:
            continue

        nivel = _nivel_da_indentacao(linha)
        tem_marcador = bool(_MARCADOR.match(conteudo)) or bool(_CHECKBOX.match(conteudo))
        if somente_marcados and not tem_marcador:
            continue

        texto = _MARCADOR.sub("", conteudo, count=1)
        checkbox = _CHECKBOX.match(texto)
        concluido = checkbox.group(1).lower() == "x" if checkbox else False
        if checkbox:
            texto = texto[checkbox.end() :]
        texto = texto.strip()
        if not texto:
            continue

        itens.append(
            TodoParseado(
                texto=texto,
                concluido=concluido,
                status="concluido" if concluido else "todo",
                nivel=nivel,
            )
        )

    return itens
