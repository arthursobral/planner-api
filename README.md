# planner-api

Projeto Pessoal do roteiro de portfólio de engenharia de IA — Fase 1. Uma API para
o problema real de um team lead: tickets de trabalho, lista de tarefas,
acompanhamento de itens com direct reports, notas de reunião e a montagem automática
da pauta de 1:1.

Inspirado no [Planner v2](../Planner-v2) (React/Dexie, uso diário real há 14 meses) —
mesmo domínio e mesmas regras de negócio já validadas, reescritas do zero em
FastAPI + SQLAlchemy + PostgreSQL. O Planner v2 não foi tocado; continua sendo a
ferramenta do dia a dia.

**Nota:** este repositório já teve um RAG e um agente com ferramentas (Fases 2-3 do
roteiro) rodando sobre esses mesmos dados. Foram removidos de propósito para
manter este projeto focado só na Fase 1 (API de planner) — RAG/agente vira
aprendizado em um projeto novo e separado, sobre uma base de conhecimento
diferente. Ver histórico do git (PRs #2 e #3) para o código removido.

## Stack

FastAPI, SQLAlchemy 2.0, PostgreSQL, JWT (usuário único), Docker Compose, pytest.

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
- **RAG e agente com ferramentas.** Existiram neste repositório (Fases 2-3 do
  roteiro, PRs #2 e #3) e foram removidos de propósito — ver a nota no topo deste
  README.
