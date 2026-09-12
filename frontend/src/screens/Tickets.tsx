import { Archive, ArrowLeft, ArrowUUpLeft, Plus, Trash } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import type { Atividade, Prioridade, StatusAtividade } from '../api/types'
import { DisplayStats, type Stat } from '../components/DisplayStats'
import { DesfazerBar } from '../components/DesfazerBar'
import { useRemocao } from '../components/useRemocao'
import {
  Campo,
  FormPanel,
  estiloCampo,
  estiloIcone,
  estiloIconePerigo,
  estiloPrimario,
  estiloSecundario,
} from '../components/FormPanel'
import { Select } from '../components/Select'
import { corDaFaixa, proporcaoDaBarra } from '../domain/aging'

const PRIORIDADES: Prioridade[] = ['Alta', 'Média', 'Baixa']
const STATUS_ATIVIDADE: StatusAtividade[] = ['Pendente', 'Em Andamento', 'Concluída']

/** O acento cheio é reservado ao estado que está andando agora. */
const ESTILO_STATUS: Record<StatusAtividade, string> = {
  Pendente:
    'bg-[rgba(120,160,230,0.1)] border border-[rgba(120,160,230,0.18)] text-fg-secondary',
  'Em Andamento':
    'bg-linear-[135deg,var(--accent),var(--accent-alt)] border-0 text-fg-on-accent font-semibold',
  Concluída: 'bg-[rgba(76,175,80,0.12)] border border-[rgba(76,175,80,0.35)] text-done-soft',
}

const COR_PRIORIDADE: Record<Prioridade, string> = {
  Alta: 'var(--high)',
  Média: 'var(--medium)',
  Baixa: 'var(--low)',
}

