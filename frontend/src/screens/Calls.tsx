/**
 * STUB — substituir pela tela real de Calls (Reunioes).
 *
 * Contrato: nenhuma prop, busca seus próprios dados. Endpoints (ver
 * app/routers/reunioes.py):
 *   GET    /reunioes                        -> Reuniao[]
 *   POST   /reunioes                        -> Reuniao (ReuniaoCriar: titulo, em — cria vazia)
 *   PATCH  /reunioes/{id}                   -> Reuniao (ReuniaoAtualizar: titulo?, em?, texto?)
 *          Autosave: chamar ~900ms depois que o usuário parar de digitar
 *          (mesmo padrão do CallNotes.tsx do Planner v2). Não gera evento de
 *          auditoria de propósito — não travar a UI esperando a resposta.
 *   DELETE /reunioes/{id}                   -> 204
 *   POST   /reunioes/{id}/restaurar         -> Reuniao
 *   POST   /reunioes/{id}/enviar-tarefas    -> Todo[] (ReuniaoEnviarTarefas: { somente_marcados })
 *          Manda linhas marcadas (*, -, [ ]) do texto da call para Tarefas.
 *
 * Tipos em src/api/types.ts (Reuniao).
 * Campo de data: src/components/CampoData.tsx (nunca <input type="date"> puro).
 * Ver o artboard "Calls" no canvas de design aprovado (accordion — uma call
 * expandida por vez, textarea de anotações, indicador "salvo"/"salvando...").
 */
export function Calls() {
  return <p className="text-fg-muted">Calls — tela em construção.</p>
}
