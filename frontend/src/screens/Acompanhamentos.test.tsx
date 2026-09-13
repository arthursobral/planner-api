import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../api/client'
import type { Acompanhamento, Pessoa } from '../api/types'
import { Acompanhamentos } from './Acompanhamentos'

vi.mock('../api/client')

const apiFetchMock = vi.mocked(apiFetch)

const acompanhamentos: Acompanhamento[] = [
  {
    id: 1,
    atividade: 'Migração do pipeline Atlas',
    atividade_id: null,
    pessoa: 'Marina',
    pessoa_id_equipe: 10,
    status: 'Em Andamento',
    observacoes: null,
    criado_em: new Date(Date.now() - 9 * 86_400_000).toISOString(),
  },
  {
    id: 2,
    atividade: 'Revisão do contrato Nimbus',
    atividade_id: null,
    pessoa: 'Marcos',
    pessoa_id_equipe: null,
    status: 'Pausado',
    observacoes: null,
    criado_em: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
]

const pessoas: Pessoa[] = [
  { id: 10, nome: 'Marina', data_admissao: '2020-01-01', ultimo_1a1: null },
]

function mockRotas() {
  apiFetchMock.mockImplementation(async (caminho, opcoes) => {
    const metodo = opcoes?.method
    if (caminho === '/pessoas') return pessoas as never
    if (caminho === '/acompanhamentos' && metodo === undefined) return acompanhamentos as never
    if (caminho === '/acompanhamentos' && metodo === 'POST') {
      const corpo = JSON.parse(opcoes!.body as string)
      return {
        id: 99,
        atividade_id: null,
        pessoa_id_equipe: null,
        status: 'Em Andamento',
        criado_em: new Date().toISOString(),
        ...corpo,
      } as never
    }
    const statusMatch = /^\/acompanhamentos\/(\d+)\/status$/.exec(caminho)
    if (statusMatch && metodo === 'PATCH') {
      const corpo = JSON.parse(opcoes!.body as string)
      const original = acompanhamentos.find((a) => a.id === Number(statusMatch[1]))!
      return { ...original, ...corpo } as never
    }
    throw new Error(`rota não mockada: ${caminho} ${metodo ?? 'GET'}`)
  })
}

beforeEach(() => {
  apiFetchMock.mockReset()
  mockRotas()
})

afterEach(cleanup)

describe('Acompanhamentos', () => {
  it('lista os acompanhamentos agrupados por pessoa', async () => {
    render(<Acompanhamentos />)

    expect(await screen.findByRole('heading', { name: 'Marina' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Marcos' })).toBeVisible()
    expect(screen.getByText('Migração do pipeline Atlas')).toBeVisible()
    expect(screen.getByText('Revisão do contrato Nimbus')).toBeVisible()
    // Marina está na equipe (pessoa_id_equipe = 10), Marcos não.
    expect(screen.getByText('equipe')).toBeVisible()
  })

  it('cria um acompanhamento com o payload certo', async () => {
    const usuario = userEvent.setup()
    render(<Acompanhamentos />)
    await screen.findByRole('heading', { name: 'Marina' })

    await usuario.click(screen.getByRole('button', { name: 'Novo acompanhamento' }))
    await usuario.type(screen.getByLabelText('O que você está acompanhando'), 'Nova atividade')
    await usuario.type(screen.getByLabelText('Com quem'), 'Alguém de fora')
    await usuario.click(screen.getByRole('button', { name: 'Acompanhar' }))

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        '/acompanhamentos',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            atividade: 'Nova atividade',
            pessoa: 'Alguém de fora',
            observacoes: null,
          }),
        }),
      )
    })
  })

  it('muda o status de um item via PATCH', async () => {
    const usuario = userEvent.setup()
    render(<Acompanhamentos />)
    await screen.findByRole('heading', { name: 'Marina' })

    await usuario.selectOptions(
      screen.getByLabelText('Status de Migração do pipeline Atlas'),
      'Finalizado',
    )

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        '/acompanhamentos/1/status',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'Finalizado' }) }),
      )
    })
    expect(await screen.findByText('Migração do pipeline Atlas')).toHaveClass('line-through')
  })
})
