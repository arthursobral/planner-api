import { ListChecks, PhoneCall, Ticket, UserFocus, Users } from '@phosphor-icons/react'
import { useState } from 'react'
import panda from './assets/panda.png'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { Acompanhamentos } from './screens/Acompanhamentos'
import { Calls } from './screens/Calls'
import { Equipe } from './screens/Equipe'
import { Login } from './screens/Login'
import { Tarefas } from './screens/Tarefas'
import { Tickets } from './screens/Tickets'

const ABAS = [
  { id: 'tickets', rotulo: 'Tickets', icone: Ticket, Conteudo: Tickets },
  { id: 'tarefas', rotulo: 'Tarefas', icone: ListChecks, Conteudo: Tarefas },
  { id: 'equipe', rotulo: 'Equipe', icone: Users, Conteudo: Equipe },
  { id: 'acompanhamentos', rotulo: 'Acompanhamentos', icone: UserFocus, Conteudo: Acompanhamentos },
  { id: 'calls', rotulo: 'Calls', icone: PhoneCall, Conteudo: Calls },
] as const

type AbaId = (typeof ABAS)[number]['id']

function AppShell() {
  const [aba, setAba] = useState<AbaId>('tickets')
  const { sair } = useAuth()
  const ativa = ABAS.find((a) => a.id === aba) ?? ABAS[0]
  const { Conteudo } = ativa

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col gap-8 px-6 py-8 sm:px-10 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <img src={panda} alt="" width={26} height={26} style={{ filter: 'invert(1)' }} />
          <span className="text-base font-semibold text-fg">Planner</span>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-[13px] text-fg-muted">{hoje()}</span>
          <button
            type="button"
            onClick={sair}
            className="text-[13px] text-fg-muted transition-colors duration-150 hover:text-fg-body"
          >
            Sair
          </button>
        </div>
      </header>

      <nav aria-label="Seções">
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {ABAS.map(({ id, rotulo, icone: Icone }) => {
            const selecionada = id === aba
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={selecionada ? 'page' : undefined}
                  onClick={() => setAba(id)}
                  className={`flex h-[38px] items-center gap-2 rounded-[var(--radius-control)] px-4 text-sm transition-colors duration-150 ${
                    selecionada
                      ? 'bg-linear-[135deg,var(--accent),var(--accent-alt)] font-semibold text-fg-on-accent'
                      : 'border border-[rgba(120,160,230,0.16)] bg-[rgba(120,160,230,0.07)] text-fg-secondary hover:border-line-strong'
                  }`}
                >
                  <Icone size={16} weight={selecionada ? 'fill' : 'regular'} />
                  {rotulo}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* `key` remonta a seção ao trocar de aba, para a entrada em sequência
          (`rise`) rodar de novo — mesma regra do Planner v2. */}
      <main key={aba} className="flex-1">
        <Conteudo />
      </main>
    </div>
  )
}

function Portao() {
  const { autenticado } = useAuth()
  return autenticado ? <AppShell /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <Portao />
    </AuthProvider>
  )
}

function hoje(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}
