# RETOMAR — próximos passos do planner-api

Este arquivo é sobre o **futuro**. Para o que já foi feito e por quê, ver
`PROJETO.md`. Para como rodar/testar no dia a dia, ver `README.md` — não repito
aqui o que já está lá.

## Para abrir uma sessão nova

> Quero continuar o planner-api. Leia `PROJETO.md` (o que já foi feito) e este
> `RETOMAR.md` (os próximos passos) antes de propor qualquer coisa. Quero
> trabalhar em: [o item].

O repositório está em https://github.com/arthursobral/planner-api (público,
`master` protegida — todo trabalho novo é branch + PR, ver `README.md`).

**Regra permanente deste projeto (2026-09-12): nunca adicionar atribuição do
Claude/Anthropic em commits ou PRs aqui** (nem `Co-Authored-By`, nem
"Generated with"). O Arthur pediu explicitamente depois de notar a linha num PR
já mesclado — checamos via `gh api repos/arthursobral/planner-api/contributors`
e o Claude não aparece como contribuidor de verdade (o e-mail
`noreply@anthropic.com` não linka com conta nenhuma), mas a linha ainda
aparecia no texto do commit. Decisão: só parar de adicionar dali pra frente,
sem reescrever o histórico já público (a `master` protegida recusaria o
force-push mesmo que quiséssemos).

**Estado agora (2026-09-12), no meio do trabalho do frontend — ver seção
completa mais abaixo:**
- PR #6 (`frontend/00-setup`) aberto, CI verde, **aguardando sua revisão/merge**
  — https://github.com/arthursobral/planner-api/pull/6
- Canvas de design aprovado (com o ajuste do ícone panda já aplicado):
  https://claude.ai/code/artifact/1c58707d-cba9-4455-85ab-813e234bf190
- Próximo passo, só depois do merge do PR #6: disparar os 7 agents em paralelo
  (um por tela), cada um em branch própria. Ver "Plano dos 7 agents" abaixo —
  já está todo desenhado, é só executar.

---

## Decisão (2026-09-11): RAG/agente saem do planner-api

O RAG (Fase 2) e o agente com ferramentas (Fase 3) foram removidos deste
repositório. Motivo: manter o `planner-api` como o "Projeto Pessoal" puro (API de
planner — Fase 1 do roteiro), e mover o aprendizado de RAG/agentes para um
**projeto novo e separado**, sobre uma base de conhecimento diferente (candidato a
virar o "Projeto Produto" público das Fases 4-6, já que aquele nunca pode ser
este repositório com dado nominal real).

**Não fazer de novo:** o código removido (embeddings via `fastembed`, Postgres
+ `pgvector`, geração via Ollama local, agente com function calling, chunking,
avaliação por suíte de perguntas) já existiu e funcionou aqui — está no histórico
do git (PRs #2 e #3, branch/commits antes desta remoção). Ao começar o projeto
novo, vale revisar esse código como ponto de partida em vez de reprojetar do zero.

**Decisões em aberto para o projeto novo** (perguntar quando chegar a hora, não
presumir):
- Nome/local do repositório.
- Qual base de conhecimento pública vai alimentar o RAG (a régua do roteiro pede
  algo que "estranhos" possam consultar de verdade).
- Se mantém a regra de custo zero (embeddings/LLM locais) ou se, sendo um projeto
  público sem dado sensível, faz sentido usar uma API paga (ex.: Claude) para uma
  resposta melhor que os 67% medidos aqui com `llama3.2:3b`.

---

## O frontend — estado detalhado e próximos passos

Decisões já tomadas nesta sessão (não perguntar de novo):

1. **Onde mora:** monorepo, pasta `frontend/` dentro do próprio `planner-api`.
2. **Stack:** React + Vite + TypeScript + Tailwind v4 — mesma combinação do
   Planner v2, tokens portados quase sem tradução.
3. **Escopo da v1:** Login, Tickets (Atividades), Tarefas (Todos), Equipe
   (pontos de avaliação + diário) com a Pauta de 1:1 como sub-tela, Acompanhamentos,
   e **Calls** (notas de reunião — pedido depois, mesmo padrão do `CallNotes.tsx`
   do Planner v2). Sem RAG/chat: isso saiu do projeto (ver seção acima).
4. **Sem router.** Abas trocadas por `useState`, igual ao `App.tsx` do Planner v2
   — não há navegação profunda que justifique um roteador.
5. **Frontend não entra no `docker-compose.yml`.** Bind mount do Vite no Docker
   Desktop deixa o HMR lento no Windows; `npm run dev` local é mais rápido.
   Backend continua subindo com `docker compose up` (api + db).

### Canvas de design — aprovado

https://claude.ai/code/artifact/1c58707d-cba9-4455-85ab-813e234bf190

7 artboards (Login, Tickets, Tarefas, Equipe, Pauta, Acompanhamentos, Calls),
mockups estáticos, direção "Vitrine" fiel ao Planner v2 (tokens, componentes,
movimento — tudo lido direto do código-fonte de lá antes de desenhar, não
reinventado). Logo do header é o panda do Planner v2
(`Planner-v2/src/assets/panda.png`), copiado para
`frontend/src/assets/panda.png` — o Arthur pediu explicitamente pra reaproveitar
esse em vez de um ícone novo do svgrepo.com (o download direto de lá foi
bloqueado por proteção anti-bot do site).

### Scaffold — feito, PR #6 aberto aguardando revisão

https://github.com/arthursobral/planner-api/pull/6 (branch `frontend/00-setup`,
CI verde). Contém:

