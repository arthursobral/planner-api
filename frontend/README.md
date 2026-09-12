# planner-api — frontend

Interface do planner-api (Fase 1 do roteiro). Consome a API via HTTP — o backend
sobe separado, ver `../README.md`.

## Stack

React + TypeScript + Vite, Tailwind v4 (tokens copiados da direção "Vitrine" do
[Planner v2](../../Planner-v2), aprovada em `../PROJETO.md`), Phosphor Icons,
Sora empacotada via `@fontsource-variable/sora` (sem chamada de rede em runtime —
mesma escolha do Planner v2, este app também guarda avaliação nominal de
pessoas reais). Testes com Vitest + Testing Library.

## Como rodar

```bash
# backend, num terminal separado (ver ../README.md):
docker compose up

# frontend:
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173`. Por padrão aponta para a API em
`http://localhost:8000` — copie `.env.example` para `.env.local` se precisar
mudar isso.

## Estrutura

```
src/
  api/        cliente HTTP (client.ts) e tipos espelhando app/schemas.py (types.ts)
  auth/       AuthContext — sessão via JWT, guardada em localStorage
  components/ UI compartilhada, portada do Planner v2 (FormPanel, Select, CampoData, DisplayStats, DesfazerBar)
  domain/     lógica pura de UI (formatação de data, cor/proporção da barra de idade)
  screens/    uma tela por arquivo — Login, Tickets, Tarefas, Equipe, Pauta, Acompanhamentos, Calls
  App.tsx     casca: header, navegação por abas, portão de autenticação
```

Cada tela em `src/screens/` é independente — busca seus próprios dados e não
depende de estado de outra tela (exceção: `Equipe.tsx` importa `Pauta.tsx`,
mesmo relacionamento do `EvaluationPanel`/`UmAum` no Planner v2).

## Testes

```bash
npm test
```

## O que foi deixado de fora de propósito

- **Router.** As "telas" são abas trocadas por estado local (`useState`), não
  URLs — mesmo padrão do Planner v2. Não há navegação profunda (voltar do
  browser, links diretos) que justifique um roteador aqui.
- **Serviço de frontend no `docker-compose.yml`.** O Vite dev server prefere
  sistema de arquivos local (bind mount no Docker Desktop deixa o HMR lento no
  Windows); `npm run dev` local é mais rápido para o dia a dia. Containerizar
  fica para o dia de um build de produção de verdade.
- **ESLint/Prettier.** O template já vem com `oxlint` (Rust, rápido); adicionar
  os dois só quando fizer falta de verdade.
