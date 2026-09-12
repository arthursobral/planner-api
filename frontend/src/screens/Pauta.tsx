import { ArrowLeft, Check, ClipboardText } from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { estiloPrimario, estiloSecundario } from '../components/FormPanel'
import { apiFetch } from '../api/client'
import type { GrauNegativo, GrauPositivo, Pauta as PautaApi, Pessoa } from '../api/types'

const ROTULO: Record<GrauNegativo, string> = {
  Critico: 'Crítico',
  Medio: 'Médio',
  Baixo: 'Baixo',
  Evoluido: 'Evoluído',
}

const COR: Record<GrauNegativo, string> = {
  Critico: 'var(--high)',
  Medio: 'var(--medium)',
  Baixo: 'var(--low)',
  Evoluido: 'var(--done)',
}

const ROTULO_POSITIVO: Record<GrauPositivo, string> = {
  Bom: 'Bom',
  Otimo: 'Ótimo',
  Perfeito: 'Perfeito',
}

const CHAVE_STORAGE = 'planner_token'
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/**
 * A pauta do 1:1, montada pela API a partir do que já está registrado
 * (pontos, anotações, tempo de casa). Aqui só renderiza o que veio pronto.
 */
export function Pauta({ pessoa, aoVoltar }: { pessoa: Pessoa; aoVoltar: () => void }) {
  const [pauta, setPauta] = useState<PautaApi | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [registrado, setRegistrado] = useState(false)

  useEffect(() => {
    setPauta(null)
    setErro(null)
    apiFetch<PautaApi>(`/pessoas/${pessoa.id}/pauta`)
      .then(setPauta)
      .catch(() => setErro('Não foi possível carregar a pauta.'))
  }, [pessoa.id])

  async function copiar() {
    const md = await buscarMarkdown(pessoa.id)
    try {
      await navigator.clipboard.writeText(md)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Área de transferência bloqueada: cai para download do .md.
      const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `1a1-${pessoa.id}-${new Date().toISOString().slice(0, 10)}.md`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (erro) {
    return (
      <div className="flex flex-col gap-4">
        <button type="button" onClick={aoVoltar} className={`${estiloSecundario} self-start`}>
          <ArrowLeft size={16} className="mr-2" />
          Voltar
        </button>
        <p className="text-fg-muted">{erro}</p>
      </div>
    )
  }

  if (!pauta) {
    return <div className="surface h-[320px] animate-pulse rounded-[var(--radius-surface)]" />
  }

  const usaAnteriores = !pauta.desde
  const itensRecentes = usaAnteriores ? pauta.anteriores : pauta.novidades

  return (
    <div className="flex flex-col gap-8">
      <div className="rise flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[15px] text-fg-muted">Pauta do 1:1</div>
          <h1 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.8px] text-fg">
            {pessoa.nome}
          </h1>
          <div className="text-sm text-fg-muted">
            {pauta.tempo_de_casa} de casa, marco {pauta.marco_atual.titulo}
            {pauta.desde
              ? `, último 1:1 em ${new Date(pauta.desde).toLocaleDateString('pt-BR')}`
              : ', primeira conversa registrada'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={aoVoltar} className={estiloSecundario}>
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </button>
          <button type="button" onClick={() => void copiar()} className={estiloSecundario}>
            <ClipboardText size={16} className="mr-2" />
            {copiado ? 'Copiado' : 'Copiar em Markdown'}
          </button>
          <button
            type="button"
            onClick={() => {
              void apiFetch(`/pessoas/${pessoa.id}/1a1`, { method: 'POST' })
              setRegistrado(true)
            }}
            className={estiloPrimario}
          >
            <Check size={16} weight="bold" />
            {registrado ? 'Registrado' : 'Registrar como feito'}
          </button>
        </div>
      </div>

      <Secao titulo={usaAnteriores ? 'Tudo que está anotado' : 'Desde a última conversa'} atraso={80}>
        {itensRecentes.length === 0 ? (
          <Vazio>Nada anotado no período.</Vazio>
        ) : (
          <ul className="flex list-none flex-col gap-[11px] p-0">
            {itensRecentes.map((a, i) => (
              <li
                key={`${a.em}-${i}`}
                className="surface flex items-start gap-4 rounded-[var(--radius-surface)] px-[22px] py-4"
              >
                <span className="num w-[74px] shrink-0 text-[13px] text-fg-muted">{dia(a.em)}</span>
                <span className="min-w-0 text-[15px] leading-[1.55] text-fg-body">{a.texto}</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      {pauta.abertos.length > 0 && (
        <Secao titulo="A trabalhar" atraso={140}>
          <ul className="flex list-none flex-col gap-[11px] p-0">
            {pauta.abertos.map((p, i) => (
              <li
                key={i}
                className="surface flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-surface)] px-[22px] py-4"
              >
                <span className="text-[15px] text-fg">{p.texto}</span>
                <span
                  className="rounded-[var(--radius-pill)] px-3 py-[5px] text-[13px] font-semibold"
                  style={{
                    color: COR[p.grau],
                    background: `color-mix(in oklab, ${COR[p.grau]} 12%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${COR[p.grau]} 32%, transparent)`,
                  }}
                >
                  {ROTULO[p.grau]}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {pauta.evoluidos.length > 0 && (
        <Secao titulo="Evoluiu" atraso={180}>
          <ul className="flex list-none flex-col gap-[11px] p-0">
            {pauta.evoluidos.map((p, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-surface)] border border-[rgba(76,175,80,0.22)] px-[22px] py-4"
              >
                <span className="text-[15px] text-fg-secondary">{p.texto}</span>
                <span className="text-[13px] text-done-soft">
                  {p.resolvido_em ? `evoluiu em ${dia(p.resolvido_em.slice(0, 10))}` : 'evoluiu'}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {pauta.fortes.length > 0 && (
        <Secao titulo="Pontos fortes" atraso={220}>
          <ul className="grid list-none grid-cols-1 gap-[11px] p-0 sm:grid-cols-2">
            {pauta.fortes.map((p, i) => (
              <li
                key={i}
                className="surface flex items-center justify-between gap-3 rounded-[var(--radius-surface)] px-[18px] py-4"
              >
                <span className="min-w-0 text-[15px] text-fg">{p.texto}</span>
                <span className="shrink-0 text-xs font-semibold text-done-soft">
                  {ROTULO_POSITIVO[p.grau]}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {/* Texto institucional da WSD, mantido em inglês de propósito. */}
      <Secao titulo={`Expectativas do marco: ${pauta.marco_atual.titulo}`} atraso={260}>
        <div className="surface flex flex-col gap-4 rounded-[var(--radius-surface)] px-[22px] py-5">
          {pauta.marco_atual.secoes.map((secao) => (
            <div key={secao.titulo} className="flex flex-col gap-[10px]">
              {pauta.marco_atual.secoes.length > 1 && (
                <h3 className="text-[13px] font-semibold text-fg-muted">{secao.titulo}</h3>
              )}
              <ul className="flex list-none flex-col gap-[10px] p-0">
                {secao.itens.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-[11px] text-[15px] leading-[1.55] text-fg-body"
                  >
                    <Check size={15} weight="bold" className="mt-1 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Secao>

      {pauta.proximo_marco && (
        <Secao titulo={`Próximo marco: ${pauta.proximo_marco.titulo}`} atraso={300}>
          <ul className="flex list-none flex-col gap-[10px] rounded-[var(--radius-surface)] border border-line-faint px-[22px] py-5">
            {pauta.proximo_marco.secoes.flatMap((s) =>
              s.itens.map((item) => (
                <li key={item} className="text-sm leading-[1.55] text-fg-muted">
                  {item}
                </li>
              )),
            )}
          </ul>
        </Secao>
      )}
    </div>
  )
}

function Secao({ titulo, atraso, children }: { titulo: string; atraso: number; children: ReactNode }) {
  return (
    <section
      className="rise flex flex-col gap-[13px]"
      style={{ '--rise-delay': `${atraso}ms` } as React.CSSProperties}
    >
      <h2 className="text-[17px] font-medium tracking-[-0.2px] text-fg">{titulo}</h2>
      {children}
    </section>
  )
}

function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="surface max-w-[62ch] rounded-[var(--radius-surface)] px-[22px] py-6 text-sm text-fg-muted">
      {children}
    </p>
  )
}

function dia(d: string): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/**
 * `/pauta/markdown` devolve `text/markdown`, não JSON — `apiFetch` sempre faz
 * `.json()` na resposta, então essa chamada usa `fetch` direto. O token vem
 * do mesmo lugar que o `AuthContext` guarda (ver `CHAVE_STORAGE` ali).
 */
async function buscarMarkdown(pessoaId: number): Promise<string> {
  const token = localStorage.getItem(CHAVE_STORAGE)
  const resp = await fetch(`${BASE_URL}/pessoas/${pessoaId}/pauta/markdown`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return resp.text()
}
