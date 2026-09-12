import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../api/client'
import type { Reuniao } from '../api/types'
import { Calls } from './Calls'

vi.mock('../api/client', () => ({ apiFetch: vi.fn() }))

const apiFetchMock = vi.mocked(apiFetch)

const reunioesMock: Reuniao[] = [
  {
    id: 1,
    titulo: 'Call semanal com o cliente Atlas',
    em: '2026-09-08',
    texto: 'Discutimos o andamento.\n* [ ] mandar o rascunho',
    criado_em: '2026-09-08T10:00:00',
    atualizado_em: '2026-09-08T10:00:00',
  },
  {
    id: 2,
    titulo: 'Retrospectiva do onboarding',
    em: '2026-08-27',
    texto: '',
    criado_em: '2026-08-27T10:00:00',
    atualizado_em: '2026-08-27T10:00:00',
  },
]

beforeEach(() => {
  apiFetchMock.mockReset()
})

afterEach(cleanup)

describe('Calls', () => {
  it('lista as calls retornadas pela API', async () => {
    apiFetchMock.mockResolvedValueOnce(reunioesMock)

    render(<Calls />)

    expect(await screen.findByText('2 calls anotadas')).toBeVisible()
    expect(screen.getByText('Call semanal com o cliente Atlas')).toBeVisible()
    expect(screen.getByText('Retrospectiva do onboarding')).toBeVisible()
  })

  it('"Nova call" chama POST /reunioes e abre a call criada expandida', async () => {
    const user = userEvent.setup()
    apiFetchMock.mockResolvedValueOnce([])
    render(<Calls />)
    await screen.findByText('Nenhuma call anotada')

    const criada: Reuniao = {
      id: 3,
      titulo: '',
      em: '2026-09-12',
      texto: '',
      criado_em: '2026-09-12T10:00:00',
      atualizado_em: '2026-09-12T10:00:00',
    }
    apiFetchMock.mockResolvedValueOnce(criada)

    await user.click(screen.getByRole('button', { name: 'Nova call' }))

    expect(apiFetchMock).toHaveBeenCalledWith('/reunioes', expect.objectContaining({ method: 'POST' }))
    // Item recém-criado abre expandido: campo de título editável aparece.
    expect(await screen.findByLabelText('Título da call')).toBeVisible()
  })

  it('digitar no texto de uma call aberta dispara autosave (PATCH) depois do debounce', async () => {
    const user = userEvent.setup()
    apiFetchMock.mockResolvedValueOnce([reunioesMock[0]])
    render(<Calls />)

    await user.click(await screen.findByText('Call semanal com o cliente Atlas'))
    const textarea = await screen.findByLabelText('Anotações da call')

    apiFetchMock.mockResolvedValue(reunioesMock[0])
    await user.type(textarea, ' mais uma linha')

    await waitFor(
      () => {
        expect(apiFetchMock).toHaveBeenCalledWith('/reunioes/1', expect.objectContaining({ method: 'PATCH' }))
      },
      { timeout: 2000 },
    )
  })
})
