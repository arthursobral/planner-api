# planner-api — o que foi feito até agora

Histórico e decisões do projeto. Para "como rodar no dia a dia", ver `README.md`.
Para "o que falta e como retomar em outra sessão", ver `RETOMAR.md` — este arquivo
é só o passado, não o futuro.

**Nota (2026-09-11):** as Fases 2 e 3 (seções 6 e 7 abaixo) foram implementadas,
usadas e depois **removidas** deste repositório. Ficam registradas aqui como
histórico real do que foi feito — o código em si não existe mais na `master`
(ver git log dos PRs #2/#3 para recuperá-lo). Motivo e o que vem no lugar: ver
`RETOMAR.md`.

## 1. De onde veio

Arthur é Team Lead há 3,5 anos na Wall Street Docs e está seguindo um roteiro de
portfólio (`roteiro-portfolio-ia.md`) para migrar pra Engenharia de IA. O roteiro
pede dois projetos-âncora: um **Projeto Pessoal** (privado, resolve um problema real
seu) e um **Projeto Produto** (público, estranhos usam de verdade, fica no ar).

Decisão tomada logo no início: em vez de construir um "Projeto Pessoal" (Fase 1) E
depois um "Projeto Produto" (Fases 2-6) como dois repositórios separados, as Fases
2 e 3 foram aplicadas **dentro do mesmo planner-api**, sobre o dado pessoal do
Arthur, em vez de um projeto novo e público. Motivo: mais valor real (ele
efetivamente usa a ferramenta), zero trabalho descartável. **Consequência que fica
em aberto:** o requisito de "produto público com link ao vivo" das Fases 4-6 não
foi resolvido por isso — ver `RETOMAR.md`.

Outra decisão permanente: **Arthur não vai usar AWS**, nem para praticar. Isso some
o essencial da Fase 4 original do roteiro (que é inteira sobre AWS) — também
tratado em `RETOMAR.md`, não aqui.

O planner-api é inspirado no [Planner v2](../Planner-v2) (React + Dexie/IndexedDB,
uso diário real há 14 meses) — mesmo domínio (tickets, tarefas, acompanhamento de
direct reports, notas de reunião, avaliação qualitativa da equipe), mesmas regras
de negócio já validadas por uso real, reescritas do zero em Python. **O Planner v2
não foi tocado** e continua sendo a ferramenta do dia a dia — o planner-api é o
projeto de portfólio, não substitui nada.

## 2. Estado do repositório

- **URL:** https://github.com/arthursobral/planner-api — **público** (decisão
  consciente: nada de dado sensível é versionado — ver seção 5).
- **Branch `master` protegida:** push direto é recusado por uma ruleset do GitHub.
  Toda mudança entra por Pull Request, e só mescla com o check `test` (CI) verde.
  Não exige aprovação de outra pessoa (projeto solo) — só a existência do PR com
  diff visível. Nem o dono pode contornar (`current_user_can_bypass: never`).
- **Fluxo de trabalho** (documentado também no README):
  ```bash
  git checkout -b fase-x-o-que-mudou
  # ... commits ...
  git push -u origin fase-x-o-que-mudou
  gh pr create --fill
  # depois que o CI passar:
  gh pr merge --squash --delete-branch
  ```
- **3 PRs mesclados até agora:**
  - #1 — Documenta o fluxo de PR obrigatório para a master
  - #2 — Fase 2: busca semântica (RAG) sobre os próprios dados
  - #3 — Fase 3: agente com ferramentas (function calling)
- **CI (GitHub Actions):** lint (`ruff`) + testes de domínio (puros) + testes de
  integração (Postgres real via `docker compose`) + build da imagem Docker. Roda em
  todo push e PR. Não depende de Ollama (pesado demais para CI) — isso fica pra
  verificação manual.
- **43 testes automatizados**, 11 arquivos em `tests/`, todos passando.

## 3. Fase 0 — Setup

Confirmada como feita pelo Arthur (repo `github-profile`, etc.) numa conversa
anterior a este projeto — não há registro técnico aqui porque não é código deste
repositório.