- Projeto Vite+React+TS em `frontend/`, Tailwind v4 com os tokens em
  `frontend/src/index.css` (copiados verbatim de `Planner-v2/src/index.css`).
- Componentes de UI portados do Planner v2, sem mudança de lógica:
  `FormPanel.tsx` (Campo, FormPanel, estilos de botão/campo), `Select.tsx`,
  `CampoData.tsx` (+ `domain/data.ts`), `DisplayStats.tsx`, `DesfazerBar.tsx` +
  `useRemocao.ts`. A única adaptação real: no Planner v2 o "desfazer" restaura
  do IndexedDB; aqui `desfazer` deve chamar o endpoint `/restaurar` real (o
  soft-delete já é uma chamada de API, não uma escrita local adiada).
- `frontend/src/api/client.ts` — fetch com header `Authorization: Bearer`,
  `ApiError` com a mensagem do `detail` do FastAPI, `login()` em
  `application/x-www-form-urlencoded` (é `OAuth2PasswordRequestForm`, não JSON).
- `frontend/src/api/types.ts` — interfaces TS espelhando `app/schemas.py`
  campo a campo (snake_case, sem camadas de tradução).
- `frontend/src/auth/AuthContext.tsx` — sessão via token em `localStorage`,
  desloga sozinho num 401 de qualquer chamada.
- `frontend/src/App.tsx` — header (panda + nome + data), 5 pills de navegação
  (Tickets/Tarefas/Equipe/Acompanhamentos/Calls), portão de autenticação
  (`Portao` renderiza `Login` ou o shell).
- Um arquivo-stub por tela em `frontend/src/screens/` (`Login.tsx`,
  `Tickets.tsx`, `Tarefas.tsx`, `Equipe.tsx`, `Pauta.tsx`,
  `Acompanhamentos.tsx`, `Calls.tsx`) — cada um já com um comentário grande no
  topo listando os endpoints exatos e o contrato de props que a implementação
  real vai usar. **`Equipe.tsx` importa `Pauta.tsx`** com a assinatura fixa
  `<Pauta pessoa={...} aoVoltar={...} />` (mesmo relacionamento
  `EvaluationPanel`/`UmAum` do Planner v2) — os dois agents que forem mexer
  nesses dois arquivos não podem mudar essa assinatura sem combinar.
- CORS liberado na API (`app/config.py`: `frontend_origin`, `app/main.py`:
  `CORSMiddleware`) para `http://localhost:5173`.
- Job `frontend` novo no CI (`.github/workflows/ci.yml`): lint (oxlint), testes
  (Vitest), build. Ainda não é um check obrigatório na ruleset da `master`
  (só `test` é) — considerar adicionar se quiser travar merge nele também.

