# Deploy web e custo de build (Vercel PRO)

Data: 04/11/2026
Contexto: o projeto `almanaque-dos-clubes` estourou o limite de gastos do plano PRO em
**Build CPU Minutes** e a produção foi pausada (`DEPLOYMENT_PAUSED`, HTTP 503).
Este documento registra a alternativa adotada e as opções seguintes.

## O que consumia Build CPU

O workflow `.github/workflows/deploy-web.yml` usava:

    npx vercel deploy --prod

Nesse modelo o código sobe para a Vercel e o **build roda na Vercel**: instalação de
dependências + `next build` + empacotamento de funções. Cada deploy de produção paga esse
custo em Build CPU Minutes. Os filtros de path e a integração nativa desligada
(`apps/web/vercel.json -> git.deploymentEnabled: false`) já evitavam builds de commits que
não tocam o app, mas todo merge que toca `apps/web/**` ou `packages/**` ainda construía
remotamente.

## Alternativa adotada: build no runner do GitHub + deploy prebuilt

O build sai da Vercel:

1. `vercel link` / `vercel pull` trazem o vínculo e as variáveis de produção;
2. `vercel build --prod` roda **no runner do GitHub Actions** e gera `.vercel/output`;
3. `vercel deploy --prebuilt --prod` sobe o artefato já construído.

Resultado esperado: **zero Build CPU Minutes** da Vercel para os deploys de produção; o custo
de build vira tempo de GitHub Actions (incluído no plano do repositório). O serving da Vercel
continua igual.

Verificação feita localmente antes de mudar o workflow:

    cd apps/web
    vercel build --prod
    # -> "Build Completed in apps/web/.vercel/output [51s]"

O workflow agora tem `timeout-minutes: 20` e mantém os filtros de path existentes. O
`ignoreCommand` continua como guarda caso a integração nativa seja reativada.

## Ação necessária na Vercel (Operador)

A pausa por limite de gastos **não é removida pelo CLI**. Para o próximo deploy rodar, é
preciso, no dashboard da Vercel:

1. revisar/regularizar o limite de gastos do time; e
2. reativar o projeto (unpause) quando o limite permitir.

Depois disso, o primeiro `Deploy Web` já usa o caminho prebuilt e não deve consumir Build CPU.

## Se o custo de serving ainda for problema: Railway

A API já é hospedada na Railway. A alternativa de menor atrito para o web é um serviço de
container no mesmo provedor:

- `apps/web` com `output: 'standalone'` no `next.config` (gera `server.js` e dependências
  mínimas);
- Dockerfile multi-stage (deps → build → runner) escutando em `$PORT`;
- variáveis de ambiente equivalentes às da Vercel;
- domínio `almanaquedosclubes.com` reapontado no DNS depois do teste em URL da Railway.

Trade-offs: mais operação (container, logs, rollback) e perda dos previews automáticos da
Vercel; em troca, o custo deixa de ser por Build CPU/deployment e vira preço fixo de serviço.
Não implementado neste repositório — é o próximo passo somente se o serving da Vercel continuar
acima do aceitável.

## Alternativas descartadas por ora

- **Cloudflare Pages/Workers**: exigiria adapter (OpenNext) e validação de SSR/ISR; migração
  maior que o ganho imediato.
- **Export estático**: a aplicação tem sessão, rotas protegidas e renderização dinâmica;
  export estático perderia funcionalidade.
- **Netlify**: mesmos builds remotos; trocaria um fornecedor por outro sem resolver a causa.
