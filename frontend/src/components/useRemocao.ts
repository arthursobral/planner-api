import { useCallback, useState } from 'react'
import type { Remocao } from './DesfazerBar'

/**
 * Estado do desfazer, com a chave que reinicia o contador a cada remoção.
 *
 * `registrar` e `limpar` são estáveis de propósito: `limpar` entra nas
 * dependências do efeito da barra, e uma função nova a cada render reiniciaria
 * o contador de 8 segundos sem parar.
 */
export function useRemocao() {
  const [remocao, setRemocao] = useState<Remocao | null>(null)
  const registrar = useCallback(
    (mensagem: string, desfazer: () => void) =>
      setRemocao({ chave: Date.now(), mensagem, desfazer }),
    [],
  )
  const limpar = useCallback(() => setRemocao(null), [])
  return { remocao, registrar, limpar }
}
