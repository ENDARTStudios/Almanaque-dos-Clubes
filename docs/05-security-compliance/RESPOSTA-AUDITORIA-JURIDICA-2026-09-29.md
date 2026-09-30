# Resposta à Auditoria Jurídica Externa — 29/09/2026

> Objeto: verificação item a item da auditoria jurídica recebida em 29/09/2026 (elaborada sobre a
> `main` do mesmo dia). Método: **estado vivo prevalece sobre anexos** — cada achado foi
> re-verificado no código local com evidência `file:line`. Cruzamento com a auditoria de segurança
> interna passada 1 (`docs/05-security-compliance/security-audit-2026-09-29/`).
> Veredicto geral da auditoria externa é **corroborado**: a implementação técnica está mais madura
> que a governança jurídica formal; nada aqui é "LGPD compliant" por declaração.

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

## Integridade do achado externo

Dos 12 achados auditedos, **11 confirmados** na verificação local (J-01 com 1 ponto adicional) e
1 confirmado-parcial (J-09, já tratado como dependência operacional). Nenhum refutado. O achado
externo é confiável como base de planejamento, com a ressalva de que a auditoria não tinha acesso
a contratos externos — itens J-02/J-03/J-06/J-07 exigem material que só existe fora do repositório.
