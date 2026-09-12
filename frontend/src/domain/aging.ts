/**
 * `dias_parado` e `faixa` já vêm calculados pela API (ver app/domain/aging.py) —
 * o que sobra pro cliente é o que depende do conjunto inteiro da lista.
 */
export type FaixaIdade = 'em-dia' | 'atencao' | 'parado'

/** Cor semântica da faixa, como token CSS. */
export function corDaFaixa(faixa: string): string {
  if (faixa === 'parado') return 'var(--high-soft)'
  if (faixa === 'atencao') return 'var(--medium-soft)'
  return 'var(--fg-body)'
}

/**
 * Largura relativa da barra de tempo parado, entre 0 e 1, proporcional ao item
 * mais antigo da lista. É comparação dentro do conjunto, não escala absoluta:
 * uma barra cheia significa "o mais parado de todos", não "atrasado".
 */
export function proporcaoDaBarra(dias: number, maiorDias: number): number {
  if (maiorDias <= 0) return 0
  return Math.max(0.06, dias / maiorDias)
}
