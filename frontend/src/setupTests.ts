import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'

/**
 * Stub padrão de `fetch`: qualquer tela que carregue dados ao montar (a
 * maioria) dispararia uma chamada de rede de verdade em CI sem isso — não há
 * API rodando ali. Testes que precisam de uma resposta específica sobrescrevem
 * `global.fetch` no próprio `beforeEach`, depois deste rodar.
 */
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})
