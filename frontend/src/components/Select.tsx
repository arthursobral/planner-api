import { CaretDown } from '@phosphor-icons/react'
import type { SelectHTMLAttributes } from 'react'

/**
 * `<select>` nativo com seta própria.
 *
 * Nativo de propósito: teclado, leitor de tela e a lista do sistema continuam
 * funcionando de graça. O fundo precisa ser **opaco**: a lista que o sistema
 * desenha ao abrir usa a cor de fundo do próprio select, e com alfa ela sai
 * lavada.
 */
export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex min-w-0 items-center">
      <select
        {...props}
        className={`w-full cursor-pointer appearance-none pr-8 transition-[background-color,border-color] duration-150 ${className}`}
      >
        {children}
      </select>
      <CaretDown
        size={14}
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute right-[10px] opacity-70"
      />
    </span>
  )
}
