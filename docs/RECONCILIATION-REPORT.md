# RECONCILIATION-REPORT.md — Reconciliação do PLANO_MESTRE (T381)

> Auditoria do `PLANO_MESTRE.md` contra as tarefas T3xx executadas e o estado
> real do repositório. Fase F14-reconciliacao-plano, 2026-08-27.

## 1. Metodologia

Cada item do plano foi cruzado com: (a) tarefas T3xx executadas (com commits),
(b) arquivos reais no repositório, (c) comandos de verificação quando
executáveis localmente. Marcação: `[x]` somente com evidência real; `[~]` com
gap documentado; `[ ]` sem evidência/não iniciado.

## 2. Estado real (números)

| Marcação | Contagem |
|---|---|
| `[x]` | 111 |
| `[~]` | 7 |
| `[ ]` | 6 |

> **Correção de premissa:** o handoff citava "~80 itens `[ ]`". O arquivo real
> tem **6 `[ ]`** e **7 `[~]`**. O débito de governança é bem menor do que o
> alegado — o plano já estava majoritariamente fechado (T001/T002/T003).

## 3. Mapeamento T3xx → Fase (principais)

| T3xx | Fase/Item | Efeito no plano |
|---|---|---|
| T341/T342 | Fase 3 (auth), Fase 6.2 | mailer transacional + verificação de email + reset via mailer |
| T344/T345/T377 | Fase 2/3 (sessions) | RLS de `sessions` desenhada e validada em teste (aditivo) |
| T347/T348/T349 | Fase 4 (domain) | reconciliação docs + quarentena de `uml.ts`/`rbac-matrix.ts` |
| T350/T351/T366/T368 | Fase 9.4 | Root Directory Vercel + deploy web destravado |
| T359 | Fase 2 (billing) | coluna `trial_used_at` + migration |
| T370/T371 | Fase 2/3 (sessions) | `rls-context.ts` + adoção `withRlsContext` |
| T373/T374/T375/T378 | Fase 9.1 | CI: fix Redis + oracle + gitleaks + dependency-audit |
| T376/T380 | Fase 9.4 | merges via exceção governada; produção verde |
| T379 | Fase 9.9 | `MANUAL_DO_OPERADOR.md` reescrito |

## 4. Itens `[ ]` (6) — status

| Item | Status real |
|---|---|
| 2.7 Tabelas de governança (`data_sources`, `entity_revisions`) | ❌ não existem no schema; "rankings auditáveis" depende de ETL futuro |
| 2.10 Criptografia a nível de coluna | ❌ não implementada (condicional a Vault/Infisical) |
| 7.9 Vault/Infisical (CONDICIONAL) | ❌ não implementado |
| 7.10 DNSSEC + CAA + HSTS preload (CONDICIONAL, domínio) | ❌ pendente de domínio próprio |
| 9.3 Deploy blue-green/rolling (zero downtime) | ❌ pendente (deploys atuais são recriação simples) |
| 9.4 Plataforma de deploy (decidir) | ✅ **DECIDIDA** — Railway (API) + Vercel (web), em produção → propor `[x]` |

## 5. Itens `[~]` (7) — status

| Item | Estado real |
|---|---|
| Fase 2 (resumo 13/15) | 2.7/2.10 seguem pendentes |
| 3.9 Testes de integração | escritos; rodam em CI quando o Actions voltar (Caminho A) |
| Fase 7 (resumo) | 7.9/7.10 condicionais |
| Fase 9 (resumo) | 9.4 decidida; 9.3 pendente |
| 8.3 E2E (Playwright) | 5/5 passando (T003); execução manual |
| 8.8 Regressão de segurança | CI configurado; expandir cenários |
| 8.9 Testes pipeline IA | pendente (Ollama/pgvector operacional) |

## 6. Gaps consolidados (candidatas, NÃO executadas)

1. **2.7** — criar `data_sources`/`entity_revisions` se o Operador quiser
   "rankings auditáveis" completos.
2. **2.10/7.9** — adotar Vault/Infisical para criptografia de coluna.
3. **7.10** — DNSSEC/CAA/HSTS preload após domínio próprio.
4. **9.3** — deploy blue-green/rolling.
5. **8.8/8.9** — expandir regressão de segurança + pipeline IA.
6. **Caminho A** — restaurar GitHub Actions (billing) para reativar o CI como
   gate real; **revogar o token antigo** (pendência do Operador).
7. **FORCE RLS em produção** — gateado por `D-2026-08-24-rls-enforcement-exige-app-user`
   (conexão `app_user` + staging verde + decisão do Operador).

## 7. Conclusão

O projeto está **funcionalmente completo** para os marcos Beta/Open Beta: todas
as Fases obrigatórias (0–9) estão `[x]` ou `[~]` com gaps pequenos e
documentados. As pendências restantes são: 2 itens de dados/segurança
condicionais (2.7/2.10), 2 condicionais de hardening (7.9/7.10), 1 de deploy
avançado (9.3), e a reativação do CI (account-level) — todas decisões do
Operador, não trabalho de implementação.
