/**
 * STUB — substituir pela tela real de Acompanhamentos.
 *
 * Contrato: nenhuma prop, busca seus próprios dados. Endpoints (ver
 * app/routers/acompanhamentos.py):
 *   GET    /acompanhamentos                    -> Acompanhamento[]
 *   POST   /acompanhamentos                    -> Acompanhamento (AcompanhamentoCriar: atividade, pessoa, observacoes?)
 *          "pessoa" é texto livre (datalist sugerindo GET /pessoas, mas
 *          aceita qualquer nome — gente de fora da equipe aparece nos dados reais)
 *   PATCH  /acompanhamentos/{id}/status        -> Acompanhamento ({ status })
 *   DELETE /acompanhamentos/{id}               -> 204
 *   POST   /acompanhamentos/{id}/restaurar     -> Acompanhamento
 *   DELETE /acompanhamentos/pessoa/{pessoa}    -> number[] (ids removidos em lote)
 *
 * Tipos em src/api/types.ts (Acompanhamento, StatusAcompanhamento).
 * Componentes prontos: src/components/{FormPanel,Select,DisplayStats,DesfazerBar,useRemocao}.
 * Ver o artboard "Acompanhamentos" no canvas de design aprovado (agrupado por
 * pessoa, avatar com iniciais, badge "equipe" quando pessoa_id_equipe existe).
 */
export function Acompanhamentos() {
  return <p className="text-fg-muted">Acompanhamentos — tela em construção.</p>
}
