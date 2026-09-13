import { CaretDown, CaretRight, Check, ClipboardText, Trash } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import type { StatusTodo, Todo } from '../api/types'
import { DesfazerBar } from '../components/DesfazerBar'
import {
  FormPanel,
  estiloCampo,
  estiloIconePerigo,
  estiloPrimario,
  estiloSecundario,
} from '../components/FormPanel'
import { Select } from '../components/Select'
import { useRemocao } from '../components/useRemocao'
import { DisplayStats, type Stat } from '../components/DisplayStats'

const STATUS_TODO: StatusTodo[] = ['todo', 'testando', 'em-progresso', 'concluido']

const ROTULO: Record<StatusTodo, string> = {
  todo: 'Sem começar',
  testando: 'Em teste',
  'em-progresso': 'Em progresso',
  concluido: 'Concluído',
}

const COR: Record<StatusTodo, string> = {
  todo: 'var(--fg-secondary)',
  testando: 'var(--low)',
  'em-progresso': 'var(--medium)',
  concluido: 'var(--done)',
}

/** Ordem de leitura: o que está mais perto de terminar primeiro. */
const ORDEM: StatusTodo[] = ['em-progresso', 'testando', 'todo']

export function Tarefas() {
  const [todos, setTodos] = useState<Todo[] | null>(null)
  const [expandido, setExpandido] = useState<Set<StatusTodo>>(new Set())
  const [concluidosAbertos, setConcluidosAbertos] = useState(false)
  const { remocao, registrar, limpar } = useRemocao()
  const [formAberto, setFormAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [somenteMarcados, setSomenteMarcados] = useState(false)

  useEffect(() => {
    void apiFetch<Todo[]>('/todos').then(setTodos)
  }, [])

  if (!todos) return <Carregando />

  async function colar() {
    if (!texto.trim()) return
    const novos = await apiFetch<Todo[]>('/todos', {
      method: 'POST',
      body: JSON.stringify({ texto, somente_marcados: somenteMarcados }),
    })
    if (novos.length === 0) return
    setTodos((prev) => [...(prev ?? []), ...novos])
    setTexto('')
    setSomenteMarcados(false)
    setFormAberto(false)
  }

  async function alternar(todo: Todo) {
    const atualizado = await apiFetch<Todo>(`/todos/${todo.id}/alternar`, { method: 'POST' })
    setTodos((prev) => prev?.map((t) => (t.id === todo.id ? atualizado : t)) ?? null)
  }

  async function mudarStatus(todo: Todo, status: StatusTodo) {
    const atualizado = await apiFetch<Todo>(`/todos/${todo.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    setTodos((prev) => prev?.map((t) => (t.id === todo.id ? atualizado : t)) ?? null)
  }

  function removerItem(todo: Todo) {
    setTodos((prev) => prev?.filter((t) => t.id !== todo.id) ?? null)
    void apiFetch(`/todos/${todo.id}`, { method: 'DELETE' })
    const resumo =
      todo.texto.length > 44 ? `${todo.texto.slice(0, 44).trimEnd()}...` : todo.texto
    registrar(`"${resumo}" removido`, () => {
      void apiFetch<Todo>(`/todos/${todo.id}/restaurar`, { method: 'POST' }).then((restaurado) =>
        setTodos((prev) => [...(prev ?? []), restaurado]),
      )
    })
  }

  const concluidos = todos.filter((t) => t.status === 'concluido')
  const progresso = todos.length > 0 ? Math.round((concluidos.length / todos.length) * 100) : 0

  const stats: Stat[] = [
    { rotulo: 'Em teste', valor: contar(todos, 'testando'), cor: 'var(--low-soft)' },
    { rotulo: 'Em progresso', valor: contar(todos, 'em-progresso'), cor: 'var(--medium-soft)' },
    { rotulo: 'Sem começar', valor: contar(todos, 'todo'), cor: 'var(--fg-secondary)' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="rise flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[15px] text-fg-muted">Itens para fazer</div>
          <h1 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.8px] text-fg">
            {concluidos.length} de {todos.length} prontos
          </h1>
        </div>
        <button type="button" onClick={() => setFormAberto(true)} className={estiloPrimario}>
          <ClipboardText size={16} />
          Colar lista
        </button>
      </div>

      <div
        className="rise flex flex-wrap items-center gap-x-11 gap-y-6"
        style={{ '--rise-delay': '60ms' } as React.CSSProperties}
      >
        <div className="flex min-w-[240px] flex-col gap-2">
          <div className="text-[13px] text-fg-muted">Progresso</div>
          <div className="flex items-center gap-[13px]">
            <span className="num text-[34px] leading-none font-semibold tracking-[-1px] text-fg">
              {progresso}%
            </span>
            <div
              className="h-[6px] flex-1 overflow-hidden rounded-[var(--radius-bar)] bg-[rgba(120,160,230,0.12)]"
              role="progressbar"
              aria-valuenow={progresso}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso da lista"
            >
              <div
                className="grow-bar h-full rounded-[var(--radius-bar)] bg-linear-[90deg,var(--accent),var(--accent-alt)]"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        </div>
        <div className="h-[42px] w-px bg-[rgba(120,160,230,0.16)]" aria-hidden />
        <DisplayStats stats={stats} atraso={80} />
      </div>

      <FormPanel titulo="Colar lista" aberto={formAberto} aoFechar={() => setFormAberto(false)}>
        <div className="flex flex-col gap-2">
          <label htmlFor="colar-texto" className="text-[13px] text-fg-muted">
            Cole a lista. Marcador <code className="text-fg-secondary">*</code>,{' '}
            <code className="text-fg-secondary">-</code>,{' '}
            <code className="text-fg-secondary">1.</code> e caixa{' '}
            <code className="text-fg-secondary">[ ]</code> são reconhecidos, e a indentação vira
            nível.
          </label>
          <textarea
            id="colar-texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            placeholder={`* [ ] Item principal
  * [ ] Subitem
    * [x] Já feito`}
            className={`${estiloCampo} font-mono text-[13px] leading-[1.6]`}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            id="colar-somente-marcados"
            type="checkbox"
            checked={somenteMarcados}
            onChange={(e) => setSomenteMarcados(e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--accent)]"
          />
          <label
            htmlFor="colar-somente-marcados"
            className="cursor-pointer text-[13px] text-fg-secondary select-none"
          >
            Considerar só linhas com marcador ou checkbox
          </label>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!texto.trim()}
            onClick={() => void colar()}
            className={estiloPrimario}
          >
            Adicionar itens
          </button>
          <button type="button" onClick={() => setFormAberto(false)} className={estiloSecundario}>
            Cancelar
          </button>
        </div>
      </FormPanel>

      {todos.length === 0 ? (
        <Vazio />
      ) : (
        <div className="flex flex-col gap-[26px]">
          {ORDEM.map((status, gi) => {
            const doGrupo = todos.filter((t) => t.status === status)
            if (doGrupo.length === 0) return null

            const aberto = expandido.has(status)
            const visiveis = aberto ? doGrupo : doGrupo.slice(0, 2)
            const restantes = doGrupo.length - visiveis.length

            return (
              <section
                key={status}
                className="rise flex flex-col gap-[11px]"
                style={{ '--rise-delay': `${120 + gi * 60}ms` } as React.CSSProperties}
              >
                <div className="flex items-baseline gap-[11px] pl-[2px]">
                  <h2 className="text-base font-medium text-fg">{ROTULO[status]}</h2>
                  <span className="num text-sm text-fg-muted">{doGrupo.length}</span>
                </div>

                <ul className="flex list-none flex-col gap-[11px] p-0">
                  {visiveis.map((todo) => (
                    <Item
                      key={todo.id}
                      todo={todo}
                      aoAlternar={alternar}
                      aoMudarStatus={mudarStatus}
                      aoRemover={removerItem}
                    />
                  ))}
                </ul>

                {restantes > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandido(new Set([...expandido, status]))}
                    className="flex items-center gap-[9px] self-start rounded-[var(--radius-control-sm)] px-2 py-1 text-sm text-accent-soft transition-colors duration-150 hover:bg-[rgba(79,172,254,0.1)] hover:text-accent-alt"
                  >
                    <CaretDown size={14} weight="bold" />
                    Mostrar os outros {restantes}
                  </button>
                )}
              </section>
            )
          })}

          {concluidos.length > 0 && (
            <section className="flex flex-col gap-[11px]">
              <button
                type="button"
                aria-expanded={concluidosAbertos}
                aria-label={`Concluídos, ${concluidos.length}`}
                onClick={() => setConcluidosAbertos(!concluidosAbertos)}
                className="lift flex items-center justify-between gap-5 rounded-[var(--radius-surface)] border border-line-faint px-[22px] py-[17px]"
              >
                <span className="flex items-center gap-3">
                  {concluidosAbertos ? (
                    <CaretDown size={16} weight="bold" className="text-fg-muted" />
                  ) : (
                    <CaretRight size={16} weight="bold" className="text-fg-muted" />
                  )}
                  <Check size={16} weight="bold" className="text-done-soft" />
                  <span className="text-sm text-fg-secondary">Concluídos</span>
                  <span className="num text-sm text-fg-muted">{concluidos.length}</span>
                </span>
              </button>

              {concluidosAbertos && (
                <ul className="flex list-none flex-col gap-[11px] p-0">
                  {concluidos.map((todo) => (
                    <Item
                      key={todo.id}
                      todo={todo}
                      aoAlternar={alternar}
                      aoMudarStatus={mudarStatus}
                      aoRemover={removerItem}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      <DesfazerBar remocao={remocao} aoFechar={limpar} />
    </div>
  )
}

function Item({
  todo,
  aoAlternar,
  aoMudarStatus,
  aoRemover,
}: {
  todo: Todo
  aoAlternar: (todo: Todo) => void
  aoMudarStatus: (todo: Todo, status: StatusTodo) => void
  aoRemover: (todo: Todo) => void
}) {
  return (
    <li className="lift surface flex items-start gap-4 rounded-[var(--radius-surface)] px-[22px] py-5">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.concluido}
        aria-label={`Concluir: ${todo.texto.slice(0, 60)}`}
        onClick={() => void aoAlternar(todo)}
        className={`mt-[2px] grid size-5 shrink-0 place-items-center rounded-[var(--radius-check)] border-[1.5px] transition-colors duration-150 ${
          todo.concluido
            ? 'border-done bg-[rgba(76,175,80,0.2)] text-done-soft'
            : 'border-[rgba(120,160,230,0.35)] hover:border-accent hover:bg-[rgba(79,172,254,0.12)]'
        }`}
      >
        {todo.concluido && <Check size={12} weight="bold" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
        {/* max-w em ch: texto colado pode chegar a parágrafos inteiros. */}
        <p
          className={`m-0 max-w-[76ch] text-[15px] leading-[1.6] ${
            todo.concluido ? 'text-fg-muted line-through' : 'text-fg-body'
          }`}
        >
          {todo.texto}
        </p>
        {todo.nivel > 0 && (
          <span className="text-xs text-fg-muted">{ordinal(todo.nivel)} nível</span>
        )}
      </div>

      <label className="sr-only" htmlFor={`todo-status-${todo.id}`}>
        Status do item
      </label>
      <Select
        id={`todo-status-${todo.id}`}
        value={todo.status}
        onChange={(e) => void aoMudarStatus(todo, e.target.value as StatusTodo)}
        className="h-[34px] shrink-0 rounded-[var(--radius-control-sm)] px-3 text-[13px]"
        style={{
          color: COR[todo.status],
          background: `color-mix(in oklab, ${COR[todo.status]} 12%, transparent)`,
          border: `1px solid color-mix(in oklab, ${COR[todo.status]} 32%, transparent)`,
        }}
      >
        {STATUS_TODO.map((s) => (
          <option key={s} value={s}>
            {ROTULO[s]}
          </option>
        ))}
      </Select>

      <button
        type="button"
        aria-label={`Remover: ${todo.texto.slice(0, 60)}`}
        onClick={() => aoRemover(todo)}
        className={`mt-[2px] ${estiloIconePerigo}`}
      >
        <Trash size={15} />
      </button>
    </li>
  )
}

function contar(todos: Todo[], status: StatusTodo): number {
  return todos.filter((t) => t.status === status).length
}

function ordinal(n: number): string {
  return ['zero', 'primeiro', 'segundo', 'terceiro'][n] ?? `${n}º`
}

function Carregando() {
  return (
    <div className="flex flex-col gap-[11px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="surface h-[92px] animate-pulse rounded-[var(--radius-surface)]"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}

function Vazio() {
  return (
    <div className="surface flex flex-col items-start gap-3 rounded-[var(--radius-surface)] px-[22px] py-8">
      <div className="text-[17px] font-medium text-fg">Lista vazia</div>
      <div className="max-w-[52ch] text-sm text-fg-muted">
        Cole uma lista em markdown com <code className="text-fg-secondary">* [ ] item</code> e a
        indentação vira nível.
      </div>
    </div>
  )
}