## 4. Fase 1 — Projeto Pessoal (o planner-api em si)

**Objetivo do roteiro:** aprender FastAPI + banco de dados construindo algo real,
não um CRUD de exemplo.

**Stack:** FastAPI, SQLAlchemy 2.0, PostgreSQL, JWT (usuário único, sem tabela de
usuários), Docker Compose (`api` + `db`), pytest, GitHub Actions.

**Domínio**, portado das regras de negócio do Planner v2 (mesmos nomes, mesma
lógica, ids agora são SERIAL do Postgres em vez do truque `Date.now()` do
original):

| Entidade | O que é |
|---|---|
| `Pessoa` | Roster da equipe — dado no banco, nunca constante no código |
| `Atividade` | Ticket de trabalho — staleness calculada (`DIAS_ATENCAO=8`, `DIAS_PARADO=22`), arquivar é passo obrigatório antes de remover |
| `Todo` | Lista de tarefas — parser de texto colado (`parseTodos` portado) |
| `Acompanhamento` | Item sendo cobrado com qualquer pessoa (texto livre, não só a equipe) |
| `Anotacao` | Diário por pessoa — data do fato editável, separada de `criado_em` |
| `PontoAvaliacao` | Ponto qualitativo — identidade é (pessoa, tipo, texto); recriar o mesmo texto reativa em vez de duplicar |
| `Reuniao` | Notas de call — autosave não gera evento, de propósito |
| `Evento` | Log de auditoria — toda mutação grava um, exceto o autosave de `Reuniao` |

**Peça mais interessante:** `app/domain/pauta.py` — monta a pauta de 1:1 (o que
mudou desde a última conversa com cada pessoa), função pura portada de
`Planner-v2/src/domain/umAum.ts`. Deliberadamente **sem** o conteúdo institucional
de progressão do empregador (isso não pertence a um repositório de portfólio) —
fica em `criterios.local.json`, opcional, nunca versionado.

**Padrão de soft-delete:** `removido_em` em toda entidade mutável, nunca `DELETE`.
Toda mutação loga em `Evento`, exceto autosave.

**Auth:** um único usuário, credenciais no `.env` (`ADMIN_USER` +
`ADMIN_PASSWORD_HASH`, hash bcrypt). JWT emitido por `/auth/login`.

## 5. Privacidade — a regra que governa todo o resto

Este projeto guarda (ou vai guardar, quando o Arthur usar de verdade) avaliação
nominal de pessoas reais. Regras não-negociáveis, válidas desde a Fase 1 e nunca
relaxadas nas Fases 2-3:

- **Nada sai da máquina.** Zero chamada de rede externa no código do app — LLM e
  embeddings são locais (Ollama, fastembed). A única exceção seria uma API
  paga/externa, e isso foi deliberadamente evitado mesmo quando o roteiro sugeria
  (ver Fase 3).
- **`.env` nunca é commitado.** Só `.env.example` com placeholders.
- **O seed do repositório (`app/seed.py`) só usa nomes gerados por Faker.** Dado
  real do time do Arthur, se ele cadastrar, fica só no volume Postgres local dele.
- **`criterios.local.json`** (conteúdo institucional do empregador) nunca é
  versionado.
- Consequência prática: o repositório pode ser público (é, hoje) porque nada nele
  identifica o Arthur, a WSD ou qualquer pessoa real do time dele.

## 6. Fase 2 — RAG: busca semântica sobre os próprios dados (PR #2)

**Adaptação do roteiro:** a Fase 2 original pede um RAG público sobre uma base de
conhecimento aberta. Aqui, a "base de conhecimento" são os próprios registros do
Arthur (tickets, anotações, calls, acompanhamentos, pontos de avaliação) —
resolvendo o problema real "o que eu já registrei sobre X" (cotado como melhoria
no `PROJETO.md` do Planner v2 original).

**Arquitetura:**
- **Vector DB:** Postgres com `pgvector` (reaproveita o banco da Fase 1 em vez de
  somar Chroma).
