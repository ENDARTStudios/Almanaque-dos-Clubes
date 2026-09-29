# Security Audit — Almanaque dos Clubes — Passada 1 (estática)

**Data:** 2026-09-29 · **Perfil:** `quick` (1 onda de caça, prioridade superfície geo WS-C-3) ·
**Método:** análise ESTÁTICA (leitura de código, navegação via grafo `graft/`) seguindo a skill
`security-audit` (Cloudflare). Nenhuma requisição a produção/hosts externos; nenhum `.env` lido;
nenhum ataque executado; nada commitado.

**Fonte:** worktree corrente (grafo `graft` verificado em sync: `graft check` OK).

---

## Sumário executivo

A superfície pública read-only da API está bem construída — validação de input no módulo geo
(bbox/ISO2/limit) é sólida, as queries `$queryRawUnsafe` são parametrizadas com schema fixo, não
há servidor de estáticos (path traversal n/a), SSRF de ingestão está fechado (endpoints fixos,
QIDs filtrados), e 500s não vazam stack em produção.

Os riscos concentraram-se em **três desvios de fronteira**:

1. **Escrita anônima no catálogo** — `POST /clubs` é a única escrita sem `authenticate` (players e
   competitions exigem RBAC), e o token CSRF que a protege é emitido anonimamente. Isso alimenta
   diretamente o achado 2.
2. **XSS armazenado via JSON-LD** — páginas do web serializam dados do banco com `JSON.stringify`
   em `dangerouslySetInnerHTML` sem escape de `<`; um nome de clube contendo `</script><script>…`
   (criável pelo item 1, ou via dados de ingestão de terceiros) executa no browser do visitante —
   e a CSP com `unsafe-inline` não bloqueia.
3. **Rate limit por IP forjável** — `trustProxy: true` incondicional faz `request.ip` derivar de
   `X-Forwarded-For`; se o edge não sobrescrever o header (fato de deploy), todo o rate limiting
   por IP (incl. brute-force de login) é contornável.

### Contagem de candidatos por severidade proposta (triagem — verdes precisam de validação)

| Severidade proposta | N | Candidatos |
|---|---|---|
| High | 2 | C-01 escrita anônima em `/clubs`; C-02 XSS JSON-LD |
| Medium | 5 | C-03 backup segredo não timing-safe + dump PII; C-04 trustProxy/XFF bypass; C-05 idempotência sem escopo/sem bounds; C-06 CORS `*.vercel.app` wildcard; C-07 fallback de credenciais S3 hardcoded |
| Low | 5 | C-08 CSP `unsafe-inline/eval`; C-09 HSTS ausente (web); C-10 `/metrics` público; C-11 injeção de log em `/health`; C-12 flooding de chaves de cache |
| Informational | 1 | C-13 Swagger `/docs` público |

**Total: 13 candidatos, todos `needs_validation`** (detalhes, traces, evidências `arquivo:linha` e
planos de validação em `findings-candidates.md`).

### Top 3 para validar primeiro

1. **C-01 + C-02 (cadeia high)** — `apps/api/src/modules/clubs/routes.ts:23` (POST sem auth) →
   `apps/web/src/app/clubs/[id]/page.tsx:149-153` (JSON-LD sem escape de `<`). Correção mínima:
   `[authenticate, requirePermission]` no POST + escape `\u003c` no serializer JSON-LD.
2. **C-04** — `apps/api/src/app.ts:75` (`trustProxy: true`) + `app.ts:92` (keyGenerator `request.ip`).
   Decisivo: comportamento do edge Railway quanto a `X-Forwarded-For`.
3. **C-03** — `apps/api/src/modules/admin/backup.routes.ts:16` (comparação `!==` de segredo que
   devolve dump com emails). Correção mínima: usar `timingSafeEqual` já existente
   (`config/crypto.ts`) + audit log da chamada.

---

## Cobertura (resumo — detalhe em `coverage-ledger.json`)

- **25 unidades de cobertura**: 6 `covered` (sem achado), 11 `candidate` (13 fingerprints),
  7 `out_of_scope` (passada 2), 1 `not_applicable` (path traversal estático — não há servidor de
  estáticos), 1 bloqueio de ferramenta (validador oficial exige `O_NOFOLLOW`, indisponível em
  Windows — ledger checado estruturalmente de forma equivalente; revalidar em POSIX).
- **Prioridade dada conforme escopo**: módulo geo (WS-C-3) e superfície pública listada
  (health, rankings, champions/carousel, search/global, clubs/:id/profile, geo/points), headers web,
  ingestão.
- **Sem ledger anterior compatível** — cobertura parcial declarada; esta passada NÃO esgota o alvo.

### Fora de escopo desta passada (passada 2)

Auth completo (login/refresh/password reset — `rate-limit.service.ts`), billing/Stripe webhook
(timingSafeEqual presente — revalidar fluxo), upload/S3 (mime, chave de objeto), admin/RBAC, worker
(email/ETL), módulos export/etl/graph/rag/consent/privacy/legal/favorites/compare/seasons/matches,
CI workflows (gitleaks, security-gate, migration-drift), apps/web server actions, e todos os fatos
de deploy (XFF no edge, HSTS no Vercel, `BACKUP_SECRET`/`S3_SECRET_ACCESS_KEY` definidos, Redis
dimensionado).

## Próximos passos

1. **Passada 2 (validação)** — validar os 13 candidatos em ordem de severidade proposta
   (sandboxes locais com dummy DB; observações owner-side para fatos de deploy listados acima);
   promover a `confirmed`/`rejected` conforme schema; só então atribuir severidade definitiva.
2. **Quick wins de correção (após validação mínima)** — `preHandler` no `POST /clubs`; escape
   `\u003c` no JSON-LD (1 helper compartilhado); `trustProxy` com allowlist de proxy;
   `timingSafeEqual` no backup.
3. **Extensão de cobertura** — audit das unidades `out_of_scope` acima, começando por auth
   (maior superfície autenticada) e upload/S3.
