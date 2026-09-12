import { useAuth } from '../auth/AuthContext'
import { Campo, estiloCampo, estiloPrimario } from '../components/FormPanel'

export function Login() {
  const { entrar, entrando, erro } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        className="rise surface flex w-full flex-col gap-6 rounded-[var(--radius-surface)] px-8 py-9"
        style={{ maxWidth: 380 }}
        onSubmit={(e) => {
          e.preventDefault()
          const dados = new FormData(e.currentTarget)
          void entrar(String(dados.get('usuario')), String(dados.get('senha')))
        }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="text-[13px] text-fg-muted">planner-api</div>
          <h1 className="m-0 text-2xl font-semibold tracking-[-0.4px] text-fg">Entrar</h1>
        </div>

        <div className="flex flex-col gap-4">
          <Campo rotulo="Usuário" htmlFor="usuario">
            <input
              id="usuario"
              name="usuario"
              type="text"
              autoComplete="username"
              placeholder="seu usuário"
              className={estiloCampo}
            />
          </Campo>
          <Campo rotulo="Senha" htmlFor="senha">
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              placeholder="sua senha"
              className={erro ? `${estiloCampo} border-high/55` : estiloCampo}
            />
          </Campo>
          {erro && (
            <p role="alert" aria-live="polite" className="m-0 text-[13px] text-high-soft">
              {erro}
            </p>
          )}
        </div>

        <button type="submit" disabled={entrando} className={`${estiloPrimario} w-full justify-center`}>
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="text-center text-xs text-fg-muted">
          Ferramenta pessoal — acesso de usuário único
        </div>
      </form>
    </div>
  )
}