**Antes de mexer em mais código:** revisar o PR #6. Se pedir mudança, ela deve
entrar nessa mesma branch antes do merge — os 7 agents do próximo passo vão
todos partir do estado pós-merge dela.

### Plano dos 7 agents em paralelo — pronto pra disparar depois do merge do PR #6

Pedido do Arthur: 7 agents, um por tela, cada um numa branch própria nomeada
pelo que fez, todos rodando ao mesmo tempo, cada um commitando (sem
`Co-Authored-By`, ver regra permanente no topo deste arquivo), PR aberto no
final — **sem merge automático**, o Arthur revisa e mescla cada PR manualmente.

Como isso fica tecnicamente possível sem os 7 pisarem uns nos outros: cada
agent roda com `isolation: "worktree"` (cria um worktree git isolado, branch
própria, sem disputa de arquivo de working directory com os outros) e cada um
só edita o arquivo da própria tela em `frontend/src/screens/` — o scaffold já
deixou tudo mais (App.tsx, componentes, api client, tokens) pronto e wireado,
então não há necessidade de nenhum agent tocar em arquivo compartilhado.

Branches sugeridas (nome = o que a branch faz):
- `frontend/01-login`
- `frontend/02-tickets`
- `frontend/03-tarefas`
- `frontend/04-equipe`
- `frontend/05-pauta`
- `frontend/06-acompanhamentos`
- `frontend/07-calls`

Cada agent recebe no prompt: o artboard correspondente no canvas de design, o
comentário-contrato já escrito no topo do próprio arquivo-stub (endpoints,
tipos, props), os componentes prontos em `frontend/src/components/`, e a
instrução de rodar `react-best-practices` (skill já copiada para
`.claude/skills/`) durante a implementação e deixar pelo menos um teste (Vitest
+ Testing Library) cobrindo o caminho principal da própria tela antes de
commitar. Rodar `web-design-guidelines` depois que as 7 telas estiverem
implementadas (skill também já copiada), numa passada só, não por agent.

### As skills já copiadas para este projeto

`.claude/skills/react-best-practices` e `.claude/skills/web-design-guidelines`
foram copiadas de `Planner-v2/.claude/skills/` nesta sessão (mesmo diretório
`D:\Projetos Claude\`, então foi só `cp -r`). A skill `design` (canvas) é do
próprio Claude Code, não precisa copiar.

### Os tokens de design — já implementados em `frontend/src/index.css`

Referência para quem for mexer nas telas (o CSS já existe, isto é só pra
entender o porquê). A direção chama-se **"Vitrine"**, aprovada originalmente no
Planner v2 (canvas de lá:
`https://claude.ai/code/artifact/bbcdc86f-9bb5-4d2a-83ef-f9ea6305d7f7`, pode ter
expirado) e reaprovada aqui no canvas novo linkado acima.

**Cores e superfícies:**
- Fundo: `radial-gradient(120% 70% at 50% -20%, #1b2a52 0%, transparent 60%)` sobre
  `#0d1226`.
- Superfície (cards, painéis): `linear-gradient(180deg, rgba(79,172,254,.055),
  rgba(79,172,254,0) 42%)` sobre `#131a34`, borda `rgba(120,160,230,.14)`, e
  **`box-shadow: inset 0 1px 0 rgba(190,215,255,.10)`** — esse realce interno de
  1px no topo é o que faz a peça parecer física; sem ele a direção perde a graça.
- Texto: `#ffffff` (ênfase), `#dfe4f0` (corpo), `#a8b2cf` (secundário), `#8b96b8`
  (apagado).
- Acento: `linear-gradient(135deg, #4facfe, #00f2fe)`, texto sobre acento
  `#0b1020`.
- Semântica: erro `#ff6b6b`/`#ff8a80`, atenção `#ffc107`/`#ffd54f`, sucesso
  `#4caf50`/`#81c784`.

**Escala de raio (regra fechada, não desviar):**

| valor | onde |
|---|---|
| 14px | superfície e card |
| 12px | controle de 38px ou mais |
| 10px | controle de até 34px |
| 9px | pílula e badge |
| 6px | checkbox |
| 2-3px | barra de progresso e marca de prioridade |