export function Tickets() {
  const [vendoArquivo, setVendoArquivo] = useState(false)
  const [atividades, setAtividades] = useState<Atividade[] | undefined>(undefined)
  const [formAberto, setFormAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('Média')
  const [descricao, setDescricao] = useState('')
  const { remocao, registrar, limpar } = useRemocao()

  async function recarregar(correntes: boolean) {
    setAtividades(undefined)
    const dados = await apiFetch<Atividade[]>(`/atividades?correntes=${correntes}`)
    setAtividades(dados)
  }

  useEffect(() => {
    void recarregar(!vendoArquivo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendoArquivo])

  const carregando = atividades === undefined

  async function atualizarItem(id: number, patch: (a: Atividade) => Promise<Atividade>) {
    const atual = (atividades ?? []).find((a) => a.id === id)
    if (!atual) return
    const atualizada = await patch(atual)
    setAtividades((lista) => lista?.map((a) => (a.id === id ? atualizada : a)))
  }

  function removerItem(atividade: Atividade) {
    setAtividades((lista) => lista?.filter((a) => a.id !== atividade.id))
    void apiFetch(`/atividades/${atividade.id}`, { method: 'DELETE' })
    registrar(`"${atividade.nome}" removido`, () => {
      void apiFetch<Atividade>(`/atividades/${atividade.id}/restaurar`, { method: 'POST' }).then(
        (a) => setAtividades((lista) => [...(lista ?? []), a]),
      )
    })
  }

  async function submeter() {
    if (!nome.trim()) return
    const criada = await apiFetch<Atividade>('/atividades', {
      method: 'POST',
      body: JSON.stringify({ nome, prioridade, descricao: descricao || undefined }),
    })
    setAtividades((lista) => [...(lista ?? []), criada])
    setNome('')
    setPrioridade('Média')
    setDescricao('')
    setFormAberto(false)
  }

  // Mais parado primeiro: é a informação que o Planner original nunca mostrou.
  const ordenadas = [...(atividades ?? [])].sort((a, b) => b.dias_parado - a.dias_parado)
  const maiorIdade = ordenadas.length > 0 ? Math.max(...ordenadas.map((a) => a.dias_parado)) : 0
  const media =
    ordenadas.length > 0
      ? Math.round(ordenadas.reduce((s, a) => s + a.dias_parado, 0) / ordenadas.length)
      : 0

  const stats: Stat[] = [
    {
      rotulo: 'Parado há mais tempo',
      valor: maiorIdade,
      sufixo: 'dias',
      cor: corDaFaixa(ordenadas[0]?.faixa ?? 'em-dia'),
    },
    { rotulo: 'Média em aberto', valor: media, sufixo: 'dias' },
    { rotulo: 'Abertos agora', valor: ordenadas.length },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="rise flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[15px] text-fg-muted">
            {vendoArquivo ? 'Arquivo' : 'Meus tickets'}
          </div>
          <h1 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.8px] text-fg">
            {carregando
              ? ' '
              : vendoArquivo
                ? tituloDoArquivo(ordenadas.length)
                : tituloDaCarga(ordenadas.length)}
          </h1>
        </div>
        {vendoArquivo ? (
          <button
            type="button"
            onClick={() => setVendoArquivo(false)}
            className={estiloSecundario}
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar aos abertos
          </button>
        ) : (
          <button type="button" onClick={() => setFormAberto(true)} className={estiloPrimario}>
            <Plus size={16} weight="bold" />
            Novo ticket
          </button>
        )}
      </div>

      {!vendoArquivo && !carregando && <DisplayStats stats={stats} />}

      {!vendoArquivo && (
        <FormPanel titulo="Novo ticket" aberto={formAberto} aoFechar={() => setFormAberto(false)}>
          <div className="flex flex-wrap gap-4">
            <Campo rotulo="Nome do ticket" htmlFor="novo-nome">
              <input
                id="novo-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Revisão de metadados do lote de agosto"
                className={estiloCampo}
              />
            </Campo>
            <div className="flex w-[160px] flex-col gap-2">
              <label htmlFor="nova-prioridade" className="text-[13px] text-fg-muted">
                Prioridade
              </label>
              <Select
                id="nova-prioridade"
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as Prioridade)}
                className={estiloCampo}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Campo rotulo="Descrição (opcional)" htmlFor="nova-descricao">
            <textarea
              id="nova-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className={estiloCampo}
            />
          </Campo>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!nome.trim()}
              onClick={() => void submeter()}
              className={estiloPrimario}
            >
              Abrir ticket
            </button>
            <button type="button" onClick={() => setFormAberto(false)} className={estiloSecundario}>
              Cancelar
            </button>
          </div>
        </FormPanel>
      )}

      {carregando ? (
        <Carregando />
      ) : ordenadas.length === 0 ? (
        <Vazio arquivo={vendoArquivo} />
      ) : (
        <ul className="flex list-none flex-col gap-[11px] p-0">
          {ordenadas.map((atividade, i) => (
            <Linha
              key={atividade.id}
              atividade={atividade}
              maiorIdade={maiorIdade}
              atraso={120 + i * 60}
              arquivada={vendoArquivo}
              aoRemover={removerItem}
              aoMudarStatus={(status) =>
                void atualizarItem(atividade.id, (a) =>
                  apiFetch<Atividade>(`/atividades/${a.id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status }),
                  }),
                )
              }
              aoMudarPrioridade={(nova) =>
                void atualizarItem(atividade.id, (a) =>
                  apiFetch<Atividade>(`/atividades/${a.id}/prioridade`, {
                    method: 'PATCH',
                    body: JSON.stringify({ prioridade: nova }),
                  }),
                )
              }
              aoArquivar={() =>
                setAtividades((lista) => lista?.filter((a) => a.id !== atividade.id))
              }
              aoReabrir={() =>
                setAtividades((lista) => lista?.filter((a) => a.id !== atividade.id))
              }
            />
          ))}
        </ul>
      )}

      {!vendoArquivo && !carregando && (
        <button
          type="button"
          aria-label="Ver arquivo"
          onClick={() => setVendoArquivo(true)}
          className="rise lift flex items-center justify-between gap-5 rounded-[var(--radius-surface)] border border-line-faint px-[22px] py-[17px] text-left"
          style={{ '--rise-delay': `${120 + ordenadas.length * 60}ms` } as React.CSSProperties}
        >
          <span className="flex items-center gap-3">
            <Archive size={17} className="text-fg-muted" />
            <span className="text-sm text-fg-secondary">Arquivo</span>
          </span>
        </button>
      )}

      <DesfazerBar remocao={remocao} aoFechar={limpar} />
    </div>
  )
}

function Linha({
  atividade,
  maiorIdade,
  atraso,
  arquivada,
  aoRemover,
  aoMudarStatus,
  aoMudarPrioridade,
  aoArquivar,
  aoReabrir,
}: {
  atividade: Atividade
  maiorIdade: number
  atraso: number
  arquivada: boolean
  aoRemover: (atividade: Atividade) => void
  aoMudarStatus: (status: StatusAtividade) => void
  aoMudarPrioridade: (prioridade: Prioridade) => void
  aoArquivar: () => void
  aoReabrir: () => void
}) {
  const cor = corDaFaixa(atividade.faixa)
  const proporcao = proporcaoDaBarra(atividade.dias_parado, maiorIdade)

  return (
    <li
      className="rise lift surface flex flex-col gap-[15px] rounded-[var(--radius-surface)] px-[22px] py-5"
      style={{ '--rise-delay': `${atraso}ms` } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-[6px]">
          <div className="flex items-center gap-[10px]">
            <span
              className="size-[6px] shrink-0 rounded-full"
              style={{ background: COR_PRIORIDADE[atividade.prioridade] }}
              aria-hidden
            />
            <span className="text-[17px] font-medium tracking-[-0.2px] text-fg">
              {atividade.nome}
            </span>
          </div>
          {atividade.descricao && (
            <div className="pl-4 text-sm text-fg-muted">{atividade.descricao}</div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-[14px]">
          {/* O seletor É a pílula de status. Ter os dois mostrava a mesma
              informação duas vezes. */}
          <label className="sr-only" htmlFor={`status-${atividade.id}`}>
            Status de {atividade.nome}
          </label>
          <Select
            id={`status-${atividade.id}`}
            value={atividade.status}
            onChange={(e) => aoMudarStatus(e.target.value as StatusAtividade)}
            className={`h-[30px] cursor-pointer rounded-[var(--radius-pill)] px-3 text-[13px] ${ESTILO_STATUS[atividade.status]}`}
          >
            {STATUS_ATIVIDADE.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>

          {/* "Parado" só faz sentido para o que está aberto. No arquivo o
              número travado era alarme falso: o ticket não travou, encerrou. */}
          {!arquivada && (
            <div className="flex flex-col items-end gap-px">
              <span className="num text-xl leading-none font-semibold" style={{ color: cor }}>
                {atividade.dias_parado}d
              </span>
              <span className="text-[11px] text-fg-muted">parado</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-[120px] flex-1 items-center">
          {!arquivada && (
            <div
              className="grow-bar h-[3px] rounded-[var(--radius-bar)]"
              style={
                {
                  width: `${proporcao * 100}%`,
                  background: `linear-gradient(90deg, color-mix(in oklab, ${cor} 35%, transparent), ${cor})`,
                  '--grow-delay': `${atraso + 200}ms`,
                } as React.CSSProperties
              }
              aria-hidden
            />
          )}
        </div>

        <span className="shrink-0 text-xs text-fg-muted">
          {arquivada && atividade.arquivada_em
            ? `aberto em ${dataCurta(atividade.criado_em)}, arquivado em ${dataCurta(atividade.arquivada_em)}`
            : `aberto em ${dataCurta(atividade.criado_em)}`}
        </span>

        <label className="sr-only" htmlFor={`prioridade-${atividade.id}`}>
          Prioridade de {atividade.nome}
        </label>
        <Select
          id={`prioridade-${atividade.id}`}
          value={atividade.prioridade}
          onChange={(e) => aoMudarPrioridade(e.target.value as Prioridade)}
          className="h-[30px] cursor-pointer rounded-[var(--radius-control-sm)] border border-transparent bg-transparent px-2 text-xs text-fg-muted hover:border-line hover:bg-[rgba(120,160,230,0.08)]"
        >
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>

        {arquivada ? (
          <>
            <button
              type="button"
              aria-label={`Reabrir ${atividade.nome}`}
              onClick={() => {
                void apiFetch(`/atividades/${atividade.id}/reabrir`, { method: 'POST' })
                aoReabrir()
              }}
              className={estiloIcone}
            >
              <ArrowUUpLeft size={15} />
            </button>
            <button
              type="button"
              aria-label={`Remover ${atividade.nome}`}
              onClick={() => aoRemover(atividade)}
              className={estiloIconePerigo}
            >
              <Trash size={15} />
            </button>
          </>
        ) : (
          <button
            type="button"
            aria-label={`Arquivar ${atividade.nome}`}
            onClick={() => {
              void apiFetch(`/atividades/${atividade.id}/arquivar`, { method: 'POST' })
              aoArquivar()
            }}
            className={estiloIconePerigo}
          >
            <Archive size={15} />
          </button>
        )}
      </div>
    </li>
  )
}

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

function tituloDoArquivo(n: number): string {
  return n === 1 ? 'Um ticket arquivado' : `${n} tickets arquivados`
}

function tituloDaCarga(abertos: number): string {
  if (abertos === 0) return 'Nada em aberto'
  if (abertos === 1) return 'Um ticket aberto'
  return `${abertos} tickets abertos`
}

function Carregando() {
  return (
    <div className="flex flex-col gap-[11px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="surface h-[104px] animate-pulse rounded-[var(--radius-surface)]"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}

function Vazio({ arquivo }: { arquivo: boolean }) {
  return (
    <div className="surface flex flex-col items-start gap-3 rounded-[var(--radius-surface)] px-[22px] py-8">
      <div className="text-[17px] font-medium text-fg">
        {arquivo ? 'Arquivo vazio' : 'Nenhum ticket em aberto'}
      </div>
      <div className="max-w-[52ch] text-sm text-fg-muted">
        {arquivo
          ? 'Tickets arquivados aparecem aqui.'
          : 'Quando você abrir um ticket ele aparece aqui, ordenado pelo tempo que está parado.'}
      </div>
    </div>
  )
}
