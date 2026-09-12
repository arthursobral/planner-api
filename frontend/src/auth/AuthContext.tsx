import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { aoDeslogar, definirToken, login as loginApi, ApiError } from '../api/client'

const CHAVE_STORAGE = 'planner_token'

interface AuthContextValor {
  autenticado: boolean
  entrando: boolean
  erro: string | null
  entrar: (usuario: string, senha: string) => Promise<void>
  sair: () => void
}

const AuthContext = createContext<AuthContextValor | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(false)
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function sair() {
    localStorage.removeItem(CHAVE_STORAGE)
    definirToken(null)
    setAutenticado(false)
  }

  // Restaura sessão de uma visita anterior, e reage a um 401 de qualquer
  // chamada da API (token expirado) deslogando sozinho.
  useEffect(() => {
    const guardado = localStorage.getItem(CHAVE_STORAGE)
    if (guardado) {
      definirToken(guardado)
      setAutenticado(true)
    }
    aoDeslogar(sair)
  }, [])

  async function entrar(usuario: string, senha: string) {
    setEntrando(true)
    setErro(null)
    try {
      const { access_token } = await loginApi(usuario, senha)
      localStorage.setItem(CHAVE_STORAGE, access_token)
      definirToken(access_token)
      setAutenticado(true)
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível entrar')
      throw e
    } finally {
      setEntrando(false)
    }
  }

  return (
    <AuthContext.Provider value={{ autenticado, entrando, erro, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
