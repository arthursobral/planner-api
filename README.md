# planner-api

Projeto Pessoal do roteiro de portfólio de engenharia de IA — Fases 1 a 3. Uma API
para o problema real de um team lead: tickets de trabalho, lista de tarefas,
acompanhamento de itens com direct reports, notas de reunião, a montagem automática
da pauta de 1:1 e, desde a Fase 2, um agente com busca semântica e ferramentas sobre
os próprios registros.

Inspirado no [Planner v2](../Planner-v2) (React/Dexie, uso diário real há 14 meses) —
mesmo domínio e mesmas regras de negócio já validadas, reescritas do zero em
FastAPI + SQLAlchemy + PostgreSQL. O Planner v2 não foi tocado; continua sendo a
ferramenta do dia a dia.

**Nota sobre o roteiro:** as Fases 2 e 3 originais pedem um "Projeto Produto" novo e
público (RAG e depois agente sobre uma base de conhecimento aberta), porque esse
produto precisa ficar no ar publicamente nas Fases 4-6. Aqui as duas foram aplicadas
**dentro do planner-api** — mesmas peças técnicas (embeddings, vector DB, retrieval,
function calling, tratamento de erro e limite de iterações), mas sobre dado pessoal,
então **este repositório nunca vai ao ar publicamente com dado real**. Quando chegar
a hora do "produto público com link ao vivo", a mesma engine será reaproveitada
contra uma base pública separada — isso ainda não foi feito.

## Stack

FastAPI, SQLAlchemy 2.0, PostgreSQL + pgvector, JWT (usuário único), Ollama (LLM
local), fastembed (embeddings locais), Docker Compose, pytest.

Segue sem frontend — a interface para explorar/usar é o Swagger em `/docs`. Um
frontend é coisa para mais adiante, sem data definida.

## Fluxo de trabalho

`master` é protegida: push direto é recusado, toda mudança entra por Pull Request,
e o PR só pode ser mesclado com o CI verde (`test` no GitHub Actions). Não precisa
de aprovação de outra pessoa — é um projeto solo — mas precisa existir o PR, com o
diff visível, um por vez.

```bash
git checkout -b fase-x-o-que-mudou
# ... commits ...
git push -u origin fase-x-o-que-mudou
gh pr create --fill
# depois que o CI passar:
gh pr merge --squash
```

## Como rodar

```bash
cp .env.example .env
# gere um hash de senha (dentro do container, sem precisar instalar nada local):
docker compose run --rm --no-deps api python -c "from app.security import hash_password; print(hash_password('sua-senha'))"
# cole o resultado em ADMIN_PASSWORD_HASH no .env, trocando cada "$" por "$$"
# (ver comentário no .env.example — é um detalhe de como o docker compose lê .env)

docker compose up
```

Abre em `http://localhost:8000/docs`. Faça login em `/auth/login` (usuário/senha do
`.env`), use o botão "Authorize" do Swagger com o token retornado, e explore os
endpoints.

Num banco vazio e com `SEED_DEMO_DATA=true` (padrão), a API cadastra sozinha um
punhado de pessoas/tickets/tarefas **fictícios** (gerados com Faker) só para ter algo
para explorar. Ligue `SEED_DEMO_DATA=false` para começar realmente vazio.

## RAG + agente: perguntas sobre os próprios dados

Responde perguntas como "o que eu fiz para o cliente Atlas em março" (busca
semântica) ou "quantos tickets estão parados" (métrica agregada) ou "quantos dias
úteis faltam até dia 30" (cálculo de calendário) — o agente decide sozinho qual
ferramenta usar, em loop, antes de responder. Roda 100% local (custo: **US$ 0** por
pergunta).

```bash
# uma vez, depois do `docker compose up`: baixa o modelo (~2GB)
docker compose exec ollama ollama pull llama3.2:3b
```

No Swagger, autentique e chame `POST /rag/reindexar` sempre que quiser atualizar o
índice de busca com o que mudou (não é automático de propósito — ver
`app/rag/indexar.py`), depois `POST /rag/perguntar` com `{"pergunta": "..."}`. A
resposta vem com `fontes` (os registros que embasaram uma busca, quando houve) e
`ferramentas_usadas` (quais ferramentas o agente decidiu chamar, na ordem).

### As 4 ferramentas (`app/rag/ferramentas.py`)

| Ferramenta | Para quê |
|---|---|
| `buscar_nos_registros` | Busca semântica no texto — a peça da Fase 2 |
| `consultar_metricas` | Contagens agregadas (tickets parados/em atenção, pontos negativos abertos, acompanhamentos pausados) |
| `calcular` | Aritmética simples — avaliada via AST, nunca `eval()` |
| `dias_uteis_ate` | Dias úteis até uma data, com feriados nacionais |

