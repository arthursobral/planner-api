import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Pauta as PautaApi, Pessoa } from '../api/types'
import { apiFetch } from '../api/client'
import { Pauta } from './Pauta'

vi.mock('../api/client', () => ({ apiFetch: vi.fn() }))

const pessoa: Pessoa = { id: 1, nome: 'Marina', data_admissao: '2025-01-01', ultimo_1a1: '2026-08-28' }

const pautaMock: PautaApi = {
  pessoa: { id: 1, nome: 'Marina' },
  tempo_de_casa: '14 meses',
  marco_atual: { id: 'consolidacao', titulo: 'Consolidação', secoes: [{ titulo: 'Geral', itens: ['Item do marco'] }] },
  proximo_marco: null,
  desde: '2026-08-28',
  novidades: [{ em: '2026-08-29', texto: 'Comentou sobre o cliente Atlas' }],
  anteriores: [],
  abertos: [{ texto: 'Comunicação assíncrona', grau: 'Medio' }],
  evoluidos: [{ texto: 'Documentação dos tickets', grau: 'Evoluido', resolvido_em: '2026-08-12' }],
  fortes: [{ texto: 'Entregou antes do prazo', grau: 'Otimo' }],
}

describe('Pauta', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
  })

  afterEach(cleanup)

  it('renderiza o cabeçalho e as seções a partir da pauta carregada', async () => {
    vi.mocked(apiFetch).mockResolvedValue(pautaMock)
    render(<Pauta pessoa={pessoa} aoVoltar={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Marina' })).toBeVisible()
    expect(screen.getByText(/14 meses de casa, marco Consolidação/)).toBeVisible()
    expect(screen.getByText('Comentou sobre o cliente Atlas')).toBeVisible()
    expect(screen.getByText('A trabalhar')).toBeVisible()
    expect(screen.getByText('Comunicação assíncrona')).toBeVisible()
    expect(screen.getByText('Evoluiu')).toBeVisible()
    expect(screen.getByText('Pontos fortes')).toBeVisible()
    expect(screen.getByText('Entregou antes do prazo')).toBeVisible()
  })

  it('clicar em Voltar chama aoVoltar', async () => {
    vi.mocked(apiFetch).mockResolvedValue(pautaMock)
    const aoVoltar = vi.fn()
    render(<Pauta pessoa={pessoa} aoVoltar={aoVoltar} />)
    await screen.findByRole('heading', { name: 'Marina' })

    await userEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(aoVoltar).toHaveBeenCalledTimes(1)
  })

  it('clicar em Registrar como feito faz POST /pessoas/{id}/1a1', async () => {
    vi.mocked(apiFetch).mockImplementation((caminho) => {
      if (caminho === '/pessoas/1/pauta') return Promise.resolve(pautaMock)
      return Promise.resolve(pessoa)
    })
    render(<Pauta pessoa={pessoa} aoVoltar={vi.fn()} />)
    await screen.findByRole('heading', { name: 'Marina' })

    await userEvent.click(screen.getByRole('button', { name: /registrar como feito/i }))

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/pessoas/1/1a1', { method: 'POST' })
    })
    expect(await screen.findByText('Registrado')).toBeVisible()
  })
})
