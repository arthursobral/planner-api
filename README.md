# planner-api

Projeto Pessoal do roteiro de portfólio de engenharia de IA — Fases 1 e 2. Uma API
para o problema real de um team lead: tickets de trabalho, lista de tarefas,
acompanhamento de itens com direct reports, notas de reunião, a montagem automática
da pauta de 1:1 e, desde a Fase 2, busca semântica (RAG) sobre os próprios registros.

Inspirado no [Planner v2](../Planner-v2) (React/Dexie, uso diário real há 14 meses) —
mesmo domínio e mesmas regras de negócio já validadas, reescritas do zero em
FastAPI + SQLAlchemy + PostgreSQL. O Planner v2 não foi tocado; continua sendo a
ferramenta do dia a dia.

**Nota sobre o roteiro:** a Fase 2 original pede um "Projeto Produto" novo e público
(RAG sobre uma base de conhecimento aberta), porque esse produto precisa ficar no ar
publicamente nas Fases 4-6. Aqui a Fase 2 foi aplicada **dentro do planner-api** —
mesmas peças técnicas (embeddings, chunking, vector DB, retrieval, geração com
citação), mas sobre dado pessoal, então **este repositório nunca vai ao ar
publicamente com dado real**. Quando chegar a hora do "produto público com link ao
vivo", a mesma engine de RAG será reaproveitada contra uma base pública separada —
isso ainda não foi feito.

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

## RAG: busca semântica sobre os próprios dados

Responde perguntas como "o que eu fiz para o cliente Atlas em março" buscando nos
seus próprios tickets, anotações de diário, calls, acompanhamentos e pontos de
avaliação — não inventa, cita a fonte, e roda 100% local (custo: **US$ 0** por
pergunta).

```bash
# uma vez, depois do `docker compose up`: baixa o modelo (~2GB)
docker compose exec ollama ollama pull llama3.2:3b
```

No Swagger, autentique e chame `POST /rag/reindexar` sempre que quiser atualizar o
índice com o que mudou (não é automático de propósito — ver `app/rag/indexar.py`),
depois `POST /rag/perguntar` com `{"pergunta": "..."}`. A resposta vem com `fontes`:
a lista de registros (entidade + id) que embasaram a resposta.

Para conferir a qualidade das respostas contra um conjunto fixo de perguntas (usa o
seed de demonstração):

```bash
python scripts/avaliar_rag.py --usuario arthur --senha sua-senha
```

Esse script não roda no CI — depende do modelo do Ollama já baixado (pesado demais
para rodar a cada push). É verificação manual, mesmo tratamento que os testes E2E
do Planner v2 original.

**Resultado medido** (seed de demonstração, `llama3.2:3b`, `temperature=0` para
reprodutibilidade): **8/12 (67%)**. Custo: **US$ 0** — geração e embeddings 100%
locais.

As 4 perguntas que falham têm um padrão claro, visto inspecionando `fontes` de cada
resposta: **a busca (retrieval) sempre encontra o trecho certo** — ele aparece na
lista de fontes retornada — mas o modelo de 3B parâmetros às vezes não consegue
extrair a resposta de um trecho que está mais abaixo na lista de contexto, e
responde "não encontrou essa informação" mesmo com o fato presente. Ou seja: a parte
de engenharia (embeddings + pgvector + retrieval) funciona; o teto de qualidade
aqui é do modelo local pequeno, não do pipeline. Um modelo maior (ou uma API paga
como Claude Haiku) resolveria essas 4 perguntas — foi mantido local de propósito
por custo, não por falta de alternativa melhor.

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
- **Fase 3 (agente com ferramentas)** e o **"produto público"** das Fases 4-6
  ficam para depois — este PR é só a Fase 2.