**Por que não uma "API pública" de verdade como o roteiro sugere:** isso seria uma
chamada de rede saindo da máquina, contrariando a regra mais importante do projeto
desde a Fase 1. `dias_uteis_ate` cobre o mesmo papel ("o agente decide usar algo
fora do vector DB") com a biblioteca `holidays` — feriados embutidos localmente,
sem rede nenhuma.

O loop (`app/rag/agente.py:executar_loop`) tem limite de 5 passos (evita rodar pra
sempre) e trata erro de ferramenta como resultado, não como exceção — o modelo vê
que falhou e decide o que fazer. `docker compose logs api` mostra cada decisão:

```
[agente] chamando ferramenta: consultar_metricas({'metrica': 'tickets_parados'})
[agente] chamando ferramenta: dias_uteis_ate({'data': '2026-09-30'})
[agente] chamando ferramenta: buscar_nos_registros({'consulta': 'fornecedor de logs escolhido no onboarding'})
[agente] chamando ferramenta: calcular({'expressao': '(120 + 30) / 3'})
```

**4 casos de teste reais** (`llama3.2:3b`, seed de demonstração), um por ferramenta —
critério de conclusão da Fase 3:

| Pergunta | Ferramenta | Resposta |
|---|---|---|
| Quantos tickets estão parados? | `consultar_metricas` | "0 ticket(s) parado(s)." |
| Quantos dias úteis faltam até 2026-09-30? | `dias_uteis_ate` | "Até 2026-09-30, faltam 14 dias úteis." |
| Qual fornecedor de logs foi escolhido no onboarding? | `buscar_nos_registros` | "O fornecedor de logs escolhido no onboarding foi o Datadog." |
| Quanto é (120 + 30) dividido por 3? | `calcular` | "A resposta é 50,0." |

Para conferir a qualidade num conjunto maior e fixo de perguntas (usa o seed de
demonstração; a mesma suíte da Fase 2, agora passando pelo agente):

```bash
python scripts/avaliar_rag.py --usuario arthur --senha sua-senha
```

Esse script não roda no CI — depende do modelo do Ollama já baixado (pesado demais
para rodar a cada push). É verificação manual, mesmo tratamento que os testes E2E
do Planner v2 original.

**Resultado medido:** **8/12 (67%)** — igual ao da Fase 2, confirmando que passar
pelo agente não piora a busca por texto. Inspecionando `fontes` de cada resposta:
**a busca sempre encontra o trecho certo**; as falhas são o modelo local de 3B
parâmetros não sintetizando bem uma resposta longa a partir do contexto (em duas
delas ele responde errado com confiança em vez de dizer "não sei" — vale saber
disso antes de confiar cegamente na resposta). Um modelo maior (ou uma API paga
como Claude Haiku) teria menos disso — mantido local de propósito, por custo, não
por falta de alternativa melhor.

## Privacidade — leia antes de usar com dado real

Este projeto nasceu inspirado numa ferramenta que guarda avaliação nominal de
pessoas de verdade. Três regras não são negociáveis:

- **Nunca commitar `.env`.** Ele tem o segredo do JWT e a senha do único usuário.
  Só `.env.example`, com placeholders, é versionado.
- **O seed do repositório (`app/seed.py`) só usa nomes gerados por Faker.** Se você
  quiser cadastrar pessoas reais para uso pessoal, cadastre pelas rotas da própria
  API (`POST /pessoas`, etc.) — esse dado fica só no volume Docker do seu Postgres
  local, nunca no git.
- **`criterios.local.json`** (se você criar um, para preencher a seção de
  expectativas da pauta de 1:1 — ver `app/domain/pauta.py`) também nunca é
  versionado: é conteúdo institucional do seu empregador, não deste projeto.
- **Nenhuma chamada de rede externa** acontece no código deste app. Se um dia a
  Fase 4 do roteiro cogitar publicar isto na AWS para praticar Terraform/Lambda,
  só com o dataset de demonstração (Faker) — nunca com dado nominal real.

## Testes

```bash
pip install -r requirements-dev.txt

# "python -m pytest", não só "pytest": é o que garante a raiz do projeto no
# sys.path, para o "import app" funcionar sem instalar o pacote.
#
# "-k domain" em vez de "tests/test_domain_*.py": PowerShell não expande "*"
# para comandos externos como bash faz — o glob chegaria literal no pytest e
# ele não acharia o arquivo. "-k" filtra pelo nome e funciona igual nos dois.

# puros, sem banco:
python -m pytest tests -k domain

# integração, precisa de Postgres rodando (docker compose up -d db):
python -m pytest tests/
```

## O que foi deixado de fora de propósito

**Fase 1:**
- **Alembic/migrações.** Schema ainda simples e sem dado em produção — o app cria
  as tabelas sozinho no startup (`Base.metadata.create_all`). Trocar por migrações
  no dia em que o schema precisar evoluir sem poder recriar o banco do zero.
- **Backup/export JSON manual.** Só fazia sentido no Planner v2 porque o Dexie não
  tem servidor. Aqui o Postgres + o volume do Docker Compose já dão durabilidade —
  reinventar isso seria regredir, não portar.
- **Conteúdo institucional de progressão** (textos de expectativa por marco de
  tempo de casa). É propriedade do empregador de quem usa isto, não deste projeto
  — ver `criterios.local.json` acima.
- **Frontend e multiusuário/roles.** Fora do escopo do roteiro até aqui.

**Fase 2:**
- **Reindexação automática por evento.** `POST /rag/reindexar` é manual. Reindexar
  a cada escrita é a automação da Fase 5 (pipeline contínuo) — prematuro com um
  dataset pessoal pequeno.
- **Índice ANN (ivfflat/hnsw) no pgvector.** Sequential scan resolve bem para
  algumas centenas de linhas; relevante na casa dos milhares.

**Fase 3:**
- **Bot em Discord/Telegram/Slack.** Explicitamente opcional no roteiro; sem uso
  real aqui — um team lead não vai perguntar métrica de time num chat de time.
- **Ferramenta de rede externa de verdade.** Ver a explicação de `dias_uteis_ate`
  acima — contrariaria a regra mais importante do projeto.
- **`consultar_metricas` com SQL livre.** Enum fechado de 4 métricas cobre o caso
  real; gerar SQL a partir de linguagem natural é superfície de ataque sem
  necessidade correspondente aqui.
- **O "produto público"** das Fases 4-6 continua para depois.
