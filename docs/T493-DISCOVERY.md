# T493 — Descoberta read-only (10-08)

> Despacho: verificar o que o Operador afirma existir (T470 DMCA, T472 i18n legal,
> WS-L dados legais, WS-P pagamento), reconciliar com o estado real do repo/Railway
> e implementar só os gaps. Regra de ouro: estado vivo prevalece.
> Método: grep/find no repo, `railway variables` (SOMENTE NOMES), curl em produção.

## Matriz de descoberta

| Item | Existe? | Onde | Completo? | O que falta |
|---|---|---|---|---|
| **T470 DMCA** | ✅ | `/direitos-autorais` (200 em produção) + `/direitos-titular` + `DireitosAutoraisPanel.tsx` (notificação + contranotificação, boa-fé + precisão, protocolo quando logado, canal manual deslogado) + `CopyrightNotification` na API | ~80% | (a) política de reincidentes ausente; (b) página 100% hardcoded em PT (não passa pelo Provider i18n); (c) posição legal DELIBERADA documentada no próprio painel: Lei 9.610/98 "e normas análogas", **sem safe harbor formal/agente DMCA EUA** — não é omissão, é decisão registrada em código |
| **T472 i18n legal** | ✅ | `apps/web/src/i18n/dictionaries/{pt-br,en-us,es-es}.ts` — documentos legais (privacidade, termos, cookies, termos-assinatura) completos nos 3 idiomas, com CNPJ real e disclaimer "versão vigente e prevalecente é a de português" no es/en | ~85% | (a) **hreflang ausente** (0 ocorrências no código); (b) páginas de painel (direitos-autorais/direitos-titular) hardcoded PT |
| **WS-L dados legais** | ✅ **REAIS** | CNPJ **45.370.930/0001-75**, razão social **END ART Studios**, **Osasco, SP — Brasil**, contato **endart.studios@gmail.com**, vigência **01/09/2026** (termos-assinatura), versão v1.3 (22/09/2026), DPO = seção "10. Encarregado (DPO)" (mesmo e-mail), `model CookieConsent` (prova versionada: version + consentedAt), rodapé permanente com 4 links legais + botão "gerenciar cookies" (revogação no rodapé) | ~95% | **Sem fonte real no repo/Railway (PERMANECEM COMO ESTÃO, viram pendência do Operador):** (a) e-mails específicos `contato@/suporte@/privacidade@/security@/reembolso@/direitos@` — o repo usa consistentemente o gmail institucional; (b) logradouro do endereço (só cidade/UF). NADA foi inventado |
| **WS-P pagamento** | ✅ | Gateway **Stripe** (stripe.service.ts, provider abstraction): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` + **12 price IDs** (PRO/ELITE × MONTH/YEAR × BRL/EUR/USD) no Railway (nomes verificados, valores NÃO lidos); webhook assinado (rawBody + `constructEvent`) e idempotente (`payment-events` insert-first, T447); `/checkout` e `/planos` 200 em produção = `PAYMENTS_ENABLED=true` ativo; preços `PLAN_CENTS = {PRO: 490, ELITE: 990}` (R$ 4,90 / R$ 9,90 — bate com o despacho), moeda por IP (Vercel header, nunca pelo cliente); CDC art. 49 completo nos termos-assinatura | ~90% | **§3.4**: o `/checkout` exibe recursos e avisos (cancelamento, arrependimento) mas **não exibe o preço/periodicidade/renovação/próxima cobrança do plano selecionado antes do redirect** ao Stripe — os próprios termos prometem "constam do checkout" (linha termos-assinatura) |

## Banner de cookies (auditoria 2.1 — CONFORME, sem regressão)

- Aceitar / Rejeitar / Gerenciar compartilham **classes idênticas** (destaque equivalente; comentário no código + teste E2E).
- Nenhum cookie opcional pré-marcado; inventário de produção verificado 22/09/2026 (contexto limpo = zero cookies sem ação do titular) — registrado no texto da Política de Cookies.
- Prova de consentimento: tabela `CookieConsent` com versão do banner + data/hora (LGPD 1ª camada, T436).
- Revogação permanente no rodapé (`openCookieConsent`).

## Decisões desta descoberta

1. **Vigência**: repo diz 01/09/2026 (o despacho citava pacote de 31/08/2026) — estado vivo prevalece, nada alterado.
2. **Safe harbor**: a ausência de agente DMCA EUA é posição legal documentada no painel — NÃO preencher como se fosse gap; o que falta (reincidentes + i18n do painel) entra nos PRs.
3. **hreflang**: as páginas legais servem os 3 idiomas na MESMA URL (locale por cookie/cliente). Implementação honesta: override `?locale=` no Provider + `metadata.alternates.languages` nas páginas legais (pt-BR/en-US/es-ES + x-default→pt-BR).
4. **Checkout**: moeda resolvida no servidor (`x-vercel-ip-country` → `mapCountryToCurrency`), passada como prop; cliente nunca escolhe moeda.

## Pendências do Operador (SEM inventar — não há fonte real no repo/Railway)

1. Criar os aliases de e-mail (`contato@`, `suporte@`, `privacidade@`, `security@`, `reembolso@`, `direitos@`) no domínio e atualizar os dicionários — hoje tudo centraliza em `endart.studios@gmail.com` (documentado honestamente como contato único).
2. Logradouro completo do endereço (hoje "Osasco, SP — Brasil").
3. Confirmar se as chaves Stripe em produção são modo LIVE ou TEST (só nomes foram verificados; o modo só é visível no valor — não lido por regra).
