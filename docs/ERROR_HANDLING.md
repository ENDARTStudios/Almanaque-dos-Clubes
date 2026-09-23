# ERROR_HANDLING.md — Tratamento de erros

## Princípio (regra permanente)

**Caminhos de escrita/invalidação/dinheiro nunca engolem erro.** Catch silencioso nesses caminhos
é anti-padrão nomeado com 3 instâncias: logout-400 (#156), refund-skip (#146), cache-stale (T448d).
Leitura (cache get, fallback de feature) pode degradar — miss é benigno.

## Padrões da base

| Padrão | Onde | Regra |
|---|---|---|
| Erro de domínio | `packages/domain` (`DomainError` → status + `{error:{code,message}}`) | handler escopado em /api/v1 |
| Validação | Zod na entrada de toda rota | 400/422 com `details` |
| P2002 (corrida de seed) | testes/fixtures | re-fetch com `findUniqueOrThrow` — nunca engolir deixando id undefined |
| Upsert idempotente | ingestões | dedup por chave estável (QID/chave composta); conflito = skip contado, não erro |
| Dado externo hostil | conectores ETL | Zod por linha: malformado = descartado E CONTADO (nunca fabricado) |
| Órfão/gap | T448 | mãe/clube ausente = NÃO grava + gap contado por hierarquia (nunca semeia) |
| HTTP resiliente | `scripts/lib/http-resilience` | retry/backoff com delays configuráveis; timeout por request |
| Refund | billing | resolve no provedor primeiro; impossível → `RefundNotPossibleError` (502 com estado local inalterado) |
| Cache invalidate | `services/cache.ts` (T448d) | retorna `{ok, keysDeleted, error?}` + warn — nunca `ok=true` em falso |
| Webhook | billing | HMAC + timestamp 5min + replay rejeitado; evento desconhecido não derruba |

## Frontend

- `lib/api.ts`: interceptor 401 → refresh single-flight → retry 1×; `suppressSessionRefresh()` pós-logout.
- Gates de auth têm TETO de loading (8s, AbortController) — qualquer HTTP assenta o estado
  (D-2026-09-20-sessao-sempre-assenta): spinner perpétuo é bug.
- Falha de fetch de vitrine → vazio-honesto com mensagem (nunca card fabricado).

## Logs

pino com contexto estruturado (sem segredos — regra no-echo). Erro 5xx loga com correlationId;
nunca vazar stack para o cliente (só `{error:{code,message}}`).
