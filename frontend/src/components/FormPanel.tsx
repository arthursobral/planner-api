import { X } from '@phosphor-icons/react'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Painel que abre acima da lista, nunca modal.
 *
 * Entra com o mesmo `rise` das outras seções: não é um quinto movimento, é a
 * animação de entrada aplicada a um bloco novo aparecendo.
 */
export function FormPanel({
  titulo,
  aberto,
  aoFechar,
  children,
}: {
  titulo: string
  aberto: boolean
  aoFechar: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLFormElement>(null)

  // `aoFechar` vem novo a cada render de quem usa o painel. Guardado em ref, ele
  // sai das dependencias dos efeitos abaixo. Sem isso o efeito de foco rerodava
  // a cada tecla e jogava o cursor de volta no primeiro campo.
  const fecharRef = useRef(aoFechar)
  fecharRef.current = aoFechar

  useEffect(() => {
    if (!aberto) return
    ref.current?.querySelector<HTMLElement>('input, textarea, select')?.focus()
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    const noEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharRef.current()
    }
    document.addEventListener('keydown', noEsc)
    return () => document.removeEventListener('keydown', noEsc)
  }, [aberto])

  if (!aberto) return null

  return (
    <form
      ref={ref}
      className="rise surface flex flex-col gap-5 rounded-[var(--radius-surface)] px-[22px] py-5"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[17px] font-medium tracking-[-0.2px] text-fg">{titulo}</h2>
        <button
          type="button"
          aria-label="Fechar formulário"
          onClick={aoFechar}
          className={estiloIcone}
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </form>
  )
}

/** Rótulo sempre acima do campo. Placeholder nunca faz papel de rótulo. */
export function Campo({
  rotulo,
  htmlFor,
  children,
}: {
  rotulo: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[13px] text-fg-muted">
        {rotulo}
      </label>
      {children}
    </div>
  )
}

/* Fundo OPACO, não rgba com alfa: a lista que o sistema desenha ao abrir um
   select usa a cor de fundo do próprio elemento, e com alfa ela sai lavada. */
export const estiloCampo =
  'w-full rounded-[var(--radius-control)] border border-line bg-[#0f1530] px-3 py-[10px] text-[15px] text-fg-body transition-[border-color,background-color] duration-150 placeholder:text-fg-muted/60 hover:border-line-strong'

/* Estados de botão: levanta 1px ao apontar, afunda ao apertar — a terceira
   das quatro animações aprovadas, aplicada aos controles. `enabled:` para o
   botão desabilitado não reagir. */
const base =
  'flex h-[42px] items-center gap-2 rounded-[var(--radius-control)] px-[18px] text-sm transition-[transform,background-color,border-color,filter] duration-150 disabled:cursor-not-allowed disabled:opacity-45 enabled:active:translate-y-0'

export const estiloPrimario = `${base} bg-linear-[135deg,var(--accent),var(--accent-alt)] font-semibold text-fg-on-accent enabled:hover:-translate-y-px enabled:hover:brightness-110 enabled:active:brightness-95`

export const estiloSecundario = `${base} border border-line bg-[rgba(120,160,230,0.07)] text-fg-secondary enabled:hover:-translate-y-px enabled:hover:border-line-strong enabled:hover:bg-[rgba(120,160,230,0.14)]`

/** Botão discreto de ação secundária dentro de uma lista (Adicionar, Anotar). */
export const estiloDiscreto =
  'flex h-[34px] items-center gap-[7px] rounded-[var(--radius-control-sm)] border border-dashed border-[rgba(120,160,230,0.28)] px-[13px] text-[13px] text-accent-soft transition-[transform,background-color,border-color] duration-150 hover:-translate-y-px hover:border-solid hover:border-accent hover:bg-[rgba(79,172,254,0.1)] active:translate-y-0'

/** Botão de ícone: arquivar, fechar. */
export const estiloIcone =
  'grid size-[30px] shrink-0 place-items-center rounded-[var(--radius-control-sm)] border border-transparent text-fg-muted transition-[background-color,border-color,color] duration-150 hover:border-line hover:bg-[rgba(120,160,230,0.1)] hover:text-fg-body'

/** Igual ao de ícone, mas para remoção: vira vermelho ao apontar. */
export const estiloIconePerigo =
  'grid size-[30px] shrink-0 place-items-center rounded-[var(--radius-control-sm)] border border-transparent text-fg-muted transition-[background-color,border-color,color] duration-150 hover:border-[rgba(255,107,107,0.4)] hover:bg-[rgba(255,107,107,0.12)] hover:text-high-soft'
