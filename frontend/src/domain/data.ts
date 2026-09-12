/**
 * Conversão entre a data em ISO, que é o formato trafegado pela API, e o
 * brasileiro, que é o formato mostrado.
 *
 * Existe porque o `<input type="date">` nativo desenha a data na região do
 * navegador, não no `lang` da página: com o Chrome em inglês ele mostra
 * MM/DD/AAAA, e nenhum atributo ou CSS muda isso.
 */

/** `2026-09-03` vira `03/09/2026`. Entrada inválida vira string vazia. */
export function paraBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** `03/09/2026` vira `2026-09-03`. Data incompleta ou impossível vira `null`. */
export function paraISO(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br)
  if (!m) return null
  const [, dd, mm, aaaa] = m
  const iso = `${aaaa}-${mm}-${dd}`
  const d = new Date(`${iso}T12:00:00`)
  // Rejeita 31/02: o Date aceita e rola para março, então conferimos a volta.
  if (
    Number.isNaN(d.getTime()) ||
    d.getDate() !== Number(dd) ||
    d.getMonth() + 1 !== Number(mm)
  ) {
    return null
  }
  return iso
}

/** Deixa passar só dígito e insere as barras enquanto se digita. */
export function mascarar(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}
