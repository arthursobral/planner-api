import { ArrowSquareOut, CaretDown, CaretRight, Plus, Trash } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { Reuniao, Todo } from '../api/types'
import { apiFetch } from '../api/client'
import { CampoData } from '../components/CampoData'
import { DesfazerBar } from '../components/DesfazerBar'
import { estiloCampo, estiloIconePerigo, estiloPrimario } from '../components/FormPanel'
import { useRemocao } from '../components/useRemocao'

/** Espera este tempo sem digitar antes de gravar (autosave). */
const ESPERA_MS = 900

export function Calls() {
  const [reunioes, setReunioes] = useState<Reuniao[] | null>(null)
  const [aberta, setAberta] = useState<number | null>(null)
  const { remocao, registrar, limpar } = useRemocao()

  useEffect(() => {
    void apiFetch<Reuniao[]>('/reunioes').then(setReunioes)
  }, [])

  if (!reunioes) return <Carregando />

  async function nova() {
    const criada = await apiFetch<Reuniao>('/reunioes', {
      method: 'POST',
      body: JSON.stringify({ titulo: '', em: hojeISO() }),
    })
    setReunioes((prev) => [criada, ...(prev ?? [])])
    setAberta(criada.id)
  }

  function remover(r: Reuniao) {
    setReunioes((prev) => prev?.filter((x) => x.id !== r.id) ?? prev)
    if (aberta === r.id) setAberta(null)
    void apiFetch(`/reunioes/${r.id}`, { method: 'DELETE' })
    registrar(`"${r.titulo || 'Call sem título'}" removida`, () => {
      void apiFetch<Reuniao>(`/reunioes/${r.id}/restaurar`, { method: 'POST' }).then((restaurada) => {
        setReunioes((prev) => [...(prev ?? []), restaurada].sort(ordenar))
      })
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rise flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[15px] text-fg-muted">Calls</div>
          <h1 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.8px] text-fg">
            {titulo(reunioes.length)}
          </h1>
        </div>
        <button type="button" onClick={() => void nova()} className={estiloPrimario}>
          <Plus size={16} weight="bold" />
          Nova call
        </button>
      </div>

      {reunioes.length === 0 ? (
        <Vazio />
      ) : (
        <ul className="flex list-none flex-col gap-[11px] p-0">
          {reunioes.map((r, i) => (
            <Item
              key={r.id}
              reuniao={r}
              aberta={aberta === r.id}
              aoAlternar={() => setAberta(aberta === r.id ? null : r.id)}
              aoRemover={remover}
              atraso={80 + i * 50}
            />
          ))}
        </ul>
      )}

      <DesfazerBar remocao={remocao} aoFechar={limpar} />
    </div>
  )
}

function Item({
  reuniao,
  aberta,
  aoAlternar,
  aoRemover,
  atraso,
}: {
  reuniao: Reuniao
  aberta: boolean
  aoAlternar: () => void
  aoRemover: (r: Reuniao) => void
  atraso: number
}) {
  const [titulo, setTitulo] = useState(reuniao.titulo)
  const [texto, setTexto] = useState(reuniao.texto)
  const [em, setEm] = useState(reuniao.em)
  const [salvo, setSalvo] = useState(true)
  const [enviadas, setEnviadas] = useState<number | null>(null)
  const primeira = useRef(true)

  // Salva sozinho depois que você para de digitar. Durante uma call ninguém vai
  // clicar em "salvar", e perder a anotação de uma reunião é o pior desfecho
  // possível para esta tela.
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      return
    }
    setSalvo(false)
    const t = setTimeout(() => {
      void apiFetch<Reuniao>(`/reunioes/${reuniao.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ titulo, texto, em }),
      }).then(() => setSalvo(true))
    }, ESPERA_MS)
    return () => clearTimeout(t)
  }, [titulo, texto, em, reuniao.id])

  async function enviarParaTarefas() {
    const todos = await apiFetch<Todo[]>(`/reunioes/${reuniao.id}/enviar-tarefas`, {
      method: 'POST',
      body: JSON.stringify({ somente_marcados: true }),
    })
    setEnviadas(todos.length)
    setTimeout(() => setEnviadas(null), 3000)
  }

  return (
    <li
      className="rise surface flex flex-col rounded-[var(--radius-surface)]"
      style={{ '--rise-delay': `${atraso}ms` } as React.CSSProperties}
    >
      <div className="flex items-center gap-3 px-[22px] py-4">
        <button
          type="button"
          aria-expanded={aberta}
          aria-label={`${aberta ? 'Recolher' : 'Abrir'} ${titulo || 'call'}`}
          onClick={aoAlternar}
          className="grid size-[26px] shrink-0 place-items-center rounded-[var(--radius-control-sm)] text-fg-muted transition-colors duration-150 hover:bg-[rgba(120,160,230,0.1)] hover:text-fg-body"
        >
          {aberta ? (
            <CaretDown size={15} weight="bold" />
          ) : (
            <CaretRight size={15} weight="bold" />
          )}
        </button>

        <span className="num w-[74px] shrink-0 text-[13px] text-fg-muted">{formatarCurta(em)}</span>

        {aberta ? (
          <>
            <label className="sr-only" htmlFor={`titulo-${reuniao.id}`}>
              Título da call
            </label>
            <input
              id={`titulo-${reuniao.id}`}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Call CIBC sobre o fluxo de aprovação"
              className={`${estiloCampo} min-w-0 flex-1`}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={aoAlternar}
            className="min-w-0 flex-1 truncate text-left text-[16px] font-medium text-fg"
          >
            {titulo || 'Call sem título'}
            {texto.trim() && (
              <span className="ml-3 text-sm font-normal text-fg-muted">
                {texto.trim().split('\n')[0].slice(0, 60)}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          aria-label={`Remover ${titulo || 'call'}`}
          onClick={() => aoRemover(reuniao)}
          className={estiloIconePerigo}
        >
          <Trash size={15} />
        </button>
      </div>

      {aberta && (
        <div className="flex flex-col gap-3 border-t border-line-faint px-[22px] pt-4 pb-[18px]">
          <label className="sr-only" htmlFor={`texto-${reuniao.id}`}>
            Anotações da call
          </label>
          <textarea
            id={`texto-${reuniao.id}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={12}
            placeholder={`O que foi decidido, quem ficou de fazer o quê.

Linha começando com * ou - vira tarefa:
* [ ] mandar o rascunho para o cliente`}
            className={`${estiloCampo} resize-y leading-[1.65]`}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label htmlFor={`data-${reuniao.id}`} className="text-[13px] text-fg-muted">
                Data
              </label>
              <CampoData id={`data-${reuniao.id}`} value={em} onChange={setEm} className="w-[150px]" />
              <span className="text-[13px] text-fg-muted">{salvo ? 'salvo' : 'salvando...'}</span>
            </div>

            {temItens(texto) && (
              <button
                type="button"
                onClick={() => void enviarParaTarefas()}
                className="flex h-[34px] items-center gap-[7px] rounded-[var(--radius-control-sm)] border border-[rgba(79,172,254,0.35)] bg-[rgba(79,172,254,0.1)] px-[13px] text-[13px] text-accent-soft transition-[transform,background-color] duration-150 hover:-translate-y-px hover:bg-[rgba(79,172,254,0.18)] active:translate-y-0"
              >
                <ArrowSquareOut size={14} />
                {enviadas !== null
                  ? `${enviadas} ${enviadas === 1 ? 'item enviado' : 'itens enviados'}`
                  : 'Mandar itens para Tarefas'}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

/** `2026-09-08` -> `08 set` (hoje, sem depender de fuso: meio-dia evita virar o dia ao converter). */
function formatarCurta(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/** Data local de hoje em ISO (`AAAA-MM-DD`) — `toISOString()` usa UTC e erraria o dia perto da meia-noite. */
function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Mesma ordenação do backend (`em` desc, `criado_em` desc) — datas ISO comparam como string igual a cronologia. */
function ordenar(a: Reuniao, b: Reuniao): number {
  return b.em.localeCompare(a.em) || b.criado_em.localeCompare(a.criado_em)
}

/** Heurística no cliente só para decidir se mostra o botão — o parser real roda no servidor. */
function temItens(texto: string): boolean {
  return texto.split('\n').some((linha) => /^\s*(\*|-|\[)/.test(linha))
}

function titulo(n: number): string {
  if (n === 0) return 'Nenhuma call anotada'
  return n === 1 ? 'Uma call anotada' : `${n} calls anotadas`
}

function Carregando() {
  return (
    <div className="flex flex-col gap-[11px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="surface h-[58px] animate-pulse rounded-[var(--radius-surface)]"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}

function Vazio() {
  return (
    <div className="surface flex flex-col items-start gap-3 rounded-[var(--radius-surface)] px-[22px] py-8">
      <div className="text-[17px] font-medium text-fg">Comece na próxima reunião</div>
      <div className="max-w-[58ch] text-sm text-fg-muted">
        Abra uma antes da reunião começar e escreva enquanto ela acontece. O texto salva sozinho, e
        as linhas que você marcar como item viram tarefa depois com um clique.
      </div>
    </div>
  )
}
