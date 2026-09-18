# HANDOFF T445 — Direitos do titular (LGPD art. 18) + Copyright claims (DMCA)

> **Checkpoint de contexto (D-2026-09-18-checkpoint-de-contexto).** Sessão anterior esgotou contexto
> após F1. Esta sessão NÃO avança F2+. Retomada em sessão fresca começa AQUI, na ordem fixa da
> seção "Retomada". Nada disto toca produção: branch não mergeada = migration não aplicada.

- **Branch:** `feat/t445-direitos-titular` — FASE 1 commitada, **PR em DRAFT** (CI valida DDL,
  migration-drift e GRANTs cedo; se vermelhar, corrigir antes de qualquer F2).
- **Épico:** WS-L 2ª camada. Fila geral em `docs/RECONCILIATION-REPORT.md` (linha ~267):
  T445 → Operador: merchant Stripe + keys de teste → T447 test-mode → live + políticas v1.2 → **M3**.

---

## FEITO (F1 — completo neste checkpoint)

| Artefato | Local |
|---|---|
| 2 models Prisma (`PrivacyRequest`, `CopyrightClaim`) | `apps/api/prisma/schema.prisma` (~linha 602, bloco "WS-L 2ª CAMADA") |
| Migration Postgres canônica | `apps/api/prisma/migrations/20260918120000_direitos_titular/migration.sql` |
| GRANTs `app_user` (DML completo, 2 tabelas, ordem alfabética) | `apps/api/scripts/sql/create_app_user.sql` |
| Rollback | `docs/evidence/t445-rollback.sql` (precede: `t439-`, `t444-rollback.sql`) |
| PR draft | CI valida migration-drift + DDL + grants |

Observação honesta: a sessão anterior registrou "GRANTs feitos" na memória, mas o working tree só
tinha schema + migration — GRANTs e rollback foram **escritos nesta sessão de contenção**, seguindo
o padrão existente. Sempre conferir o diff real contra o que a memória afirma.

## FALTANDO (F2–F5 — nada iniciado)

1. **Espelho sqlite** dos 2 models em `apps/api/prisma/schema.sqlite.prisma` + `prisma generate`
   (padrão do repo: `Json` vira `String` no espelho — 3 ocorrências existentes confirmam o padrão).
2. **F2 API + máquina de estados + SLA + fulfillment SERVICE** com segregação (rotas públicas de
   criação/consulta-por-token vs. rotas admin; nenhuma rota admin expõe `token`).
3. **F3 UI**: formulário público de solicitação + painel admin + link no rodapé
   (`apps/web/src/components/Footer.tsx`); políticas v1.1 com links para o canal
   (`apps/web/src/app/privacidade`).
4. **F4 testes**: unit (SLA, transições de status) · integração · E2E dos formulários.
5. **F5 reconciliação** → PR draft vira ready → merge → smoke.

---

## DECISÕES DE DESIGN (vinculantes; spec do Thinker NÃO está commitada — este bloco é a fonte)

> ⚠️ **Aviso de método:** a "spec T445 do Thinker" e o "pacote jurídico §2.12/§3.7" **não existem
> como arquivos no repo** — viviam só na conversa anterior. As decisões abaixo são o resgate
> verbatim do checkpoint. Se algo além disto for necessário, reabrir com o Thinker.

1. **10 `rightType`s** (LGPD art. 18, valores exatos do schema):
   `confirmação` · `acesso` · `correção` · `anonimização` · `portabilidade` · `eliminação` ·
   `info_compartilhamento` · `info_consequência` · `revisão_automatizada` · `revogação`.
2. **Máquina de estados:**
   - `PrivacyRequest.status`: `recebido → em_andamento → atendido | indeferido`.
   - `CopyrightClaim.status`: `recebida → em_analise → deferida | indeferida | retirado`.
   - Transições inválidas devem ser rejeitadas no service (não só na UI).
3. **SLA:** atendimento imediato para direitos de acesso/confirmação; prazo geral **15 dias
   (padrão ANPD)** para os demais — campo `slaDueAt` é obrigatório no INSERT.
4. **Token para não-usuários:** `token` unique permite titular sem conta confirmar identidade e
   acompanhar a solicitação (`requesterId` null nesse caso); `email` sempre preenchido.
5. **`deferredUntil` (art. 18 §3):** pedidos complexos podem ter prazo prorrogado com notificação
   à ANPD em 15 dias — usar este campo, nunca zerar `slaDueAt`.
6. **Soft-delete sempre:** nunca `DELETE` físico de solicitações/claims; eliminação de dados do
   titular é atendida nos dados referenciados, preservando o registro do workflow (auditoria).
7. **RLS:** sem policies nestas tabelas (workflow interno; acesso via SERVICE/admin e rotas
   autenticadas) — decidido no header da migration, manter.

## RETOMADA (sessão fresca — ordem fixa)

```text
1. Ler este HANDOFF + CI do draft PR (corrigir se algo vermelhou)
2. Espelho sqlite dos 2 models (padrão Json→String) + prisma generate
3. F2 API + máquina de estados + SLA + fulfillment SERVICE com segregação
4. F3 UI (formulário público, admin, rodapé) + políticas v1.1 com links
5. F4 testes (unit SLA/transições · integração · E2E formulários)
6. F5 reconciliação → draft vira ready → merge → smoke
```

## PONTEIROS (verificados nesta sessão)

- Schema/migration: `apps/api/prisma/schema.prisma` · `apps/api/prisma/migrations/20260918120000_direitos_titular/`
- Grants + regra "mesmo PR": `apps/api/scripts/sql/create_app_user.sql` · header da migration
- Canal do titular **já publicado**: `endart.studios@gmail.com` em `apps/web/src/components/Footer.tsx`
  + dicionários i18n (`apps/web/src/i18n/dictionaries/{pt-br,en-us,es-es}.ts`)
- Página de privacidade (para políticas v1.1): `apps/web/src/app/privacidade`
- Espelho sqlite: `apps/api/prisma/schema.sqlite.prisma` (+ `dev.db`)
- Rollbacks de precedência: `docs/evidence/t439-rollback.sql` · `docs/evidence/t444-rollback.sql`
- Fila/epopeia: `docs/RECONCILIATION-REPORT.md` · `docs/ROADMAP.md`
- Contexto de código: usar `graft ask`/`graft grep` antes de ler código-fonte às cegas (AGENTS.md)

## PROTOCOLO REGISTRADO (entrar no DECISOES na próxima reconciliação)

```text
D-2026-09-18-checkpoint-de-contexto:
- Contexto baixo → Doer commita WIP, abre PR draft (CI valida cedo),
  escreve HANDOFF com feito/faltando/decisões/resume-checklist e para.
- Retomada ocorre em sessão fresca lendo HANDOFF + graft memory,
  não por resumo de chat.
- Justificativa: qualidade degradada sob contexto exausto custa mais
  que um round de retomada; pendência invisível é violação do método.
```
