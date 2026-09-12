import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/AuthContext'
import { Login } from './Login'

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const useAuthMock = vi.mocked(useAuth)

function mockAuth(sobrescreve: Partial<ReturnType<typeof useAuth>> = {}) {
  useAuthMock.mockReturnValue({
    autenticado: false,
    entrando: false,
    erro: null,
    entrar: vi.fn(),
    sair: vi.fn(),
    ...sobrescreve,
  })
}

describe('Login', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renderiza os campos de usuário e senha com rótulos visíveis', () => {
    mockAuth()
    render(<Login />)
    expect(screen.getByLabelText('Usuário')).toBeVisible()
    const senha = screen.getByLabelText('Senha')
    expect(senha).toBeVisible()
    expect(senha).toHaveAttribute('type', 'password')
  })

  it('chama entrar com os valores digitados ao submeter', async () => {
    const entrar = vi.fn()
    mockAuth({ entrar })
    const user = userEvent.setup()
    render(<Login />)

    await user.type(screen.getByLabelText('Usuário'), 'arthur')
    await user.type(screen.getByLabelText('Senha'), 'segredo123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(entrar).toHaveBeenCalledWith('arthur', 'segredo123')
  })

  it('mostra a mensagem de erro quando erro não é null', () => {
    mockAuth({ erro: 'Usuário ou senha incorretos' })
    render(<Login />)
    expect(screen.getByRole('alert')).toHaveTextContent('Usuário ou senha incorretos')
  })

  it('desabilita o botão e muda o texto enquanto entrando', () => {
    mockAuth({ entrando: true })
    render(<Login />)
    const botao = screen.getByRole('button', { name: 'Entrando...' })
    expect(botao).toBeDisabled()
  })
})
