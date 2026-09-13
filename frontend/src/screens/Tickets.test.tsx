import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Atividade } from '../api/types'
import { Tickets } from './Tickets'

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
}))

const { apiFetch } = await import('../api/client')
const apiFetchMock = vi.mocked(apiFetch)

function atividade(sobrescrever: Partial<Atividade> = {}): Atividade {
  return {
    id: 1,
    nome: 'Migração do pipeline',
    prioridade: 'Alta',
    descricao: null,
    status: 'Pendente',
    criado_em: '2026-08-01T00:00:00Z',
    arquivada_em: null,
    dias_parado: 22,
    faixa: 'parado',
    ...sobrescrever,
  }
}

describe('Tickets', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renderiza os tickets vindos da API', async () => {
    apiFetchMock.mockResolvedValueOnce([atividade()])

    render(<Tickets />)

    expect(await screen.findByText('Migração do pipeline')).toBeVisible()
    expect(apiFetchMock).toHaveBeenCalledWith('/atividades?correntes=true')
    expect(screen.getByText('Um ticket aberto')).toBeVisible()
  })

  it('criar um ticket novo chama POST /atividades com o payload certo', async () => {
    const usuario = userEvent.setup()
    apiFetchMock.mockResolvedValueOnce([])
    render(<Tickets />)
    await waitFor(() => expect(screen.getByText('Nada em aberto')).toBeVisible())

    await usuario.click(screen.getByRole('button', { name: 'Novo ticket' }))
    await usuario.type(screen.getByLabelText('Nome do ticket'), 'Revisão de contrato')

    apiFetchMock.mockResolvedValueOnce(
      atividade({ id: 2, nome: 'Revisão de contrato', dias_parado: 0, faixa: 'em-dia' }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Abrir ticket' }))

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith('/atividades', {
        method: 'POST',
        body: JSON.stringify({ nome: 'Revisão de contrato', prioridade: 'Média' }),
      }),
    )
  })

  it('mudar o status chama PATCH /atividades/{id}/status', async () => {
    const usuario = userEvent.setup()
    apiFetchMock.mockResolvedValueOnce([atividade()])
    render(<Tickets />)
    await screen.findByText('Migração do pipeline')

    apiFetchMock.mockResolvedValueOnce(atividade({ status: 'Em Andamento' }))
    await usuario.selectOptions(
      screen.getByLabelText('Status de Migração do pipeline'),
      'Em Andamento',
    )

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith('/atividades/1/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Em Andamento' }),
      }),
    )
  })
})
