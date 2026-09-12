import type { ReactNode } from 'react'

export interface Stat {
  rotulo: string
  valor: ReactNode
  sufixo?: string
  cor?: string
}

/**
 * A faixa de números da direção Vitrine: um número promovido a display por
 * tela, sem caixa nenhuma, separado por régua vertical de 1px.
 */
export function DisplayStats({ stats, atraso = 60 }: { stats: Stat[]; atraso?: number }) {
  return (
    <div
      className="rise flex flex-wrap items-center gap-x-11 gap-y-6"
      style={{ '--rise-delay': `${atraso}ms` } as React.CSSProperties}
    >
      {stats.map((stat, i) => (
        <div key={stat.rotulo} className="flex items-center gap-11">
          {i > 0 && <div className="h-[42px] w-px bg-[rgba(120,160,230,0.16)]" aria-hidden />}
          <div className="flex flex-col gap-1">
            <div className="text-[13px] text-fg-muted">{stat.rotulo}</div>
            <div className="flex items-baseline gap-[7px]">
              <span
                className="num text-[34px] leading-none font-semibold tracking-[-1px]"
                style={{ color: stat.cor ?? 'var(--fg)' }}
              >
                {stat.valor}
              </span>
              {stat.sufixo && <span className="text-[15px] text-fg-muted">{stat.sufixo}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
