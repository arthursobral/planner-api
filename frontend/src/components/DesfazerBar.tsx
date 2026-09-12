import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

const SEGUNDOS = 8

export interface Remocao {
  /** Chave nova a cada remoção, para reiniciar o contador. */
  chave: number
  mensagem: string
  desfazer: () => void
}

/**
 * Barra de desfazer, no lugar de uma caixa de confirmação. A remoção já
 * aconteceu no servidor (soft-delete via `removido_em`); "Desfazer" chama o
 * endpoint `/restaurar` correspondente antes da janela fechar.
 */
export function DesfazerBar({
  remocao,
  aoFechar,
}: {
  remocao: Remocao | null
  aoFechar: () => void
}) {
  const chave = remocao?.chave
  const [restante, setRestante] = useState(SEGUNDOS)

  useEffect(() => {
    if (chave === undefined) return
    setRestante(SEGUNDOS)
    const tique = setInterval(() => setRestante((r) => r - 1), 1000)
    const fim = setTimeout(aoFechar, SEGUNDOS * 1000)
    return () => {
      clearInterval(tique)
      clearTimeout(fim)
    }
  }, [chave, aoFechar])

  if (!remocao) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="rise surface fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-[var(--radius-surface)] py-3 pr-3 pl-5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      <span className="text-sm text-fg-body">{remocao.mensagem}</span>
      <button
        type="button"
        onClick={() => {
          remocao.desfazer()
          aoFechar()
        }}
        className="flex h-[34px] items-center gap-2 rounded-[var(--radius-control-sm)] border border-[rgba(79,172,254,0.35)] bg-[rgba(79,172,254,0.12)] px-3 text-[13px] font-medium text-accent-soft"
      >
        <ArrowCounterClockwise size={14} weight="bold" />
        Desfazer
        <span className="num text-fg-muted">{Math.max(0, restante)}s</span>
      </button>
    </div>
  )
}
