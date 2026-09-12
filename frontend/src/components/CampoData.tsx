import { CalendarBlank } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { mascarar, paraBR, paraISO } from '../domain/data'
import { estiloCampo } from './FormPanel'

/**
 * Campo de data em DD/MM/AAAA.
 *
 * O `<input type="date">` nativo desenha a data na **região do navegador**, não
 * no `lang` da página. Por isso o campo visível é texto, e o input nativo fica
 * escondido só para abrir o calendário do sistema no botão.
 *
 * O valor trafega sempre em ISO (`AAAA-MM-DD`), o formato que a API espera.
 */
export function CampoData({
  id,
  value,
  onChange,
  max,
  className = '',
}: {
  id: string
  value: string
  onChange: (iso: string) => void
  max?: string
  className?: string
}) {
  const [texto, setTexto] = useState(() => paraBR(value))
  const nativo = useRef<HTMLInputElement>(null)

  // Acompanha mudança vinda de fora (troca de item, reset do formulário).
  useEffect(() => {
    setTexto(paraBR(value))
  }, [value])

  function digitou(bruto: string) {
    const mascarado = mascarar(bruto)
    setTexto(mascarado)
    const iso = paraISO(mascarado)
    if (iso) onChange(iso)
  }

  function saiu() {
    // Data pela metade ou impossível volta para a última válida, em vez de
    // deixar o campo num estado que não corresponde ao que está gravado.
    if (!paraISO(texto)) setTexto(paraBR(value))
  }

  return (
    <span className="relative inline-flex items-center">
      <input
        id={id}
        inputMode="numeric"
        value={texto}
        onChange={(e) => digitou(e.target.value)}
        onBlur={saiu}
        placeholder="dd/mm/aaaa"
        maxLength={10}
        className={`${estiloCampo} num pr-9 ${className}`}
      />
      <button
        type="button"
        aria-label="Abrir calendário"
        onClick={() => nativo.current?.showPicker?.()}
        className="absolute right-[6px] grid size-[26px] place-items-center rounded-[var(--radius-control-sm)] text-fg-muted transition-colors duration-150 hover:bg-[rgba(120,160,230,0.12)] hover:text-fg-body"
      >
        <CalendarBlank size={15} />
      </button>
      {/* Escondido da vista, mas presente no layout: `display: none` impediria
          o `showPicker()` de abrir. */}
      <input
        ref={nativo}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute right-[6px] size-[26px] opacity-0"
      />
    </span>
  )
}
