import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('casca do app', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sem sessão salva, mostra a tela de login', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /entrar/i })).toBeVisible()
  })

  it('com um token salvo, mostra o shell autenticado com a navegação', () => {
    localStorage.setItem('planner_token', 'token-de-teste')
    render(<App />)
    expect(screen.getByRole('button', { name: 'Tickets' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Tarefas' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Equipe' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Acompanhamentos' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Calls' })).toBeVisible()
  })
})