**Tipografia:** fonte Sora, pesos 300-700, fallback `'Segoe UI', system-ui`.
Numeral sempre com `font-variant-numeric: tabular-nums`. Título de tela 30px/600
com `letter-spacing: -0.8px`; número em display 34px/600 com `-1px`.

**Layout:** separação por espaço, não por régua. Itens de lista como superfícies
com `gap` de 11px. Um número promovido a display por tela, numa faixa sem caixa
nenhuma.

**Movimento — só estes quatro, nada além:**
1. Entrada em sequência de 60ms por bloco, `cubic-bezier(.16, 1, .3, 1)`, uma vez
   por tela.
2. Barra que cresce até o valor real (progresso, posição, tempo parado).
3. Realce de 1px ao apontar item interativo.
4. Feedback real na ação mais significativa da tela.

Todo movimento tem bloco `@media (prefers-reduced-motion: reduce)` que o desliga
por inteiro. **Entrada com fade em toda seção e hover em todo card é o padrão que
denuncia trabalho de IA** — evitar.

**Outras convenções do Planner v2 a manter:**
- Ícones: `@phosphor-icons/react`, uma família só, tamanho explícito.
- Nunca `<input type="date">` puro — ele desenha a data na região do navegador, não
  no idioma da página. Usar um componente próprio (`CampoData` no Planner v2) que
  mostra DD/MM/AAAA em texto e abre o calendário do sistema via `showPicker()` num
  input escondido com `opacity: 0` (não `display: none`).
- `<select>` sempre customizado (seta própria sobre o nativo), fundo opaco.
- Grau/enum gravado sem acento no banco (ex.: `Otimo`), acento só na exibição.

---

## Pendência: o "produto público" das Fases 4-6

As Fases 2-3 do roteiro original pediam um produto **público**, com link ao vivo,
que estranhos pudessem usar — isso foi conscientemente trocado por melhorar o
planner-api (privado) em vez disso. Essa troca resolve o aprendizado técnico, mas
**não resolve o item do portfólio** que é "algo no ar que um recrutador pode abrir
e usar". Isso continua pendente e não tem data.

**Conflito que precisa de decisão explícita quando chegar a hora:** a Fase 4
original do roteiro é inteira sobre AWS (LocalStack + Lambda/DynamoDB Always Free).
**O Arthur decidiu não usar AWS de jeito nenhum** — nem para praticar Terraform
contra o LocalStack, que nem precisa de conta. Isso significa que, quando esse
passo for retomado, a conversa precisa decidir:

- Pular o aprendizado de IaC/AWS do roteiro inteiramente, ou
- Fazer alguma versão equivalente com outra nuvem (o próprio roteiro já cogita
  Google Cloud Run + Supabase/Neon + Vercel/Netlify como alternativa **não-AWS**
  para hospedar o "Projeto Produto" na seção 4c — isso pode ser suficiente sem
  tocar em AWS/LocalStack nenhuma vez).

Resumo do que o roteiro original pede nessas fases, para referência (não decidir
nada disso agora, só ter o contexto pronto):

- **Fase 4c (a parte sem AWS):** hospedar o produto público em Cloud Run (ou
  equivalente), Postgres gerenciado (Supabase/Neon), frontend em
  Vercel/Netlify/GitHub Pages — todos com tier gratuito permanente. O único custo
  aceito conscientemente pelo roteiro é centavos de token de LLM por uso público
  — o que também esbarra na escolha já feita aqui de manter tudo local/gratuito.
- **Fase 5:** pipeline agendado de reingestão + testes de regressão de prompt +
  logs estruturados de custo/latência + rate limiting básico — só faz sentido
  quando existir de fato um produto público recebendo tráfego.
- **Fase 6:** site de portfólio reunindo os projetos, com o card do "Projeto
  Produto" linkando pro deploy ao vivo.

---

## Comandos de referência rápida

Tudo detalhado no `README.md`. Os mais usados:

```bash
docker compose up                          # sobe api + db
python -m pytest tests -k domain           # testes puros, sem banco
python -m pytest tests/                    # suíte completa, precisa de `docker compose up -d db`
```
