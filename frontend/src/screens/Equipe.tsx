import { Check, ChatsCircle, Plus, Trash, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { ApiError, apiFetch } from '../api/client'
import type { Anotacao, GrauNegativo, GrauPositivo, Pessoa, Ponto, TipoPonto } from '../api/types'
import { CampoData } from '../components/CampoData'
import { DesfazerBar } from '../components/DesfazerBar'
import {
  estiloCampo,
  estiloDiscreto,
  estiloIconePerigo,
  estiloPrimario,
  estiloSecundario,
} from '../components/FormPanel'
import { Select } from '../components/Select'
import { useRemocao } from '../components/useRemocao'
import { Pauta } from './Pauta'

const COR_GRAU: Record<GrauNegativo, string> = {
  Critico: 'var(--high)',
  Medio: 'var(--medium)',
  Baixo: 'var(--low)',
  Evoluido: 'var(--done)',
}

const ROTULO_GRAU: Record<GrauNegativo, string> = {
  Critico: 'Crítico',
  Medio: 'Médio',
  Baixo: 'Baixo',
  Evoluido: 'Evoluído',
}

const ROTULO_POSITIVO: Record<GrauPositivo, string> = {
  Bom: 'Bom',
  Otimo: 'Ótimo',
  Perfeito: 'Perfeito',
}

const GRAUS_NEGATIVOS: GrauNegativo[] = ['Critico', 'Medio', 'Baixo']
const GRAUS_POSITIVOS: GrauPositivo[] = ['Bom', 'Otimo', 'Perfeito']

const hoje = () => new Date().toISOString().slice(0, 10)

/** "14 meses" ou "1 ano e 2 meses", a partir da data de admissão (ISO). */
function tempoDeCasa(dataAdmissaoIso: string): { valor: string; sufixo?: string } {
  const inicio = new Date(`${dataAdmissaoIso}T00:00:00`)
  const agora = new Date()
  let meses = (agora.getFullYear() - inicio.getFullYear()) * 12 + (agora.getMonth() - inicio.getMonth())
  if (agora.getDate() < inicio.getDate()) meses -= 1
  meses = Math.max(0, meses)

  const anos = Math.floor(meses / 12)
  const restoMeses = meses % 12
  if (anos === 0) return { valor: String(meses), sufixo: meses === 1 ? 'mês' : 'meses' }
  if (restoMeses === 0) return { valor: String(anos), sufixo: anos === 1 ? 'ano' : 'anos' }
  return {
    valor: `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${restoMeses} ${restoMeses === 1 ? 'mês' : 'meses'}`,
  }
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function mensagemErro(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Falha ao comunicar com o servidor'
}

function formatarDataCurta(dia: string): string {
  return new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function Equipe() {
  const [pessoaEmPauta, setPessoaEmPauta] = useState<Pessoa | null>(null)

  const [pessoas, setPessoas] = useState<Pessoa[] | undefined>(undefined)
  const [pessoaId, setPessoaId] = useState<number | null>(null)
  const [pontos, setPontos] = useState<Ponto[] | undefined>(undefined)
  const [anotacoes, setAnotacoes] = useState<Anotacao[] | undefined>(undefined)
  const [erro, setErro] = useState<string | null>(null)

  const [adicionando, setAdicionando] = useState<TipoPonto | null>(null)
  const [textoNovo, setTextoNovo] = useState('')
  const [grauNovo, setGrauNovo] = useState<string>('Medio')

  const [diarioAberto, setDiarioAberto] = useState(false)
  const [diarioTexto, setDiarioTexto] = useState('')
  const [diarioData, setDiarioData] = useState(hoje)

  const {
    remocao: remocaoPonto,
    registrar: registrarRemocaoPonto,
    limpar: limparRemocaoPonto,
  } = useRemocao()
  const {
    remocao: remocaoAnotacao,
    registrar: registrarRemocaoAnotacao,
    limpar: limparRemocaoAnotacao,
  } = useRemocao()

  useEffect(() => {
    apiFetch<Pessoa[]>('/pessoas')
      .then(setPessoas)
      .catch((e) => setErro(mensagemErro(e)))
  }, [])

  const pessoa = pessoas?.find((p) => p.id === pessoaId) ?? pessoas?.[0] ?? null

  useEffect(() => {
    if (!pessoa) return
    setPontos(undefined)
    setAnotacoes(undefined)
    setAdicionando(null)
    setDiarioAberto(false)
    apiFetch<Ponto[]>(`/pontos?pessoa_id=${pessoa.id}`)
      .then(setPontos)
      .catch((e) => setErro(mensagemErro(e)))
    apiFetch<Anotacao[]>(`/anotacoes?pessoa_id=${pessoa.id}`)
      .then(setAnotacoes)
      .catch((e) => setErro(mensagemErro(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pessoa?.id])

  if (pessoaEmPauta) {
    return <Pauta pessoa={pessoaEmPauta} aoVoltar={() => setPessoaEmPauta(null)} />
  }

  if (pessoas === undefined) return <Carregando />

  if (pessoas.length === 0) {
    return (
      <p className="surface max-w-[56ch] rounded-[var(--radius-surface)] px-[22px] py-6 text-sm text-fg-muted">
        Nenhuma pessoa cadastrada ainda.
      </p>
    )
  }

  if (!pessoa) return <Carregando />

  const carregandoPontos = pontos === undefined
  const negativos = (pontos ?? []).filter((p) => p.tipo === 'negativo')
  const positivos = (pontos ?? []).filter((p) => p.tipo === 'positivo')
  const abertos = negativos
    .filter((p) => p.grau !== 'Evoluido')
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
  const evoluidos = negativos.filter((p) => p.grau === 'Evoluido')

  const maisAntigoDias = abertos.length ? Math.max(...abertos.map((p) => diasDesde(p.criado_em))) : 0
  const mesesMaisAntigo = Math.floor(maisAntigoDias / 30.44)
  const casa = tempoDeCasa(pessoa.data_admissao)

  const stats = [
    {
      rotulo: 'Ponto aberto há mais tempo',
      valor: abertos.length ? (mesesMaisAntigo > 0 ? mesesMaisAntigo : maisAntigoDias) : 0,
      sufixo: abertos.length ? (mesesMaisAntigo > 0 ? 'meses' : 'dias') : undefined,
      cor: abertos.length ? 'var(--high-soft)' : 'var(--done-soft)',
    },
    {
      rotulo: 'Já evoluíram',
      valor: evoluidos.length,
      cor: evoluidos.length ? 'var(--done-soft)' : undefined,
    },
    { rotulo: 'Tempo de casa', valor: casa.valor, sufixo: casa.sufixo },
  ]

  function abrirFormPonto(tipo: TipoPonto) {
    setTextoNovo('')
    setGrauNovo(tipo === 'negativo' ? 'Medio' : 'Bom')
    setAdicionando(adicionando === tipo ? null : tipo)
  }

  async function adicionarPonto(tipo: TipoPonto) {
    if (!pessoa || !textoNovo.trim()) return
    try {
      const novo = await apiFetch<Ponto>('/pontos', {
        method: 'POST',
        body: JSON.stringify({ pessoa_id: pessoa.id, tipo, texto: textoNovo.trim(), grau: grauNovo }),
      })
      setPontos((atual) => [...(atual ?? []), novo])
      setTextoNovo('')
      setAdicionando(null)
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  async function evoluirPonto(ponto: Ponto) {
    try {
      const atualizado = await apiFetch<Ponto>(`/pontos/${ponto.id}/evoluir`, { method: 'POST' })
      setPontos((atual) => atual?.map((p) => (p.id === atualizado.id ? atualizado : p)))
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  function removerPonto(ponto: Ponto) {
    setPontos((atual) => atual?.filter((p) => p.id !== ponto.id))
    apiFetch(`/pontos/${ponto.id}`, { method: 'DELETE' }).catch((e) => setErro(mensagemErro(e)))
    registrarRemocaoPonto(`"${ponto.texto}" removido`, () => {
      apiFetch<Ponto>(`/pontos/${ponto.id}/restaurar`, { method: 'POST' })
        .then((restaurado) => setPontos((atual) => [...(atual ?? []), restaurado]))
        .catch((e) => setErro(mensagemErro(e)))
    })
  }

  async function adicionarAnotacao() {
    if (!pessoa || !diarioTexto.trim()) return
    try {
      const nova = await apiFetch<Anotacao>('/anotacoes', {
        method: 'POST',
        body: JSON.stringify({ pessoa_id: pessoa.id, texto: diarioTexto.trim(), em: diarioData }),
      })
      setAnotacoes((atual) => [...(atual ?? []), nova])
      setDiarioTexto('')
      setDiarioData(hoje())
      setDiarioAberto(false)
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  function removerAnotacao(anotacao: Anotacao) {
    setAnotacoes((atual) => atual?.filter((a) => a.id !== anotacao.id))
    apiFetch(`/anotacoes/${anotacao.id}`, { method: 'DELETE' }).catch((e) => setErro(mensagemErro(e)))
    registrarRemocaoAnotacao(`Anotação de ${formatarDataCurta(anotacao.em)} removida`, () => {
      apiFetch<Anotacao>(`/anotacoes/${anotacao.id}/restaurar`, { method: 'POST' })
        .then((restaurada) => setAnotacoes((atual) => [...(atual ?? []), restaurada]))
        .catch((e) => setErro(mensagemErro(e)))
    })
  }

  return (
    <div className="flex flex-col gap-8">
      {erro && (
        <p role="alert" className="text-sm text-high-soft">
          {erro}
        </p>
      )}

      <div className="rise flex flex-col gap-[7px]">
        <div className="text-[15px] text-fg-muted">Avaliação da equipe</div>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h1 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.8px] text-fg">
            {pessoa.nome}
          </h1>
          <button
            type="button"
            onClick={() => setPessoaEmPauta(pessoa)}
            className={estiloSecundario}
          >
            <ChatsCircle size={16} className="mr-2" />
            Preparar 1:1
          </button>
        </div>
      </div>

      <div
        className="rise flex flex-wrap gap-[9px]"
        style={{ '--rise-delay': '60ms' } as React.CSSProperties}
      >
        {pessoas.map((p) => {
          const ativa = p.id === pessoa.id
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={ativa}
              onClick={() => setPessoaId(p.id)}
              className={`h-[38px] rounded-[var(--radius-control)] px-4 text-sm ${
                ativa
                  ? 'bg-linear-[135deg,var(--accent),var(--accent-alt)] font-semibold text-fg-on-accent'
                  : 'border border-[rgba(120,160,230,0.16)] bg-[rgba(120,160,230,0.07)] text-fg-secondary'
              }`}
            >
              {p.nome}
            </button>
          )
        })}
      </div>

      <div
        className="rise flex flex-wrap items-center gap-x-11 gap-y-6"
        style={{ '--rise-delay': '120ms' } as React.CSSProperties}
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

      <section className="flex flex-col gap-[13px]">
        <div
          className="rise flex items-baseline justify-between"
          style={{ '--rise-delay': '180ms' } as React.CSSProperties}
        >
          <h2 className="text-[17px] font-medium tracking-[-0.2px] text-fg">A trabalhar</h2>
          <button
            type="button"
            aria-expanded={adicionando === 'negativo'}
            onClick={() => abrirFormPonto('negativo')}
            className={estiloDiscreto}
          >
            {adicionando === 'negativo' ? <X size={14} /> : <Plus size={14} weight="bold" />}
            {adicionando === 'negativo' ? 'Cancelar' : 'Adicionar'}
          </button>
        </div>

        {adicionando === 'negativo' && (
          <form
            className="rise surface flex flex-wrap items-end gap-3 rounded-[var(--radius-surface)] px-[22px] py-4"
            onSubmit={(e) => {
              e.preventDefault()
              void adicionarPonto('negativo')
            }}
          >
            <div className="flex min-w-[240px] flex-1 flex-col gap-2">
              <label htmlFor="novo-ponto-negativo" className="text-[13px] text-fg-muted">
                O que precisa evoluir
              </label>
              <input
                id="novo-ponto-negativo"
                autoFocus
                value={textoNovo}
                onChange={(e) => setTextoNovo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setAdicionando(null)
                }}
                className={estiloCampo}
              />
            </div>
            <div className="flex w-[140px] flex-col gap-2">
              <label htmlFor="grau-negativo" className="text-[13px] text-fg-muted">
                Gravidade
              </label>
              <Select
                id="grau-negativo"
                value={grauNovo}
                onChange={(e) => setGrauNovo(e.target.value)}
                className={estiloCampo}
              >
                {GRAUS_NEGATIVOS.map((g) => (
                  <option key={g} value={g}>
                    {ROTULO_GRAU[g]}
                  </option>
                ))}
              </Select>
            </div>
            <button type="submit" disabled={!textoNovo.trim()} className={estiloPrimario}>
              Registrar
            </button>
          </form>
        )}

        {carregandoPontos ? (
          <div className="surface h-[86px] animate-pulse rounded-[var(--radius-surface)]" />
        ) : negativos.length === 0 ? (
          <p className="surface max-w-[56ch] rounded-[var(--radius-surface)] px-[22px] py-6 text-sm text-fg-muted">
            Nenhum ponto registrado para {pessoa.nome}. Anote aqui o que vocês combinarem no
            próximo 1:1.
          </p>
        ) : (
          <ul className="flex list-none flex-col gap-[13px] p-0">
            {[...abertos, ...evoluidos].map((ponto, i) => (
              <PontoNegativo
                key={ponto.id}
                ponto={ponto}
                atraso={220 + i * 40}
                aoEvoluir={evoluirPonto}
                aoRemover={removerPonto}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-[13px]">
        <div
          className="rise flex items-baseline justify-between"
          style={{ '--rise-delay': '340ms' } as React.CSSProperties}
        >
          <h2 className="text-[17px] font-medium tracking-[-0.2px] text-fg">Pontos fortes</h2>
          <button
            type="button"
            aria-expanded={adicionando === 'positivo'}
            onClick={() => abrirFormPonto('positivo')}
            className={estiloDiscreto}
          >
            {adicionando === 'positivo' ? <X size={14} /> : <Plus size={14} weight="bold" />}
            {adicionando === 'positivo' ? 'Cancelar' : 'Adicionar'}
          </button>
        </div>

        {adicionando === 'positivo' && (
          <form
            className="rise surface flex flex-wrap items-end gap-3 rounded-[var(--radius-surface)] px-[22px] py-4"
            onSubmit={(e) => {
              e.preventDefault()
              void adicionarPonto('positivo')
            }}
          >
            <div className="flex min-w-[240px] flex-1 flex-col gap-2">
              <label htmlFor="novo-ponto-positivo" className="text-[13px] text-fg-muted">
                O que a pessoa faz bem
              </label>
              <input
                id="novo-ponto-positivo"
                autoFocus
                value={textoNovo}
                onChange={(e) => setTextoNovo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setAdicionando(null)
                }}
                className={estiloCampo}
              />
            </div>
            <div className="flex w-[140px] flex-col gap-2">
              <label htmlFor="grau-positivo" className="text-[13px] text-fg-muted">
                Nível
              </label>
              <Select
                id="grau-positivo"
                value={grauNovo}
                onChange={(e) => setGrauNovo(e.target.value)}
                className={estiloCampo}
              >
                {GRAUS_POSITIVOS.map((g) => (
                  <option key={g} value={g}>
                    {ROTULO_POSITIVO[g]}
                  </option>
                ))}
              </Select>
            </div>
            <button type="submit" disabled={!textoNovo.trim()} className={estiloPrimario}>
              Registrar
            </button>
          </form>
        )}

        {carregandoPontos ? (
          <div className="surface h-[62px] animate-pulse rounded-[var(--radius-surface)]" />
        ) : positivos.length === 0 ? (
          <p className="surface max-w-[56ch] rounded-[var(--radius-surface)] px-[22px] py-6 text-sm text-fg-muted">
            Nada registrado ainda. Vale anotar o que a pessoa faz bem antes do ciclo de avaliação.
          </p>
        ) : (
          <ul
            className="rise grid list-none grid-cols-1 gap-[11px] p-0 sm:grid-cols-2"
            style={{ '--rise-delay': '380ms' } as React.CSSProperties}
          >
            {positivos.map((ponto) => (
              <li
                key={ponto.id}
                className="lift surface flex items-center justify-between gap-3 rounded-[var(--radius-surface)] px-[18px] py-4"
              >
                <span className="min-w-0 text-[15px] text-fg">{ponto.texto}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold text-done-soft">
                    {ROTULO_POSITIVO[ponto.grau as GrauPositivo]}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remover ponto: ${ponto.texto}`}
                    onClick={() => removerPonto(ponto)}
                    className={estiloIconePerigo}
                  >
                    <Trash size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-[13px]">
        <div
          className="rise flex items-baseline justify-between"
          style={{ '--rise-delay': '420ms' } as React.CSSProperties}
        >
          <h2 className="text-[17px] font-medium tracking-[-0.2px] text-fg">Diário</h2>
          <button
            type="button"
            aria-expanded={diarioAberto}
            onClick={() => {
              setDiarioTexto('')
              setDiarioData(hoje())
              setDiarioAberto(!diarioAberto)
            }}
            className={estiloDiscreto}
          >
            {diarioAberto ? <X size={14} /> : <Plus size={14} weight="bold" />}
            {diarioAberto ? 'Cancelar' : 'Anotar'}
          </button>
        </div>

        {diarioAberto && (
          <form
            className="rise surface flex flex-wrap items-end gap-3 rounded-[var(--radius-surface)] px-[22px] py-4"
            onSubmit={(e) => {
              e.preventDefault()
              void adicionarAnotacao()
            }}
          >
            <div className="flex min-w-[240px] flex-1 flex-col gap-2">
              <label htmlFor="anotacao-texto" className="text-[13px] text-fg-muted">
                O que aconteceu
              </label>
              <input
                id="anotacao-texto"
                autoFocus
                value={diarioTexto}
                onChange={(e) => setDiarioTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setDiarioAberto(false)
                }}
                placeholder="Assumiu a escalação do lote sem eu pedir"
                className={estiloCampo}
              />
            </div>
            <div className="flex w-[160px] flex-col gap-2">
              <label htmlFor="anotacao-data" className="text-[13px] text-fg-muted">
                Quando
              </label>
              <CampoData id="anotacao-data" value={diarioData} max={hoje()} onChange={setDiarioData} />
            </div>
            <button type="submit" disabled={!diarioTexto.trim()} className={estiloPrimario}>
              Anotar
            </button>
          </form>
        )}

        {anotacoes === undefined ? (
          <div className="surface h-[64px] animate-pulse rounded-[var(--radius-surface)]" />
        ) : anotacoes.length === 0 ? (
          <p className="surface max-w-[62ch] rounded-[var(--radius-surface)] px-[22px] py-6 text-sm text-fg-muted">
            Nada anotado ainda. Uma linha por fato, com data, é o que vai sustentar a conversa
            quando chegar o ciclo de avaliação.
          </p>
        ) : (
          <ul className="flex list-none flex-col gap-[11px] p-0">
            {anotacoes.map((a, i) => (
              <li
                key={a.id}
                className="rise lift surface flex items-start justify-between gap-4 rounded-[var(--radius-surface)] px-[22px] py-4"
                style={{ '--rise-delay': `${460 + i * 40}ms` } as React.CSSProperties}
              >
                <div className="flex min-w-0 items-baseline gap-4">
                  <span className="num w-[74px] shrink-0 text-[13px] text-fg-muted">
                    {formatarDataCurta(a.em)}
                  </span>
                  <span className="min-w-0 text-[15px] leading-[1.55] text-fg-body">{a.texto}</span>
                </div>
                <button
                  type="button"
                  aria-label={`Remover anotação de ${formatarDataCurta(a.em)}`}
                  onClick={() => removerAnotacao(a)}
                  className={estiloIconePerigo}
                >
                  <Trash size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DesfazerBar remocao={remocaoPonto} aoFechar={limparRemocaoPonto} />
      <DesfazerBar remocao={remocaoAnotacao} aoFechar={limparRemocaoAnotacao} />
    </div>
  )
}

function PontoNegativo({
  ponto,
  atraso,
  aoEvoluir,
  aoRemover,
}: {
  ponto: Ponto
  atraso: number
  aoEvoluir: (ponto: Ponto) => void
  aoRemover: (ponto: Ponto) => void
}) {
  const grau = ponto.grau as GrauNegativo
  const evoluido = grau === 'Evoluido'
  const meses = Math.floor(diasDesde(ponto.criado_em) / 30.44)

  return (
    <li
      className={`rise lift flex flex-wrap items-center justify-between gap-6 rounded-[var(--radius-surface)] px-[22px] py-5 ${
        evoluido ? 'border border-[rgba(76,175,80,0.22)]' : 'surface'
      }`}
      style={{ '--rise-delay': `${atraso}ms` } as React.CSSProperties}
    >
      <div className="flex min-w-0 items-center gap-[14px]">
        <span
          className="w-[3px] shrink-0 self-stretch rounded-[2px]"
          style={{ background: COR_GRAU[grau] }}
          aria-hidden
        />
        <div className="flex min-w-0 flex-col gap-[5px]">
          <span
            className={`text-base tracking-[-0.2px] ${evoluido ? 'text-fg-secondary' : 'font-medium text-fg'}`}
          >
            {ponto.texto}
          </span>
          <span className={`text-sm ${evoluido ? 'text-done-soft' : 'text-fg-muted'}`}>
            {evoluido
              ? 'Evoluiu, e fica no histórico como prova de progresso'
              : `Registrado há ${meses > 0 ? `${meses} ${meses === 1 ? 'mês' : 'meses'}` : `${diasDesde(ponto.criado_em)} dias`}`}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-[11px]">
        <span
          className="rounded-[var(--radius-pill)] px-3 py-[5px] text-[13px] font-semibold"
          style={{
            color: COR_GRAU[grau],
            background: `color-mix(in oklab, ${COR_GRAU[grau]} 12%, transparent)`,
            border: `1px solid color-mix(in oklab, ${COR_GRAU[grau]} 32%, transparent)`,
          }}
        >
          {ROTULO_GRAU[grau]}
        </span>

        {!evoluido && (
          <button
            type="button"
            onClick={() => aoEvoluir(ponto)}
            className="flex h-[34px] items-center gap-[7px] rounded-[var(--radius-control-sm)] border border-[rgba(76,175,80,0.35)] bg-[rgba(76,175,80,0.12)] px-[14px] text-[13px] font-medium text-done-soft transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-done hover:bg-[rgba(76,175,80,0.22)] active:translate-y-0 active:scale-[0.98]"
          >
            <Check size={14} weight="bold" />
            Evoluiu
          </button>
        )}

        <button
          type="button"
          aria-label={`Remover ponto: ${ponto.texto}`}
          onClick={() => aoRemover(ponto)}
          className={estiloIconePerigo}
        >
          <Trash size={15} />
        </button>
      </div>
    </li>
  )
}

function Carregando() {
  return (
    <div className="flex flex-col gap-[13px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="surface h-[86px] animate-pulse rounded-[var(--radius-surface)]"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}
