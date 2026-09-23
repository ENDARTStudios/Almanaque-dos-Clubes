# RULES.md — Regras permanentes do projeto

> Fonte canônica dos detalhes: [DECISOES.md](../DECISOES.md) (cada regra tem entrada datada com
> evidência). Esta página é o índice operacional — as regras aqui NÃO se re-discutem sem fato novo.

## R1 — CI verde real

`CI - Security Gate` verde = typecheck + lint + unit/integration (Postgres real) + migration-drift +
gitleaks + dependency-audit. Verde vazio (skip silencioso por falta de banco) NÃO é verde:
`TEST_REQUIRE_DB=true` no CI faz banco ausente FALHAR, não pular (D-2026-09-18).

## R2 — Fixtures escopadas (nada de corrida entre testes)

Todo fixture usa nome/QID/ano únicos no escopo do arquivo e limpa no `afterAll`. Contagens globais
em banco compartilhado são corrida (contagem ESCOPADA ao fixture). Fixture com ano FUTuro ou que
contamine estado global de vitrine (ex.: campeão vigente) usa valor baixo (ano 1901) — T448b-1.
Seed P2002 → re-fetch com `findUniqueOrThrow`, nunca engolir.

## R3 — Dispatch/claims ancoram em QUERY, não em documento

Nenhum dispatch, auditoria, snapshot ou memória certifica estado: **query de produção ou leitura do
fonte do deploy vence sempre**. Validações desta regra: snapshot "dados 1%" (T448), type nulo
(T448e), oferta divergente (T465), "edição futura" do Cruijff (T448d), auditoria jurídica "10
clubes" (T469), sugestões de proxy do planner reprovadas por query (T448c). **Generalização: hint
de planner é hipótese; review externo também precisa de query.**

## Caminhos de escrita/invalidação NUNCA engolem erro

Catch silencioso em caminho de escrita/invalidação é anti-padrão nomeado com 3 instâncias:
logout-400 (#156), refund-skip (#146), cache-stale (T448d). `cache.invalidate` retorna resultado
estruturado e loga warn. Leitura (cache get) pode degradar silenciosamente.

## Dinheiro é fail-loud

Refund: resolve no provedor ANTES de marcar local; impossível resolver → ERRO, nunca skip
(D-2026-09-20-refund-fail-loud). Payment events: insert-first + idempotência por providerEventId.
Caminho de dinheiro só é certificado por teste com fixture realista do caminho de produção.

## Proveniência 100% e honestidade 1.3

Todo dado importado carrega fonte (QID/URL), data e licença. Divergência entre fontes → NÃO grava,
vai para revisão. Hierarquia sem dado auditável → vazio com `reason`, nunca inventado
(D-2026-09-22-t465-oferta-honesta para oferta; honestidade 1.3 para acervo).

## Processo de branch (D-2026-09-22-regra-processo-branch)

1. Todo commit de feature nasce NA branch do PR — nunca commit direto em main local.
2. Caiu na main local: `git reset --hard origin/main` ANTES de qualquer outra operação, depois
   cherry-pick para a branch, depois verificação de conteúdo no main (R3 aplicada ao git).
3. `stash` é de sessão: antes de `pop`, `git stash list` e confirmar que o topo é teu; stash alheio
   preserva-se, não se toca.
4. Após qualquer recuperação: `git status`/`git log`/`gh pr view` antes de continuar.
5. Deploy verificado por FINGERPRINT no container (`RAILWAY_GIT_COMMIT_SHA` + handler da rota),
   nunca por "fiz o merge".

## Oferta e dado público

- A oferta descreve SOMENTE o que roda; não-operacional = "(em breve)"; sem "ilimitado" sem
  alcance definido (D-2026-09-22-t465-oferta-honesta). Catálogo tem FONTE ÚNICA
  (`apps/web/src/lib/plan-features.ts`).
- Reduzir promessa é autônomo; ADICIONAR promessa ou fixar preço/periodicidade = Operador.
- PII de auditoria/terceiros NUNCA vira texto publicado (W2 — T469); pacote legal segue "para
  revisão de advogado", nunca "conforme" (W3).
