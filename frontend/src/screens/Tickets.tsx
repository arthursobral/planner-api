/**
 * STUB — substituir pela tela real de tickets (Atividades).
 *
 * Contrato: nenhuma prop, busca seus próprios dados. Endpoints (ver
 * app/routers/atividades.py):
 *   GET    /atividades?correntes=true|false     -> Atividade[]
 *   POST   /atividades                          -> Atividade  (AtividadeCriar: nome, prioridade, descricao?)
 *   PATCH  /atividades/{id}/status              -> Atividade  ({ status })
 *   PATCH  /atividades/{id}/prioridade          -> Atividade  ({ prioridade })
 *   POST   /atividades/{id}/arquivar            -> Atividade
 *   POST   /atividades/{id}/reabrir             -> Atividade
 *   DELETE /atividades/{id}                     -> 204        (só a partir do arquivo)
 *   POST   /atividades/{id}/restaurar           -> Atividade
 *
 * Tipos em src/api/types.ts (Atividade, Prioridade, StatusAtividade).
 * Helpers de idade em src/domain/aging.ts (corDaFaixa, proporcaoDaBarra) — os
 * campos dias_parado/faixa já vêm calculados pela API.
 * Componentes prontos: src/components/{FormPanel,Select,DisplayStats,DesfazerBar,useRemocao}.
 * Ver o artboard "Main" (Tickets) no canvas de design aprovado para o layout exato.
 */
export function Tickets() {
  return <p className="text-fg-muted">Tickets — tela em construção.</p>
}
