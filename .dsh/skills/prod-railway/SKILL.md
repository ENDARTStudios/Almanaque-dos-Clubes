---
name: prod-railway
description: Acessar e operar a PRODUÇÃO do Almanaque dos Clubes pelo Railway (rodar scripts de ETL/seed e SQL dentro do container da API, esperar deploy, ler Redis/cache). Use sempre que a tarefa exigir banco de dados real, rodar um script de ingestão/seed, conferir dados gravados, invalidar cache ou verificar qual build está no ar — localmente o Postgres NÃO é alcançável.
---

# Produção via Railway (Almanaque dos Clubes)

## Regra zero: o banco local não existe

`.env` local aponta para `postgres.railway.internal` — **DNS interno da Railway, inalcançável fora da rede dela**.
Portanto: script de ETL/seed e SQL **rodam DENTRO do container**; o seu shell local só orquestra.

Não tente `pnpm tsx scripts/x.ts` local esperando tocar produção ✗. Não peça ao Operador para "abrir o painel" ✗
(política CLI-first do repo).

## Link do projeto (uma vez por worktree)

```bash
railway link --project 4091684b-8701-4ace-bbe2-c39bc8e0911c --environment production --service "Almanaque-dos-Clubes"
```

## Rodar script ou SQL no container da API

```bash
railway ssh --service Almanaque-dos-Clubes -- sh -lc 'cd /app/apps/api && node dist/scripts/<x>.js --apply'
```

- **cwd obrigatório**: `/app/apps/api` (é lá que o `@prisma/client` resolve).
- Só existe o que está em `dist/scripts/` → o código precisa estar **commitado em `main` e deployado** antes.
- SQL curto, sem Prisma (o container TEM `/usr/bin/psql` e `DATABASE_URL` no env):

```bash
railway ssh --service Almanaque-dos-Clubes -- sh -lc 'psql "$DATABASE_URL" -tAF"|" -c "SELECT count(*) FROM competitions"'
```

- **Colunas camelCase exigem aspas escapadas**: `\"deletedAt\" IS NULL` (sem o escape o sh come as aspas e o Postgres
  folda para minúsculo → `column "deletedat" does not exist`). Atalho quando der: evite a coluna no filtro.
- **`railway ssh` com aspas**: o padrão que funciona é `sh -lc '... "..." ...'` (aspas simples externas, duplas internas).
  Cuidado com template literals JS (`` ` `` e `${}`) dentro de aspas simples — prefira `-tAc` com SQL curto.
- **MSYS/Git Bash converte paths de argumento**: se o comando cita um caminho `/tmp/x`, use
  `MSYS_NO_PATHCONV=1 railway ssh ...`.
- **Segredos nunca atravessam o shell local** (regra D-2026-09-16): nada de `echo $SECRET`, `cut`, pipe sobre variável
  de credencial. Leia o env **lá dentro** (`$DATABASE_URL`, `$PGPASSWORD`) e imprima só o resultado.

## Esperar o deploy (o polling tem armadilha)

O merge em `main` dispara o auto-deploy. Para esperar:

```bash
railway deployment list | sed -n '2p'   # a LINHA 1 é o cabeçalho; o deployment NOVO é a linha 2
```

**Nunca** faça `grep -oE "SUCCESS|DEPLOYING" | head -1` na lista inteira: o `SUCCESS` de um deployment ANTIGO aparece
primeiro e você conclui "subiu" sem ter subido ✗ (aconteceu). Inclua os estados reais:
`BUILDING|INITIALIZING|DEPLOYING|SUCCESS|FAILED|CRASHED` e pare só em terminal.

Confirme que o código NOVO chegou no container antes de operar:

```bash
railway ssh --service Almanaque-dos-Clubes -- sh -lc "grep -c '<marcador-novo>' /app/apps/api/dist/<arquivo>.js"
```

## Depois de gravar dados

- A API cacheia com TTL curto (`competitions:seasons:<id>` = 300s). Ou espere, ou invalide; **não** confunda cache
  velho com dado não gravado ✗.
- Smoke ao vivo: `curl https://api.almanaquedosclubes.com/api/v1/<rota>` (prefixo **`/api/v1`** — sem ele dá 404).
- Integridade: `home`, `rankings/entries` e `health` devem responder 200.
