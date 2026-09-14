import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Anotacao, Pessoa, Ponto } from '../api/types'
import { Equipe } from './Equipe'

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

const { apiFetch } = await import('../api/client')
const apiFetchMock = vi.mocked(apiFetch)

const PESSOAS: Pessoa[] = [
  { id: 1, nome: 'Marina', data_admissao: '2024-01-01', ultimo_1a1: null },
  { id: 2, nome: 'Diego', data_admissao: '2023-01-01', ultimo_1a1: null },
]

const PONTOS_MARINA: Ponto[] = [
  {
    id: 10,
    pessoa_id: 1,
    tipo: 'negativo',
    texto: 'Ponto A',
    grau: 'Medio',
    criado_em: '2025-01-01T00:00:00Z',
    resolvido_em: null,
  },
]

const ANOTACOES_MARINA: Anotacao[] = [
  { id: 20, pessoa_id: 1, texto: 'Nota A', em: '2025-01-01', criado_em: '2025-01-01T00:00:00Z' },
]

function configurarMock() {
  apiFetchMock.mockImplementation((caminho: string, opcoes: RequestInit = {}) => {
    const metodo = opcoes.method ?? 'GET'

    if (caminho === '/pessoas') return Promise.resolve(PESSOAS)

    if (caminho === '/pontos?pessoa_id=1') return Promise.resolve(PONTOS_MARINA)
    if (caminho === '/pontos?pessoa_id=2') return Promise.resolve([])

    if (caminho === '/anotacoes?pessoa_id=1') return Promise.resolve(ANOTACOES_MARINA)
    if (caminho === '/anotacoes?pessoa_id=2') return Promise.resolve([])

    if (caminho === '/anotacoes' && metodo === 'POST') {
      const corpo = JSON.parse(String(opcoes.body))
      return Promise.resolve({ id: 999, criado_em: '2025-01-02T00:00:00Z', ...corpo })
    }

    return Promise.resolve([])
  })
}

describe('Equipe', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    configurarMock()
  })

  // O vitest.config.ts do projeto não liga `globals`, então a limpeza
  // automática do Testing Library (que depende de `afterEach` global) nunca
  // dispara — sem isso, o DOM de um teste vaza para o próximo.
  afterEach(cleanup)

  it('carrega as pessoas e, ao trocar de pessoa, recarrega pontos e anotações', async () => {
    render(<Equipe />)

    expect(await screen.findByRole('heading', { name: 'Marina' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Diego' })).toBeVisible()
    expect(await screen.findByText('Ponto A')).toBeVisible()
    expect(await screen.findByText('Nota A')).toBeVisible()

    apiFetchMock.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Diego' }))

    expect(await screen.findByRole('heading', { name: 'Diego' })).toBeVisible()
    expect(apiFetchMock).toHaveBeenCalledWith('/pontos?pessoa_id=2')
    expect(apiFetchMock).toHaveBeenCalledWith('/anotacoes?pessoa_id=2')
    expect(await screen.findByText(/Nenhum ponto registrado para Diego/)).toBeVisible()
    expect(screen.getByText(/Nada anotado ainda/)).toBeVisible()
  })

  it('adicionar uma anotação chama POST /anotacoes com o payload certo', async () => {
    render(<Equipe />)
    await screen.findByText('Nota A')

    await userEvent.click(screen.getByRole('button', { name: 'Anotar' }))
    await userEvent.type(screen.getByLabelText('O que aconteceu'), 'Assumiu uma tarefa nova')
    await userEvent.click(screen.getByRole('button', { name: 'Anotar' }))

    const hoje = new Date().toISOString().slice(0, 10)
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/anotacoes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ pessoa_id: 1, texto: 'Assumiu uma tarefa nova', em: hoje }),
      }),
    )
  })

  it('clicar em "Preparar 1:1" troca para a tela de Pauta', async () => {
    render(<Equipe />)
    await screen.findByRole('heading', { name: 'Marina' })

    await userEvent.click(screen.getByRole('button', { name: /Preparar 1:1/ }))

    expect(await screen.findByText(/Pauta de Marina/)).toBeVisible()
  })
})
