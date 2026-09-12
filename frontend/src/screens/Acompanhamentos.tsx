import { Plus, Trash } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import type { Acompanhamento, Pessoa, StatusAcompanhamento } from '../api/types'
import { DesfazerBar } from '../components/DesfazerBar'
import { DisplayStats, type Stat } from '../components/DisplayStats'
import {
  Campo,
  FormPanel,
  estiloCampo,
  estiloIconePerigo,
  estiloPrimario,
  estiloSecundario,
} from '../components/FormPanel'
import { Select } from '../components/Select'
import { useRemocao } from '../components/useRemocao'
import { corDaFaixa } from '../domain/aging'

const STATUSES: StatusAcompanhamento[] = ['Em Andamento', 'Pausado', 'Finalizado']

// Mesmas faixas de app/domain/aging.py (8 / 22 dias) — Acompanhamento não tem
// `dias_parado`/`faixa` pré-calculados pela API, então a conta é feita aqui.
const DIAS_ATENCAO = 8
const DIAS_PARADO = 22

/** O acento cheio é reservado ao estado que está andando agora. */
const ESTILO_STATUS: Record<StatusAcompanhamento, string> = {
  'Em Andamento':
    'bg-linear-[135deg,var(--accent),var(--accent-alt)] border-0 text-fg-on-accent font-semibold',
  Pausado: 'bg-[rgba(120,160,230,0.1)] border border-[rgba(120,160,230,0.18)] text-fg-secondary',
  Finalizado: 'bg-[rgba(76,175,80,0.12)] border border-[rgba(76,175,80,0.35)] text-done-soft',
}

