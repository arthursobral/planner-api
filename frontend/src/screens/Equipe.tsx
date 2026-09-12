/**
 * STUB — substituir pela tela real de Equipe (pontos de avaliação + diário).
 *
 * Contrato: nenhuma prop, busca seus próprios dados. Gerencia internamente:
 *   - a pessoa selecionada (pills no topo, ver GET /pessoas -> Pessoa[])
 *   - o toggle para a tela de Pauta (já importada abaixo — não mudar a
 *     assinatura de <Pauta pessoa aoVoltar />, o componente Pauta é de um
 *     outro agent e espera exatamente essas duas props)
 *
 * Endpoints adicionais (ver app/routers/pontos.py e app/routers/anotacoes.py):
 *   GET    /pontos?pessoa_id={id}          -> Ponto[]
 *   POST   /pontos                         -> Ponto   (PontoCriar: pessoa_id, tipo, texto, grau)
 *   POST   /pontos/{id}/evoluir            -> Ponto   (só ponto negativo ainda não Evoluido)
 *   DELETE /pontos/{id}                    -> 204
 *   POST   /pontos/{id}/restaurar          -> Ponto
 *   GET    /anotacoes?pessoa_id={id}       -> Anotacao[]
 *   POST   /anotacoes                      -> Anotacao (AnotacaoCriar: pessoa_id, texto, em)
 *   DELETE /anotacoes/{id}                 -> 204
 *   POST   /anotacoes/{id}/restaurar       -> Anotacao
 *
 * Tipos em src/api/types.ts (Pessoa, Ponto, Anotacao, TipoPonto, GrauPositivo, GrauNegativo).
 * Campo de data: src/components/CampoData.tsx (nunca <input type="date"> puro).
 * Ver os artboards "Equipe" e "Pauta" no canvas de design aprovado.
 */
import { useState } from 'react'
import type { Pessoa } from '../api/types'
import { Pauta } from './Pauta'

export function Equipe() {
  const [pessoaEmPauta, setPessoaEmPauta] = useState<Pessoa | null>(null)

  if (pessoaEmPauta) {
    return <Pauta pessoa={pessoaEmPauta} aoVoltar={() => setPessoaEmPauta(null)} />
  }

  return <p className="text-fg-muted">Equipe — tela em construção.</p>
}
