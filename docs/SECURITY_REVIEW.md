# SECURITY_REVIEW.md — Revisão de segurança

## Controles ativos

| Camada | Controle | Referência |
|---|---|---|
| Transporte | HTTPS/HSTS, cookies `__Host-` (Secure+HttpOnly+SameSite=Strict) | layout/middleware |
| CSP | `connect-src 'self' + domínios de API` (header no next.config) | next.config.ts |
| Headers | helmet (API) + headers de segurança (web) | http-hardening |
| Auth | argon2id, rotação de refresh, detecção de reuso, revogação de FAMÍLIA de sessão | T452/T456 |
| RLS | Postgres Row Level Security FORCE: users (T442/T443), sessions, favorites; role `app_user` NOBYPASSRLS | docs/RLS-POLICIES.md |
| RBAC | roles + permissions por rota admin | docs/RBAC-MATRIX.md |
| Validação | Zod em toda entrada; client NUNCA escolhe moeda; schemas estritos | rotas |
| Rate-limit | global + buckets por rota (auth/sessão) | T458 |
| CSRF | token de uso único em mutações do browser | T436 |
| Webhooks | HMAC + janela de timestamp + replay rejeitado; payment_events append-only | T444 |
| Uploads | whitelist de MIME + limite de bytes | upload module |
| CI | gitleaks, dependency-audit, DAST workflow, migration-drift | .github/workflows |

## Auditorias e incidentes

- Credenciais expostas em rodadas anteriores: TODAS rotacionadas (postgres, app_user) — histórico
  no DECISOES/incidentes.
- Incidente financeiro: refund fail-loud (#146) + testes com fixtures live.
- Auditoria jurídica externa (22/09): roteada no T469 — com W2 (PII da auditoria não publicado).

## Checklist de review de segurança (nova superfície)

1. Autenticação/autorização: quem chama? RBAC/owner scope no BANCO (RLS), não só na rota.
2. Entrada: Zod estrito (sem `any`); dado externo (fonte aberta) também passa por Zod.
3. Saída: sem PII/stack/segredos; proveniência presente em dado público.
4. Dinheiro: fail-loud, idempotência, fixture de teste do caminho real.
5. Cache/invalidação: não silencia falha; chave exata para purge.
6. Segredos: nunca em argv/log/repo (regra no-echo); rotação registrada.
7. Dependência nova: licença + custo de privacidade ([INTEGRATIONS.md](./INTEGRATIONS.md)).

## Pendências (conhecidas, roteadas)

- Cursor-based pagination (OFFSET hoje) — WS-S/C.
- Opção B geo-restrição (UE/UK) — T471.
- 2FA/age-gate profundo — Operador policy.