export function Acompanhamentos() {
  const [itens, setItens] = useState<Acompanhamento[] | null>(null)
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null)
  const { remocao, registrar, limpar } = useRemocao()
  const [formAberto, setFormAberto] = useState(false)
  const [atividade, setAtividade] = useState('')
  const [pessoa, setPessoa] = useState('')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    void apiFetch<Acompanhamento[]>('/acompanhamentos').then(setItens)
    void apiFetch<Pessoa[]>('/pessoas').then(setPessoas)
  }, [])

  if (!itens || !pessoas) return <Carregando />

  async function submeter() {
    if (!atividade.trim() || !pessoa.trim()) return
    const criado = await apiFetch<Acompanhamento>('/acompanhamentos', {
      method: 'POST',
      body: JSON.stringify({ atividade, pessoa, observacoes: observacoes.trim() || null }),
    })
    setItens((atual) => [...(atual ?? []), criado])
    setAtividade('')
    setPessoa('')
    setObservacoes('')
    setFormAberto(false)
  }

  function mudarStatus(id: number, status: StatusAcompanhamento) {
    void apiFetch<Acompanhamento>(`/acompanhamentos/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then((atualizado) => setItens((atual) => atual?.map((i) => (i.id === id ? atualizado : i)) ?? null))
  }

  function removerItem(item: Acompanhamento) {
    setItens((atual) => atual?.filter((i) => i.id !== item.id) ?? null)
    void apiFetch(`/acompanhamentos/${item.id}`, { method: 'DELETE' })
    registrar(`"${item.atividade}" removido`, () => {
      void apiFetch<Acompanhamento>(`/acompanhamentos/${item.id}/restaurar`, {
        method: 'POST',
      }).then((restaurado) => setItens((atual) => [...(atual ?? []), restaurado]))
    })
  }

  const grupos = agruparPorPessoa(itens)
  const abertos = itens.filter((i) => i.status !== 'Finalizado')
  const esperas = abertos.map((i) => diasDesde(i.criado_em))
  const maiorEspera = esperas.length > 0 ? Math.max(...esperas) : 0
  const pausados = itens.filter((i) => i.status === 'Pausado').length
  const foraDaEquipe = new Set(
    itens.filter((i) => i.pessoa_id_equipe === null).map((i) => i.pessoa),
  ).size

  const stats: Stat[] = [
    {
      rotulo: 'Esperando há mais tempo',
      valor: maiorEspera,
      sufixo: 'dias',
      cor: corDaFaixa(faixaIdade(maiorEspera)),
    },
    {
      rotulo: 'Pausados',
      valor: pausados,
      cor: pausados > 0 ? 'var(--medium-soft)' : undefined,
    },
    {
      rotulo: 'Fora da equipe',
      valor: foraDaEquipe,
      sufixo: foraDaEquipe === 1 ? 'pessoa' : 'pessoas',
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="rise flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[15px] text-fg-muted">Acompanhando</div>
          <h1 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.8px] text-fg">
            {titulo(itens.length, grupos.length)}
          </h1>
        </div>
        <button type="button" onClick={() => setFormAberto(true)} className={estiloPrimario}>
          <Plus size={16} weight="bold" />
          Novo acompanhamento
        </button>
      </div>

      <DisplayStats stats={stats} />

      <FormPanel
        titulo="Novo acompanhamento"
        aberto={formAberto}
        aoFechar={() => setFormAberto(false)}
      >
        <div className="flex flex-wrap gap-4">
          <Campo rotulo="O que você está acompanhando" htmlFor="novo-acomp-atividade">
            <input
              id="novo-acomp-atividade"
              value={atividade}
              onChange={(e) => setAtividade(e.target.value)}
              placeholder="Revisão do fluxo de aprovação"
              className={estiloCampo}
            />
          </Campo>
          <Campo rotulo="Com quem" htmlFor="novo-acomp-pessoa">
            {/* Texto livre e nao um select: acompanhamento e trabalho com
                qualquer pessoa, dentro ou fora da equipe. A lista `datalist`
                sugere a equipe sem impedir um nome de fora. */}
            <input
              id="novo-acomp-pessoa"
              list="equipe-sugestoes"
              value={pessoa}
              onChange={(e) => setPessoa(e.target.value)}
              placeholder="Nome de quem está com isso"
              className={estiloCampo}
            />
            <datalist id="equipe-sugestoes">
              {pessoas.map((p) => (
                <option key={p.id} value={p.nome} />
              ))}
            </datalist>
          </Campo>
        </div>
        <Campo rotulo="Observações (opcional)" htmlFor="novo-acomp-obs">
          <textarea
            id="novo-acomp-obs"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
            className={estiloCampo}
          />
        </Campo>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!atividade.trim() || !pessoa.trim()}
            onClick={() => void submeter()}
            className={estiloPrimario}
          >
            Acompanhar
          </button>
          <button type="button" onClick={() => setFormAberto(false)} className={estiloSecundario}>
            Cancelar
          </button>
        </div>
      </FormPanel>

      {grupos.length === 0 ? (
        <Vazio />
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map((grupo, gi) => (
            <section
              key={grupo.pessoa}
              className="rise flex flex-col gap-[11px]"
              style={{ '--rise-delay': `${120 + gi * 60}ms` } as React.CSSProperties}
            >
              <div className="flex items-center gap-3 pl-[2px]">
                <span
                  className={`grid size-[30px] place-items-center rounded-full border text-xs font-semibold ${
                    grupo.equipe
                      ? 'border-[rgba(79,172,254,0.35)] bg-linear-[135deg,rgba(79,172,254,0.3),rgba(0,242,254,0.15)] text-accent-soft'
                      : 'border-[rgba(120,160,230,0.22)] bg-[rgba(120,160,230,0.1)] text-fg-secondary'
                  }`}
                  aria-hidden
                >
                  {iniciais(grupo.pessoa)}
                </span>
                <h2 className="text-base font-medium text-fg">{grupo.pessoa}</h2>
                {grupo.equipe && (
                  <span className="rounded-[var(--radius-pill)] border border-[rgba(79,172,254,0.25)] bg-[rgba(79,172,254,0.12)] px-[9px] py-[3px] text-xs text-accent-soft">
                    equipe
                  </span>
                )}
              </div>

              <ul className="flex list-none flex-col gap-[11px] p-0">
                {grupo.itens.map((item) => (
                  <Item
                    key={item.id}
                    item={item}
                    aoMudarStatus={mudarStatus}
                    aoRemover={removerItem}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <DesfazerBar remocao={remocao} aoFechar={limpar} />
    </div>
  )
}

function Item({
  item,
  aoMudarStatus,
  aoRemover,
}: {
  item: Acompanhamento
  aoMudarStatus: (id: number, status: StatusAcompanhamento) => void
  aoRemover: (item: Acompanhamento) => void
}) {
  const dias = diasDesde(item.criado_em)
  const finalizado = item.status === 'Finalizado'
  const cor = finalizado ? 'var(--fg-muted)' : corDaFaixa(faixaIdade(dias))

  return (
    <li
      className={`lift flex flex-wrap items-center justify-between gap-6 rounded-[var(--radius-surface)] px-[22px] py-[18px] ${
        finalizado ? 'border border-line-faint opacity-60' : 'surface'
      }`}
    >
      <div className="flex min-w-0 flex-col gap-[5px]">
        <span
          className={`text-base font-medium tracking-[-0.2px] ${
            finalizado ? 'text-fg-secondary line-through' : 'text-fg'
          }`}
        >
          {item.atividade}
        </span>
        {item.observacoes && <span className="text-sm text-fg-muted">{item.observacoes}</span>}
      </div>

      <div className="flex shrink-0 items-center gap-[14px]">
        {!finalizado && (
          <div className="flex flex-col items-end gap-px">
            <span className="num text-xl leading-none font-semibold" style={{ color: cor }}>
              {dias}d
            </span>
            <span className="text-[11px] text-fg-muted">esperando</span>
          </div>
        )}
        {/* O seletor É a pílula: ter os dois repetia a mesma informação. */}
        <label className="sr-only" htmlFor={`acomp-${item.id}`}>
          Status de {item.atividade}
        </label>
        <Select
          id={`acomp-${item.id}`}
          value={item.status}
          onChange={(e) => aoMudarStatus(item.id, e.target.value as StatusAcompanhamento)}
          className={`h-[30px] cursor-pointer rounded-[var(--radius-pill)] px-3 text-[13px] ${ESTILO_STATUS[item.status]}`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <button
          type="button"
          aria-label={`Remover ${item.atividade}`}
          onClick={() => aoRemover(item)}
          className={estiloIconePerigo}
        >
          <Trash size={15} />
        </button>
      </div>
    </li>
  )
}

interface Grupo {
  pessoa: string
  equipe: boolean
  itens: Acompanhamento[]
}

function agruparPorPessoa(itens: Acompanhamento[]): Grupo[] {
  const mapa = new Map<string, Grupo>()
  for (const item of itens) {
    const existente = mapa.get(item.pessoa)
    if (existente) {
      existente.itens.push(item)
      if (item.pessoa_id_equipe !== null) existente.equipe = true
    } else {
      mapa.set(item.pessoa, {
        pessoa: item.pessoa,
        equipe: item.pessoa_id_equipe !== null,
        itens: [item],
      })
    }
  }
  // Quem tem item aberto há mais tempo aparece primeiro.
  return [...mapa.values()].sort((a, b) => esperaMaxima(b) - esperaMaxima(a))
}

function esperaMaxima(grupo: Grupo): number {
  const abertos = grupo.itens.filter((i) => i.status !== 'Finalizado')
  if (abertos.length === 0) return -1
  return Math.max(...abertos.map((i) => diasDesde(i.criado_em)))
}

function diasDesde(iso: string): number {
  const inicio = new Date(iso)
  inicio.setHours(0, 0, 0, 0)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((hoje.getTime() - inicio.getTime()) / 86_400_000))
}

function faixaIdade(dias: number): string {
  if (dias >= DIAS_PARADO) return 'parado'
  if (dias >= DIAS_ATENCAO) return 'atencao'
  return 'em-dia'
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function titulo(itens: number, pessoas: number): string {
  if (itens === 0) return 'Nada sendo acompanhado'
  const parteItens = itens === 1 ? 'Um item' : `${itens} itens`
  const partePessoas = pessoas === 1 ? 'uma pessoa' : `${pessoas} pessoas`
  return `${parteItens} com ${partePessoas}`
}

function Carregando() {
  return (
    <div className="flex flex-col gap-[11px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="surface h-[76px] animate-pulse rounded-[var(--radius-surface)]"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}

function Vazio() {
  return (
    <div className="surface flex flex-col items-start gap-3 rounded-[var(--radius-surface)] px-[22px] py-8">
      <div className="text-[17px] font-medium text-fg">Nada sendo acompanhado</div>
      <div className="max-w-[52ch] text-sm text-fg-muted">
        Registre o que você está cobrando de outra pessoa, dentro ou fora da equipe.
      </div>
    </div>
  )
}
