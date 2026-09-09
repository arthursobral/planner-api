# planner-api

Projeto Pessoal da Fase 1 do roteiro de portfólio de engenharia de IA. Uma API para
o problema real de um team lead: tickets de trabalho, lista de tarefas, acompanhamento
de itens com direct reports, notas de reunião e a montagem automática da pauta de 1:1
(o que mudou desde a última conversa registrada com cada pessoa).

Inspirado no [Planner v2](../Planner-v2) (React/Dexie, uso diário real há 14 meses) —
mesmo domínio e mesmas regras de negócio já validadas, reescritas do zero em
FastAPI + SQLAlchemy + PostgreSQL para a Fase 1 do roteiro. O Planner v2 não foi
tocado; continua sendo a ferramenta do dia a dia.

## Stack

FastAPI, SQLAlchemy 2.0, PostgreSQL, JWT (usuário único), Docker Compose, pytest.

Fase 1 é só API — sem frontend (isso entra na Fase 2, no Projeto Produto). A
interface para explorar/usar é o Swagger em `/docs`.

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

# puros, sem banco:
pytest tests/test_domain_*.py

# integração, precisa de Postgres rodando (docker compose up -d db):
pytest tests/
```

## O que foi deixado de fora de propósito (Fase 1)

- **Alembic/migrações.** Schema ainda simples e sem dado em produção — o app cria
  as tabelas sozinho no startup (`Base.metadata.create_all`). Trocar por migrações
  no dia em que o schema precisar evoluir sem poder recriar o banco do zero.
- **Backup/export JSON manual.** Só fazia sentido no Planner v2 porque o Dexie não
  tem servidor. Aqui o Postgres + o volume do Docker Compose já dão durabilidade —
  reinventar isso seria regredir, não portar.
- **Conteúdo institucional de progressão** (textos de expectativa por marco de
  tempo de casa). É propriedade do empregador de quem usa isto, não deste projeto
  — ver `criterios.local.json` acima.
- **Frontend e multiusuário/roles.** Fora do escopo desta fase do roteiro.
