/**
 * STUB — substituir pela tela real da pauta de 1:1.
 *
 * Contrato FIXO (não mudar a assinatura — o componente Equipe já importa e
 * renderiza este componente com essas props exatas):
 *   <Pauta pessoa={pessoaSelecionada} aoVoltar={() => ...} />
 *
 * Endpoints (ver app/routers/pauta.py):
 *   GET /pessoas/{id}/pauta            -> Pauta (ver src/api/types.ts)
 *   GET /pessoas/{id}/pauta/markdown   -> text/markdown (para "Copiar em Markdown")
 *   POST /pessoas/{id}/1a1             -> Pessoa (registra "último 1:1 = agora";
 *                                          usado pelo botão "Registrar como feito")
 *
 * Ver o artboard "Pauta" no canvas de design aprovado para o layout exato
 * (cabeçalho com nome/tempo de casa/data do último 1:1, seções "Desde a
 * última conversa", "A trabalhar", "Evoluiu", "Pontos fortes").
 */
import type { Pessoa } from '../api/types'

export function Pauta({ pessoa, aoVoltar }: { pessoa: Pessoa; aoVoltar: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={aoVoltar} className="self-start text-fg-muted">
        ← Voltar
      </button>
      <p className="text-fg-muted">Pauta de {pessoa.nome} — tela em construção.</p>
    </div>
  )
}
