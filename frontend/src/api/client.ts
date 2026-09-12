/**
 * Cliente HTTP fino para o planner-api. Sem SDK gerado: a API é pequena o
 * bastante para um `fetch` só, com autenticação e erro tratados num lugar.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

let token: string | null = null
let aoNaoAutorizado: (() => void) | null = null

/** Chamado pelo AuthContext ao logar/deslogar — evita import circular. */
export function definirToken(novoToken: string | null): void {
  token = novoToken
}

/** Chamado pelo AuthContext para reagir a um 401 vindo de qualquer chamada. */
export function aoDeslogar(callback: () => void): void {
  aoNaoAutorizado = callback
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function extrairErro(resp: Response): Promise<string> {
  try {
    const corpo = (await resp.json()) as { detail?: unknown }
    if (typeof corpo.detail === 'string') return corpo.detail
  } catch {
    // corpo não é JSON — usa o texto de status mesmo.
  }
  return resp.statusText || `Erro ${resp.status}`
}

export async function apiFetch<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const cabecalhos = new Headers(opcoes.headers)
  if (token) cabecalhos.set('Authorization', `Bearer ${token}`)
  if (opcoes.body && !cabecalhos.has('Content-Type')) {
    cabecalhos.set('Content-Type', 'application/json')
  }

  const resp = await fetch(`${BASE_URL}${caminho}`, { ...opcoes, headers: cabecalhos })

  if (resp.status === 401) {
    aoNaoAutorizado?.()
    throw new ApiError(401, 'Sessão expirada')
  }
  if (!resp.ok) {
    throw new ApiError(resp.status, await extrairErro(resp))
  }
  if (resp.status === 204) return undefined as T
  return (await resp.json()) as T
}

/** POST /auth/login espera `application/x-www-form-urlencoded` (OAuth2PasswordRequestForm). */
export async function login(usuario: string, senha: string): Promise<{ access_token: string }> {
  const corpo = new URLSearchParams({ username: usuario, password: senha })
  const resp = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo,
  })
  if (!resp.ok) throw new ApiError(resp.status, await extrairErro(resp))
  return (await resp.json()) as { access_token: string }
}
