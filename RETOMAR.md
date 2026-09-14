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

**Regra permanente deste projeto: nunca adicionar atribuição do
Claude/Anthropic em commits ou PRs aqui** (nem `Co-Authored-By`, nem
"Generated with"). O Arthur pediu explicitamente depois de notar a linha num PR
já mesclado — checamos via `gh api repos/arthursobral/planner-api/contributors`
e o Claude não aparece como contribuidor de verdade (o e-mail
`noreply@anthropic.com` não linka com conta nenhuma), mas a linha ainda
aparecia no texto do commit. Decisão: só parar de adicionar dali pra frente,
sem reescrever o histórico já público (a `master` protegida recusaria o
force-push mesmo que quiséssemos).

---

## Estado em 2026-09-14: frontend v1 concluído e mesclado

As 7 telas (Login, Tickets, Tarefas, Equipe, Pauta do 1:1, Acompanhamentos,
Calls) estão implementadas, testadas e **mescladas na master** — histórico
completo, decisões e tokens de design em `PROJETO.md`, seção 9. Canvas de
design aprovado:
https://claude.ai/code/artifact/1c58707d-cba9-4455-85ab-813e234bf190

**Como rodar e testar:** `docker compose up` (api + db) num terminal, `cd
frontend && npm install && npm run dev` noutro, abre `http://localhost:5173`.
Login com o usuário/senha do `.env` (`ADMIN_USER`/`ADMIN_PASSWORD_HASH`).

**Duas pegadinhas de ambiente, já resolvidas mas fáceis de esquecer:**
- `docker compose up -d` **não reconstrói a imagem da API sozinho** — se você
  mudar algo em `app/` (como o CORS foi mudado nesta rodada) e o container
  parecer não refletir a mudança, rode `docker compose up -d --build api`.
- O `.env` precisa de `ADMIN_PASSWORD_HASH` gerado com
  `python -c "from app.security import hash_password; print(hash_password('sua-senha'))"`,
  colado com cada `$` duplicado para `$$` (o docker compose interpola `$` em
  arquivos `.env` — comentário já no `.env.example`).

### Pendências pequenas, não bloqueantes

- **`frontend/vite.config.ts` não tem `globals: true`** no bloco `test`, então
  o auto-cleanup do Testing Library não é automático — cada arquivo de teste
  contorna isso com um `afterEach(cleanup)` próprio (funciona, só é repetido
  7x). Trocar por `globals: true` (ou um `afterEach(cleanup)` central em
  `setupTests.ts`) e remover os repetidos, se quiser limpar a duplicação.
- **Skill `web-design-guidelines` ainda não rodou** sobre as 7 telas reais
  (só foi usada pra aprovar o canvas antes de codar). Vale rodar uma passada
  de revisão (acessibilidade, contraste, foco) agora que o código existe.
- **Job `frontend` do CI ainda não é obrigatório** na ruleset da `master` (só
  `test`, o backend, é). Foi assim que dois bugs de teste do frontend (PRs
  #16 e #19) chegaram a ficar mesclados por um tempo sem bloquear nada — considerar
  adicionar `frontend` como check obrigatório também, na ruleset do GitHub.
- **Multiusuário: não existe.** Confirmado com o Arthur — é um app pessoal de
  propósito, sem tabela de usuários nem `usuario_id` em nenhuma tabela. Se
  algum dia isso mudar, é uma migração de schema de verdade, não uma feature
  que já está lá desligada.

---

## Decisão (2026-09-11): RAG/agente saem do planner-api

O RAG (Fase 2) e o agente com ferramentas (Fase 3) foram removidos deste
repositório. Motivo: manter o `planner-api` como o "Projeto Pessoal" puro (API de
planner — Fase 1 do roteiro), e mover o aprendizado de RAG/agentes para um
**projeto novo e separado**, sobre uma base de conhecimento diferente (candidato a
virar o "Projeto Produto" público das Fases 4-6, já que aquele nunca pode ser
este repositório com dado nominal real). **Ainda não começado.**

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

Tudo detalhado no `README.md` (backend) e `frontend/README.md`. Os mais usados:

```bash
docker compose up                          # sobe api + db
docker compose up -d --build api           # reconstrói a imagem da API depois de mudar app/
python -m pytest tests -k domain           # testes puros, sem banco
python -m pytest tests/                    # suíte completa, precisa de `docker compose up -d db`

cd frontend
npm install && npm run dev                 # UI em http://localhost:5173
npm test                                   # 24 testes (Vitest)
npm run build                              # inclui checagem de tipos (tsc -b)
```
