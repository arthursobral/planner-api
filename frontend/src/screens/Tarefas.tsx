/**
 * STUB — substituir pela tela real de tarefas (Todos).
 *
 * Contrato: nenhuma prop, busca seus próprios dados. Endpoints (ver
 * app/routers/todos.py):
 *   GET    /todos                       -> Todo[]
 *   POST   /todos                       -> Todo[]  (TodoCriarLista: { texto, somente_marcados })
 *          texto é a lista colada com marcadores (*, -, 1., [ ]/[x]) — o
 *          parser do servidor separa em itens, indentação vira `nivel`.
 *   PATCH  /todos/{id}/status           -> Todo    ({ status })
 *   POST   /todos/{id}/alternar         -> Todo    (concluído <-> não concluído)
 *   DELETE /todos/{id}                  -> 204
 *   POST   /todos/{id}/restaurar        -> Todo
 *
 * Tipos em src/api/types.ts (Todo, StatusTodo).
 * Componentes prontos: src/components/{FormPanel,Select,DisplayStats,DesfazerBar,useRemocao}.
 * Ver o artboard "Tarefas" no canvas de design aprovado para o layout exato
 * (agrupado por status, barra de progresso em display, concluídos recolhidos).
 */
export function Tarefas() {
  return <p className="text-fg-muted">Tarefas — tela em construção.</p>
}
