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

---

## Passo imediato: o frontend

Fases 1-3 são só API (Swagger como interface). Próximo passo natural: uma UI de
verdade para o agente/RAG/tickets — mencionado como "eventualmente" desde a Fase 2,
chegou a hora.

**Antes de codar, isto deve passar pelo mesmo processo das fases anteriores:**
Plan Mode, plano escrito, confirmação do Arthur antes de implementar. Não começar
direto.

### Decisões em aberto (perguntar, não presumir)

1. **Onde o frontend mora:** pasta `frontend/` dentro do próprio `planner-api`
   (monorepo), ou repositório separado? Se for monorepo, como o CI e o
   `docker-compose.yml` acomodam um serviço a mais.
2. **Stack:** a recomendação abaixo assume React + Vite + Tailwind v4 — mesma
   combinação do Planner v2 — porque é o que permite reaproveitar os tokens de
   design quase sem tradução. Confirmar com o Arthur antes de bater o martelo.
3. **Escopo da v1:** provavelmente login + tela de tickets/tarefas + a tela de
   chat do agente (RAG). A pauta de 1:1 e o diário podem ficar pra depois — perguntar.

### As skills a usar (as mesmas do Planner v2)

O Arthur pediu explicitamente para reaproveitar as skills e a direção visual já
aprovadas no Planner v2, não reinventar:

- **Skill `design`** (Claude Design canvas) — é como a direção visual do Planner v2
  foi decidida: um canvas com as telas como artboards, publicado como Artifact,
  antes de escrever uma linha de React. Usar o mesmo processo aqui: gerar o canvas,
  o Arthur aprova a direção, só depois implementar.
- **Skill `web-design-guidelines`** — revisão de código de UI contra as diretrizes
  de interface web (acessibilidade, contraste, foco, etc.). Rodar depois que as
  telas estiverem implementadas.
- **Skill `react-best-practices`** — 60+ regras de performance/boas práticas React
  (do pacote usado no Planner v2, `.claude/skills/react-best-practices/`). Usar
  durante a implementação dos componentes.
- Se o frontend ficar no mesmo diretório (`D:\Projetos Claude\`) que o Planner v2,
  as skills já instaladas em `Planner-v2/.claude/skills/` podem só ser copiadas;
  senão, reinstalar (`/plugin` ou o processo equivalente).

### Os tokens de design a reaproveitar (copiados do Planner v2, verbatim)

A direção aprovada no Planner v2 chama-se **"Vitrine"**. Canvas original:
`https://claude.ai/code/artifact/bbcdc86f-9bb5-4d2a-83ef-f9ea6305d7f7` (pode ter
expirado; se sim, regerar com a skill `design` usando os tokens abaixo).

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
docker compose up                          # sobe api + db + ollama
docker compose exec ollama ollama pull llama3.2:3b   # uma vez
python -m pytest tests -k domain           # testes puros, sem banco
python -m pytest tests/                    # suíte completa, precisa de `docker compose up -d db`
python scripts/avaliar_rag.py --usuario arthur --senha sua-senha   # avaliação manual do agente
```