- **Embeddings:** locais via `fastembed` (ONNX Runtime — sem PyTorch), modelo
  `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensões,
  multilíngue porque o conteúdo é pt-BR).
- **Geração:** Ollama local, modelo `llama3.2:3b`. Custo: **US$ 0** por pergunta.
- **Chunking:** trivial (cada registro curto é seu próprio chunk); só
  `Reuniao.texto` (pode ficar longo) ganha um chunker por parágrafo.
- Endpoints: `POST /rag/reindexar` (full-rebuild manual da tabela `fragmentos`) e
  `POST /rag/perguntar`.

**Resultado medido** (`scripts/avaliar_rag.py`, 12 perguntas fixas sobre o seed de
demonstração): **8/12 (67%)**. Diagnóstico: a busca (retrieval) sempre encontra o
trecho certo — visível em `fontes` de cada resposta — mas o modelo local de 3B às
vezes não sintetiza bem a partir de um trecho mais abaixo no contexto. É o teto de
qualidade de um modelo pequeno e gratuito, não um problema no pipeline.

## 7. Fase 3 — Agente com ferramentas (PR #3)

**Evolução do mesmo produto** (não um projeto novo): o LLM ganha ferramentas e
decide, em loop, qual usar antes de responder — function calling de verdade via
Ollama `/api/chat` (não prompt manual).

**4 ferramentas** (`app/rag/ferramentas.py`):

| Ferramenta | Para quê |
|---|---|
| `buscar_nos_registros` | A própria busca da Fase 2, agora uma ferramenta entre outras |
| `consultar_metricas` | Contagens agregadas que texto não responde (tickets parados/em atenção, pontos negativos abertos, acompanhamentos pausados) — enum fechado de 4, não SQL livre |
| `calcular` | Aritmética via AST (`ast.parse` + whitelist de operadores), nunca `eval()` |
| `dias_uteis_ate` | Dias úteis com feriados nacionais, via lib `holidays` **local** |

**Desvio deliberado do roteiro:** o roteiro sugere "buscar numa API pública
complementar" como ferramenta externa. Isso seria uma chamada de rede — contraria
a regra da seção 5. `dias_uteis_ate` cobre o mesmo papel pedagógico ("o agente usa
algo fora do vector DB") sem abrir uma exceção na regra mais importante do projeto.

**Loop do agente** (`app/rag/agente.py:executar_loop`): limite de 5 iterações
(evita rodar pra sempre); erro de ferramenta vira texto de resultado, nunca
exceção não tratada — o modelo vê a falha e decide o que fazer. Recebe a chamada
ao LLM como parâmetro injetável, o que permite testar a lógica do loop inteira
(múltiplas rodadas, erro tratado, estouro de limite) **sem Ollama de verdade** —
ver `tests/test_rag_agente.py`.

**Resultado medido:** 4/4 perguntas reais roteadas pra ferramenta certa com
resposta correta (uma por ferramenta, log de decisão documentado no README). A
suíte de 12 perguntas da Fase 2, rodando agora pelo agente: 8/12 (67%) — igual à
Fase 2, confirma que o agente não piora a busca por texto. Duas melhorias
genéricas de prompt (instrução explícita pra basear a resposta no resultado da
ferramenta, e um campo `name` na mensagem de resultado) resolveram uma falha real
observada: o agente escolhia a ferramenta certa mas ignorava o resultado dela ao
responder.

## 8. Convenções que atravessam o projeto

- Soft-delete (`removido_em`) em tudo, nunca `DELETE` de verdade.
- Toda mutação loga em `Evento`, exceto autosave de `Reuniao`.
- `Base.metadata.create_all` no startup, não Alembic — schema ainda simples, sem
  dado em produção. Revisitar se o schema precisar evoluir sem recriar o banco.
- Domínio puro (`app/domain/`, `app/rag/chunking.py`, `app/rag/agente.py:executar_loop`)
  aceita dependências injetáveis (`agora`, `hoje`, `chamar`) — é o que permite
  testar a lógica sem banco nem LLM de verdade.
- Exceções de ferramenta/execução externa nunca sobem cruas — viram resultado
  tratável pelo chamador (mesmo padrão em `ferramentas.executar` e no loop do
  agente).
