import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../api/client'
import type { Todo } from '../api/types'
import { Tarefas } from './Tarefas'

vi.mock('../api/client')

const apiFetchMock = vi.mocked(apiFetch)

const TODOS: Todo[] = [
  {
    id: 1,
    texto: 'Revisar PR',
    concluido: false,
    status: 'em-progresso',
    nivel: 0,
    criado_em: '2026-01-01T00:00:00',
  },
  {
    id: 2,
    texto: 'Escrever teste',
    concluido: false,
    status: 'testando',
    nivel: 0,
    criado_em: '2026-01-01T00:00:00',
  },
  {
    id: 3,
    texto: 'Planejar sprint',
    concluido: false,
    status: 'todo',
    nivel: 0,
    criado_em: '2026-01-01T00:00:00',
  },
  {
    id: 4,
    texto: 'Reunião 1:1',
    concluido: true,
    status: 'concluido',
    nivel: 0,
    criado_em: '2026-01-01T00:00:00',
  },
]

beforeEach(() => {
  apiFetchMock.mockReset()
})

// RTL não faz cleanup automático aqui: o vitest.config.ts do projeto não liga
// `globals: true`, então o hook de auto-cleanup da lib nunca se registra.
afterEach(cleanup)

describe('Tarefas', () => {
  it('busca a lista e mostra os itens agrupados por status', async () => {
    apiFetchMock.mockResolvedValueOnce([...TODOS])
    render(<Tarefas />)

    expect(await screen.findByText('Revisar PR')).toBeVisible()
    expect(screen.getByText('Escrever teste')).toBeVisible()
    expect(screen.getByText('Planejar sprint')).toBeVisible()
    expect(screen.getByText('1 de 4 prontos')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Em progresso' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Em teste' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Sem começar' })).toBeVisible()

    // concluídos ficam recolhidos por padrão.
    expect(screen.queryByText('Reunião 1:1')).not.toBeInTheDocument()
  })

  it('colar uma lista chama POST /todos com o texto e a flag certos', async () => {
    const user = userEvent.setup()
    apiFetchMock.mockResolvedValueOnce([...TODOS])
    render(<Tarefas />)
    await screen.findByText('Revisar PR')

    apiFetchMock.mockResolvedValueOnce([
      {
        id: 5,
        texto: 'Novo item',
        concluido: false,
        status: 'todo',
        nivel: 0,
        criado_em: '2026-01-01T00:00:00',
      },
    ])

    await user.click(screen.getByRole('button', { name: /colar lista/i }))
    await user.click(screen.getByLabelText(/cole a lista/i))
    await user.paste('* [ ] Novo item')
    await user.click(screen.getByRole('button', { name: /adicionar itens/i }))

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith('/todos', {
        method: 'POST',
        body: JSON.stringify({ texto: '* [ ] Novo item', somente_marcados: false }),
      }),
    )
  })

  it('marcar um item como concluído chama POST /todos/{id}/alternar', async () => {
    const user = userEvent.setup()
    apiFetchMock.mockResolvedValueOnce([...TODOS])
    render(<Tarefas />)
    await screen.findByText('Revisar PR')

    apiFetchMock.mockResolvedValueOnce({ ...TODOS[0], concluido: true, status: 'concluido' })

    await user.click(screen.getByRole('checkbox', { name: /concluir: revisar pr/i }))

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith('/todos/1/alternar', { method: 'POST' }),
    )
  })
})
