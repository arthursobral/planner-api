/**
 * STUB — substituir pela tela real de login.
 *
 * Contrato: nenhuma prop. Usa `useAuth()` (src/auth/AuthContext.tsx) para
 * chamar `entrar(usuario, senha)`; `entrando` e `erro` já vêm prontos do
 * contexto para o estado de carregando e a mensagem de erro. Ver o artboard
 * "Login" no canvas de design aprovado para o layout exato (cartão "surface"
 * centralizado, campos usuário/senha, botão primário "Entrar").
 */
import { useAuth } from '../auth/AuthContext'

export function Login() {
  const { entrar, entrando, erro } = useAuth()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form
        className="surface flex flex-col gap-4 rounded-[var(--radius-surface)] p-8"
        style={{ width: 360 }}
        onSubmit={(e) => {
          e.preventDefault()
          const dados = new FormData(e.currentTarget)
          void entrar(String(dados.get('usuario')), String(dados.get('senha')))
        }}
      >
        <h1 className="m-0 text-xl font-semibold text-fg">Entrar (stub)</h1>
        <input name="usuario" placeholder="usuário" className="rounded-lg border border-line bg-[#0f1530] p-2 text-fg-body" />
        <input name="senha" type="password" placeholder="senha" className="rounded-lg border border-line bg-[#0f1530] p-2 text-fg-body" />
        {erro && <p className="text-sm text-high-soft">{erro}</p>}
        <button type="submit" disabled={entrando} className="rounded-lg bg-accent p-2 font-semibold text-fg-on-accent">
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
