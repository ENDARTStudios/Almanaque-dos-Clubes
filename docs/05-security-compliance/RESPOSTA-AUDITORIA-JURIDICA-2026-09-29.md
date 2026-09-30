# Resposta às Auditorias Jurídicas Externas — 29/09/2026 (três rodadas)

> Objeto: verificação item a item de **três** auditorias jurídicas recebidas entre 29/09 e 30/09/2026.
> **Auditoria 1**: 12 achados (J-01..J-12). **Auditoria 2**: 15 achados (renumerados, sobre `63dfa3e`),
> com 4 novos + **ECA Digital (Lei 15.211/2025)**. **Auditoria 3** (sobre `439b37d`, pós-merge do
> PR #279): **fecha J-01 e J-10** (confirmados no remoto), renumera os técnicos (J-16 XSS, J-17
> backup, J-18 rate-limit) e confirma os demais como já mapeados. Método: **estado vivo prevalece
> sobre anexos** — cada achado re-verificado no código com evidência `file:line`. Cruzamento com a
> auditoria de segurança interna passada 1 (`docs/05-security-compliance/security-audit-2026-09-29/`).

## Disposição por achado

| ID | Status na verificação local | Evidência | Ação | Dono |
|---|---|---|---|---|
| **J-01** (versão contraditória dos Termos) | **CONFIRMADO — pior e mais amplo que o relatado**: resíduo `02/09 · v2.0` em **6 pontos** (a auditoria viu só o pt-br); os 3 locales têm a mesma contradição | `pt-br.ts:559,289` · `en-us.ts:557,287` · `es-es.ts:560,290` — contra os campos versionados (`v1.3/22-09`) e históricos em todos os locales | **CORRIGIDO localmente** nos 3 locales (commit desta branch): intro → `22/09/2026 · Versão 1.3`; planos/checkout → `22/09/2026`. Conteúdo substantivo intocado. Publicar em release web de copy | Doer |
| **J-02** (endereço físico não publicado) | CONFIRMADO (gap já conhecido do projeto) | Política publica só Osasco/SP + CNPJ | Definir e publicar endereço completo **antes de qualquer checkout ativo**; `PAYMENTS_ENABLED` segue desligado | **Operador** |
| **J-03** (DPO sem nomeação nem enquadramento) | CONFIRMADO | `pt-br.ts:799-801` — seção Encarregado com e-mail apenas | Nomear DPO **ou** formalizar enquadramento ATPP (Resolução CD/ANPD 2/2022) com canal do titular — fila jurídica (adv/DPO) já existente | **Operador + jurídico** |
| **J-04** (aceite sem trilha versionada) | CONFIRMADO exatamente como descrito | Gate: `auth.schemas.ts:32-36` (`acceptedTerms/acceptedPrivacy` booleanos obrigatórios) + `register/page.tsx`; **schema sem** versão/timestamp do aceite | Projetar `legal_acceptances` (userId, termsVersion, privacyVersion, acceptedAt, ipHash, userAgentHash) — exige **FASE0-DESIGN + migration**; não tocar banco durante a janela de observação T454 → design agora, release futura | Doer |
| **J-05** (bases legais agregadas) | CONFIRMADO | `pt-br.ts:746` — "consentimento… contrato… legítimo interesse… conforme aplicável" | Substituir por matriz tratamento×dados×finalidade×base (modelo `:809` já faz isso p/ localização — estender). Release de copy | Doer |
| **J-06** (transferência internacional sem instrumentos) | CONFIRMADO | `pt-br.ts:753-754` — fornecedores listados; Stripe com menção genérica a "cláusulas-padrão" | Coletar/archivar DPAs públicos (Vercel, Railway, Resend, ipwho.is) e linkar por fornecedor na Política; fila "provedores" do Operador | Operador + jurídico; Doer publica |
| **J-07** (retenção sem âncora de 6 meses — Marco Civil) | CONFIRMADO | Zero ocorrências de "6 meses"/"Marco Civil"/"registros de acesso" em `pt-br.ts`; purga de sessões em 30d não mapeada juridicamente | Definir juridicamente quais logs constituem "registros de acesso" (art. 15 MCI) + ancorar prazo na Política e no código; pode conflitar com purga de 30d — decisão jurídica antes de copy | **Jurídico** → Doer aplica |
| **J-08** (ROPA ausente) | CONFIRMADO | Zero ocorrências de ROPA em `docs/` | Redigir ROPA simplificado (enquadramento ATPP permite formato simplificado — Resolução 2/2022), em `docs/05-security-compliance/` | Doer (rascunho) → jurídico valida |
| **J-09** (canal manual sem conta) | CONFIRMADO como P2 operacional aceitável | Página de direitos documenta canal `endart.studios@gmail.com` | Manter; garantir rastreabilidade do canal manual | Doer |
| **J-10** (licenciamento de imagens) | CONFIRMADO parcial | Conector Wikimedia lê `LicenseShortName`/`Copyrighted`; sem auditoria por asset exibido | Script de auditoria de licença por asset exibido antes de expansão de imagens | Doer (backlog) |
| **J-11** (CSP fraca) | CONFIRMADO + **resíduo extra descoberto** | `next.config.ts:32` — `unsafe-inline`/`unsafe-eval`; e CSP **ainda lista `fonts.googleapis.com`/`fonts.gstatic.com`**, eliminados como fornecedores pelo T469 (fontes auto-hospedadas desde 22/09) | Hardening CSP: remover fontes Google (resíduo) e evoluir nonce/hash p/ eliminar `unsafe-*` (esforço médio). equivale ao candidato C-08 da passada 1 | Doer (release de hardening web) |
| **J-12** (CORS amplo) | CONFIRMADO | `app.ts:160-165` localhost + `*.vercel.app` acima (C-06 da passada 1) | CORS por ambiente: produção só domínios próprios; preview/dev separados | Doer (release de hardening API) |
| **J-15** (menores/age gate — condicional) | CONFIRMADO — e a ausência é **decisão deliberada do Operador**: T469 (#172) adicionou atestação 18+ no cadastro; T469b (#173, 22/09) **removeu** `ageDeclaration` (3 locales + register) e reescreveu a seção Menores para declarar honestamente a ausência de verificação | `pt-br.ts:793` ("não realiza verificação de idade"); zero campos de idade/18+ em `auth.schemas.ts` e `register/page.tsx`; histórico `0066d1d` | Decisão jurídica: manter a postura honesta atual (sem mecanismo inexistente) OU reintroduzir atestação 18+ (copy barata, sem migration) OU gate completo. Nota: a memória interna do T469 sobre "declaração 18y" está corrigida — estado vivo = pós-#173 | **Jurídico** → Doer aplica |

## Ordem de execução proposta (Doer)

1. **Copy legal** (sem migration, sem API): J-01 (feito), J-05 (matriz de bases), J-15 (se jurídico optar por atestação 18+) — um único batch de revisão.
2. **Hardening web/API**: J-11 (CSP) + J-12 (CORS) — Release web única, junto com hardening da passada 1 (C-03 backup timing-safe, C-01 escrita anônima em `/clubs` — que também impacta integridade de dados públicos).
3. **Governança documental**: J-08 (ROPA rascunho) + design FASE0 do J-04 (`legal_acceptances`) — migration para release futura, após janela T454.
4. **Operador/jurídico (paralelo, já na fila)**: J-02, J-03, J-06, J-07, decisão J-15.

## Auditoria 2 — mapeamento de numeração e achados novos

Mapeamento Auditoria 1 → Auditoria 2: J-01..J-08 **idênticos**; J-10 (copyright) → **J-12**;
J-11 (CSP) → **J-13**; J-12 (CORS) → **J-14**; J-09 (canal manual) → incorporado ao **J-09-novo**;
J-15 (idade/age gate) → reaberto como **J-11-novo (ECA Digital)**. **Novos na Auditoria 2**, com
verificação local:

| ID (Aud. 2) | Verificação local | Evidência | Status/Ação | Dono |
|---|---|---|---|---|
| **J-09-novo** (export do titular não inclui consentimentos de cookies) | **CONFIRMADO** | `legal/repository.ts:123-165` — `gatherPersonalData` retorna account, subscription, billings, favorites, sessions, requests, notices; **sem** `CookieConsent`; schema `:657-665` — consent é chaveado por `visitorId` anônimo, sem `userId` | Gap real de completude do art. 18. **Não é fix trivial**: correlacionar `visitorId`↔`userId` tem implicação de anonimato por design — exige FASE0 (opções: registrar userId hasheado no consent quando logado; coleta do `visitorId` no fluxo de export; ou declaração explícita na Política). Após janela T454 | Doer (design) + jurídico |
| **J-10-novo** (EN/ES sem disclaimer de prevalência) | **CONFIRMADO** | `DECISOES.md` D-2026-09-22-t472b prescreve o disclaimer "Versão informativa… prevalece a versão em português (Brasil)" como condição para EN/ES, marcado "NÃO executado"; zero ocorrências de disclaimer em `en-us.ts`/`es-es.ts` | **CORRIGIDO localmente**: disclaimer adicionado aos intros de Termos, Privacidade e Cookies em EN e ES (redação prescrita pela própria decisão). Validar na release | Doer → jurídico valida |
| **J-11-novo** (ECA Digital — Lei 15.211/2025, em vigor desde 03/2026) | **MUDANÇA REGULATÓRIA MATERIAL — reavaliação obrigatória** | A decisão "sem age gate" (#173) é de 22/09 e **não analisou o ECA Digital**; conteúdo esportivo-histórico tem acesso plausível por menores | **Não é bug técnico** — é decisão regulatória a reabrir: o serviço é "de acesso provável por crianças/adolescentes" para fins da lei? Se sim, aferição de idade e configurações protetivas entram no caminho do beta pago. **Elevado a item da fila jurídica** | **Jurídico/Operador** |
| **J-15-novo** (data do inventário de cookies inconsistente) | **CONFIRMADO — só no EN** | `en-us.ts:461` "last reviewed: **2026-09-15**" vs intros pt-br `:387`/es-es `:388`/en `:385` "verificado em produção em **22/09/2026**"; a "policy version 1.0" está **correta** (`consent.service.ts:8` `CURRENT_COOKIE_POLICY_VERSION = '1.0'`) | **CORRIGIDO localmente**: `en-us.ts:461` → 2026-09-22 | Doer |

## Auditoria 3 (30/09, sobre `439b37d`) — fechamentos e achados técnicos novos

| ID (Aud. 3) | Verificação local | Evidência | Status/Ação | Dono |
|---|---|---|---|---|
| J-01, J-10 | **FECHADOS pela Auditoria 3 no remoto** — confirma exatamente as correções do PR #279 | `main` `439b37d` | Fechados | — |
| **J-15-novo** (inventário PT ainda "15/09") | **CONFIRMADO — e mais amplo**: PT (`pt-br.ts:463`) **e ES** (`es-es.ts:464`) tinham "15/09/2026" na nota da tabela (o intro já dizia 22/09 — inconsistência interna por documento). A Auditoria 3 viu o PT; o ES foi encontrado na verificação local. Minha correção anterior (Aud. 2) só pegou o EN — o grep usava "revisado", não "revisão" | `pt-br.ts:463` · `es-es.ts:464` | **CORRIGIDO localmente**: 15/09 → 22/09 (versão 1.0 mantida — correta, `consent.service.ts:8`) | Doer |
| **J-16** (POST /clubs anônimo + XSS armazenado via JSON-LD) | **CONFIRMADO — equivale aos candidatos High C-01+C-02 da passada 1** (escrita anônima confirmada estaticamente em `clubs/routes.ts:23`; vetor `JSON.stringify`→`dangerouslySetInnerHTML` sem escape de `<`) | `clubs/routes.ts` · `clubs/[id]/page.tsx:153` (+ players/competitions/layout) | **CORRIGIDO localmente**: (1) `preHandler: [authenticate, requirePermission(CLUBS_WRITE)]` espelhando players/competitions; (2) util `safeJsonLd()` (`apps/web/src/lib/json-ld.ts`) aplicado nos 4 JSON-LDs — escapa `<`,`>`,`&`,U+2028/9 com round-trip JSON idêntico (PoC: `</script>` vira `\u003c/script\u003e`, zero `</script>` literal no output). Typecheck ✅, testes web 50/50 ✅. CSP hardening (J-13/C-08) segue como camada futura | Doer |
| **J-17** (segredo de backup sem timing-safe) | **CONFIRMADO — equivale ao C-03 da passada 1** | `backup.routes.ts:16` (`provided !== secret`); endpoint retorna emails de users | **CORRIGIDO localmente**: hash SHA-256 dos dois lados + `timingSafeEqual` — normaliza comprimento e elimina sinal de timing | Doer |
| **J-18** (rate-limit: fallback em memória fragmenta o limite entre instâncias) | **CONFIRMADO — família C-04/C-12 da passada 1** | `rate-limit.service.ts` (fallback `Map` documentado no código) | **Documentado, sem fix apressada**: exige decisão de arquitetura (fail-closed p/ auth em prod vs Redis obrigatório) — entrar no batch de hardening com C-04 | Doer (design) |

Sequência da Auditoria 3 aceita como ordem de execução: J-16 → J-17/J-18 → J-02/J-03 → J-04 →
J-05/J-06/J-07/J-08 → J-09/J-11/J-12 → J-13/J-14/J-15. J-16 e J-17 já estão corrigidos nesta
branch; J-18 vai para o batch de hardening.

## Matriz executiva unificada (formato: achado → evidência atual → status → responsável → ação)

| Achado | Evidência atual | Status | Responsável | Ação |
|---|---|---|---|---|
| J-01 versão contraditória | 6 pontos/3 locales (`pt-br.ts:559,289` · `en-us.ts:557,287` · `es-es.ts:560,290`) | **CORRIGIDO localmente**; aberto na `main` remota | Doer → release | Publicar em release web de copy |
| J-02 endereço físico | Só Osasco/SP + CNPJ | Confirmado; bloqueador **condicional** ao checkout ativo | Operador/Jurídico | Definir e publicar endereço antes de `PAYMENTS_ENABLED` |
| J-03 DPO/enquadramento | `pt-br.ts:799-801` (e-mail apenas) | Confirmado | Operador/Jurídico | Nomear DPO ou formalizar ATPP (Res. 2/2022) |
| J-04 trilha de aceite | Gate sim (`auth.schemas.ts:32-36`); trilha não | Confirmado | Doer | Design `legal_acceptances`; migration após T454 |
| J-05 bases legais | `pt-br.ts:746` genérico | Confirmado | Doer/Jurídico | Matriz tratamento×base na Política (modelo `:809`) |
| J-06 transferência internacional | Fornecedores listados; instrumentos não | Confirmado | Operador/Jurídico (+Doer publica) | Coletar DPAs por fornecedor e linkar |
| J-07 retenção Marco Civil | Sem âncora de 6 meses; purga 30d não mapeada | Confirmado | Jurídico → Doer | Definir registros de acesso + prazo; depois copy |
| J-08 ROPA | Zero em `docs/` | Confirmado | Doer | Rascunho ROPA simplificado (ATPP) |
| J-09 canal manual (Aud. 1) / export sem consents (Aud. 2) | Canal documentado; export sem `CookieConsent` | Ambos confirmados | Doer (+Jurídico p/ desenho) | J-09-novo: design de correlação visitorId↔userId |
| J-10 prevalência EN/ES (Aud. 2) | Disclaimer ausente | Confirmado → **CORRIGIDO localmente** | Doer → jurídico valida | Validar na release |
| J-11 ECA Digital/idade (Aud. 2) | Decisão #173 anterior à lei | **Reavaliação regulatória aberta** | Operador/Jurídico | Analisar enquadramento; reabrir decisão se aplicável |
| J-12 licenciamento de assets | Proveniência existe; auditoria por asset não | Confirmado como gap documental | Doer | Script de auditoria por asset exibido |
| J-13 CSP (residual Google Fonts incluído) | `next.config.ts:32` | Confirmado (= C-08 da passada 1) | Doer | Hardening: remover `unsafe-*` + resíduo fonts.googleapis |
| J-14 CORS | `app.ts:160-165` + `*.vercel.app` | Confirmado (= C-06) | Doer | CORS por ambiente |
| J-15 data do inventário de cookies | `en-us.ts:461` stale | Confirmado → **CORRIGIDO localmente** | Doer | Publicar na release de copy |

## Conclusão operacional (alinhada ao Operador)

- **J-01 encerrado tecnicamente** (local, 6 pontos/3 locales); aberto no remoto até a release —
  os commits `7d9acd0`, `2f3bcd7` e os desta rodada permanecem fora da `main` até validação.
- **Nenhum achado é bug do desenho J-15**: a ausência de age gate é decisão deliberada (#173) que
  agora precisa ser **re-validada sob o ECA Digital** (J-11-novo), não revertida automaticamente.
- Diagnóstico defensável: **implementação de controles relevante; governança jurídica/documental
  incompleta** — não "não conforme com a LGPD", não "conforme".
- Banco intocado, zero migration durante T454, zero push, T454 intacto.
