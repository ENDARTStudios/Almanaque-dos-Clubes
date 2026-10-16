# Critérios para Editores de Clube (Modo Clube)

> Status: **proposta para decisão do Operador** — o código atual **não** implementa estes
> critérios (ver "O furo atual"). Escrito em 15-10-2026, a pedido.
> Contexto: `ClubOwnership` (schema), `club-ownership.service.ts`, `proposals.service.ts`.

## 1. O problema

Hoje **qualquer usuário autenticado** vira editor de **qualquer clube**: `ownClub()` cria a
posse com `status: 'active'` na hora (o próprio código diz *"fase inicial: auto-aprovado
(aprovação manual = futuro)"*). O editor ativo então tem **auto-aprovação** das suas edições
de texto (`propose()` aplica direto). Não há plano exigido nem qualquer prova de vínculo.

Consequência: um mal-intencionado pode reivindicar o clube do rival e publicar texto na
página dele — sem barreira técnica, sem prova e sem revisão.

## 2. Critérios propostos (em camadas)

Um usuário só se torna **Editor de Clube** se atender **todas** as camadas:

### C1 — Plano (barreira de custo)
- **Elite ativo** (pago ou concedido, ex.: presente de aniversário) **no momento da posse**
  e mantido **no momento de publicar**.
- Perdeu o Elite → a posse **não é apagada**, mas a permissão de publicar **suspende**
  (`status: 'suspended'`) até renovar. Sem apagar histórico.
- **Racional:** custo + rastreabilidade (pagamento é identidade verificável por terceiro).
  Não é prova de vínculo — é só o primeiro filtro.

### C2 — Prova de vínculo (barreira de identidade)
Depende do tipo de entidade, e a prova tem de ser **verificável por terceiro** (não basta
declaração):

| Entidade | Prova aceita (uma delas) |
|---|---|
| Clube profissional | e-mail **no domínio do clube** (`@nome-do-clube.com.br`) · **cargo declarado no site oficial** (página "Diretoria/Comissão") · ofício do clube · perfil institucional verificado |
| Clube amador / de bairro | vínculo com **federação** (registro) · ata de diretoria · página oficial do clube com nome |
| Seleção nacional | **não** aceitar auto-serviço: curadoria manual do Operador (é entidade pública, alto risco de captura) |
| Torcedor (sem vínculo) | **não** é editor — usa o caminho de **proposta** já existente (`proposals.service.ts`, revisada por editor ativo ou pelo Operador) |

### C3 — Revisão humana (barreira de julgamento)
- Toda posse nasce **`status: 'pending'`** — nunca `active` automático.
- Aprovação por **Operador** (papel `OWNER`/moderação) ou por moderador designado.
- **Aprovação é registrada**: `approvedBy`, `approvedAt`, `evidenceUrl`, `evidenceNote`.
- Prazo de resposta declarado na UI (ex.: **5 dias úteis**) → transparência (CDC art. 6).

### C4 — Regras de conduta (barreira de comportamento)
- **1 editor principal + até N curadores** por clube (sugestão: **3**); o Operador pode
  ampliar por decisão registrada.
- Toda edição do editor ativo entra no `audit_logs` (já entra) **e** guarda o texto anterior
  por **1 versão** (rollback rápido em caso de abuso).
- **Revogação imediata** pelo Operador (inclusive preventiva), com motivo registrado.
- **Conflito de interesse obrigatório**: o editor declara no cadastro se tem vínculo com
  clube rival da mesma praça; omitir = revogação.
- Texto de editor **sempre** rotulado como conteúdo comunitário (já existe:
  `userDescriptionSource: 'community'`) — **nunca** se confunde com dado do acervo oficial.
- Proibido: dado estatístico inventado, valor de mercado, texto difamatório, foto sem
  licença. O acervo oficial (Wikidata/Wikipédia) segue intocável pelo editor.

## 3. O furo atual (o que precisa mudar no código)

| Onde | Hoje | Com os critérios |
|---|---|---|
| `club-ownership.service.ts` → `ownClub()` | cria `status: 'active'` para qualquer autenticado | exige **Elite ativo** (C1) + **evidência** (C2) + cria `status: 'pending'` (C3) |
| `proposals.service.ts` → `propose()` | editor ativo **auto-aprova** | mantém auto-aprovação **só** para editor ativo (ou seja, só quem passou por C1–C3) |
| **Migration (aditiva)** | — | `ClubOwnership`: `evidenceUrl TEXT?`, `evidenceNote TEXT?`, `reviewedBy TEXT?` (`approvedAt`/`approvedBy` já existem) |
| API | `POST /clubs/:id/own` sem critério | valida plano + exige evidência; erro claro: `PLAN_REQUIRED` / `EVIDENCE_REQUIRED` |
| Moderação | lista propostas pendentes | passa a listar **posses pendentes** também (é onde o Operador aprova) |
| UI | botão "Sou editor deste clube" livre | mostra os critérios, pede a evidência e explica o prazo de revisão |

## 4. O que é decisão do Operador (não é técnica)

1. **Aprovar os critérios** (C1–C4) ou ajustar (ex.: exigir Elite **pago**, não concedido).
2. **Quem aprova** (só o Operador, ou moderadores indicados) e o **prazo** prometido.
3. **Quantos** curadores por clube.
4. **Seleções nacionais**: confirmar que **não** haverá auto-serviço.
5. Se vale **grandfathering**: posses `active` criadas antes desta regra passam por revisão
   retroativa ou são revogadas? (Hoje: 0 posses reais em produção — ver abaixo.)

## 5. Estado medido (15-10-2026)

- Posses (`ClubOwnership`): **0** · propostas (`ClubDescriptionProposal`): **0** — a
  funcionalidade existe no código mas ninguém a usou. **Ainda dá para ligar os critérios sem
  grandfathering.**
- Assinaturas: **75 usuários, 0 em plano pago** (todos FREE).
  → **Consequência a decidir:** exigir Elite **hoje** significa **zero editores elegíveis**
  até alguém assinar. Alternativas: (a) aceitar (o gate é justamente o Elite, e o programa
  de editores nasce junto com a monetização); (b) trilho de exceção — curadoria manual do
  Operador para convidados (ex.: historiadores, clubes parceiros), registrada como
  `approvedBy` + evidência, sem exigir plano; (c) exigir Elite apenas para **publicar** e
  permitir posse em FREE (enfraquece C1).
- O modelo já tem `status: 'pending' | 'active' | 'revoked'` + `approvedAt`/`approvedBy` →
  **a maior parte do C3 não exige migration**; só a **evidência** (C2) precisa de 2 colunas.
