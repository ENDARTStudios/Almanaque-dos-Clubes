# Deploy web e custo de build (Vercel PRO)

Data: 04/11/2026
Contexto: o projeto `almanaque-dos-clubes` estourou o limite de gastos do plano PRO em
**Build CPU Minutes** e a produção foi pausada (`DEPLOYMENT_PAUSED`, HTTP 503).
Este documento registra a alternativa testada, o resultado e as opções seguintes.

## O que consumia Build CPU

O workflow `.github/workflows/deploy-web.yml` usava:

    npx vercel deploy --prod

Nesse modelo o código sobe para a Vercel e o **build roda na Vercel**: instalação de
dependências + `next build` + empacotamento de funções. Cada deploy de produção paga esse
custo em Build CPU Minutes. Os filtros de path e a integração nativa desligada
(`apps/web/vercel.json -> git.deploymentEnabled: false`) já evitavam builds de commits que
não tocam o app, mas todo merge que toca `apps/web/**` ou `packages/**` ainda construía
remotamente.

## Alternativa testada e revertida: build no runner do GitHub + deploy prebuilt

O build sai da Vercel:

1. `vercel link` / `vercel pull` trazem o vínculo e as variáveis de produção;
2. `vercel build --prod` roda **no runner do GitHub Actions** e gera `.vercel/output`;
3. `vercel deploy --prebuilt --prod` sobe o artefato já construído.

Os três comandos rodam na **raiz do repositório**, não dentro de `apps/web`: o projeto já tem
Root Directory = apps/web, e rodar o CLI de dentro da pasta faz o caminho virar
`apps/web/apps/web` (erro observado).

Resultado medido em 04/11/2026: os deployments prebuilt ficaram **Ready**, mas as páginas
serviram **erro de servidor** (env/runtime ausentes) e o build local no Windows gerou symlinks
que o upload não levou (`_global-error.segments/...` ausente). Ou seja: a redução de Build CPU
existe, mas o artefato não era confiável. O workflow foi **revertido** para o build remoto.

A medição de referência: `vercel deploy --prod` remoto concluiu o build em **9–21 s**; o build
prebuilt local levava **12–23 s**. O problema não era tempo, era correção do artefato.

Verificação feita localmente antes de mudar o workflow:

    # da RAIZ do repositório (o Root Directory do projeto é apps/web)
    vercel link --yes --project almanaque-dos-clubes --scope end-art-studios
    vercel pull --yes --environment=production
    vercel build --prod
    # -> "Build Completed in apps/web/.vercel/output [51s]"

O workflow agora tem `timeout-minutes: 20` e mantém os filtros de path existentes. O
`ignoreCommand` continua como guarda caso a integração nativa seja reativada.

## Token do GitHub Actions

O secret `VERCEL_TOKEN` está inválido: o workflow falha em `vercel link` com
`User not found (404)`. Enquanto o token não for rotacionado, o deploy automático não roda;
o deploy manual com o CLI autenticado funciona.

## Ação necessária na Vercel (Operador)

A pausa por limite de gastos **não é removida pelo CLI**. Para o próximo deploy rodar, é
preciso, no dashboard da Vercel:

1. revisar/regularizar o limite de gastos do time; e
2. reativar o projeto (unpause) quando o limite permitir.

Depois disso, o `Deploy Web` volta a usar o build remoto. Se o custo de Build CPU continuar acima do aceitável, o caminho é o container na Railway descrito abaixo.

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
