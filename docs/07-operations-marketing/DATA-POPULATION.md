# DATA-POPULATION.md — popular o banco de produção (Almanaque dos Clubes)

> O banco de produção é **PostgreSQL interno da Railway** (postgres.railway.internal), **não alcançável fora da rede do projeto**. Por isso o seed/ETL **deve ser executado dentro do ambiente Railway**, onde o DATABASE_URL de produção é injetado.

## 1. Por que o site está vazio
- API /clubs, /players, /rankings, /competitions retornam **total: 0** (banco de produção sem registros).
- A home afirma "50k+ Clubes / 200k+ Jogadores / 10k+ Competições / 1M+ Partidas" — **não comprovados** por dados reais (risco de publicidade enganosa - CDC).

## 2. Seed pronto (dados reais brasileiros, idempotente)
O repositório já tem apps/api/prisma/seed.ts (10 clubes reais: Flamengo, Palmeiras, Santos, Corinthians, São Paulo, Cruzeiro, Grêmio, Internacional, Atlético-MG, Fluminense; 3 competições: Brasileirão Série A, Copa do Brasil, Libertadores; 2 rankings; RBAC). É idempotente (upsert) — pode rodar repetido.

### Rodar na Railway (uma vez, com as envs de produção)

Via Railway CLI (a partir da raiz do repo):

    railway run pnpm --filter @almanaque/api exec tsx prisma/seed.ts

Ou, em execução única (one-off), na pasta apps/api com o DATABASE_URL de produção injetado:

    npx tsx prisma/seed.ts

Confirme que as **migrações** estão aplicadas no banco de produção antes do seed (prisma migrate status com o DATABASE_URL de produção). As tabelas já existem (a API consulta e retorna vazio), então o seed é seguro.

## 3. O que o seed resolve / não resolve
- Dá **dados reais** ao site (10 clubes etc.) — deixa de exibir "Explore 0".
- **Não** chega a "50k+". Para isso é preciso um **ETL real** de fontes externas: wikidata, rsssf, fbref, football-data, openstreetmap, wikimedia-commons, thesportsdb (listadas em apps/api/src/modules/etl/service.ts), que exigem workers de fila (BullMQ/Redis) rodando no Railway; API keys das fontes; e tratamento de licenças/atribuição.

## 4. Recomendações
- **Antes de go-live público:** ou popular com o seed (10 clubes) **e** ajustar os números da home para refletir a realidade, **ou** completar o ETL de verdade antes de manter os números de marketing.
- Rodar o seed **em ambiente controlado**; nunca em produção sem confirmar backups/migrações.
- Não ativar cobrança/assinatura promissora sem os dados/recursos correspondentes.
