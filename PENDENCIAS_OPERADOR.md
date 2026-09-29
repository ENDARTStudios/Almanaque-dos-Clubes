# PENDENCIAS_OPERADOR.md

Fila de ações manuais que **só o Operador pode fazer** (clicar "Autorizar" em
tela de terceiro, digitar 2FA, escolher nome/domínio, inserir cartão, etc.).

PROTOCOLO_MESTRE.md, Seção 7: o Doer só escala para o Operador via este
template — nunca por prosa livre no chat. Automação sempre tem preferência;
uma entrada aqui só existe porque o passo é impossível de automatizar.

Formato obrigatório de cada item:

```
### [Nº] Título curto
Por quê: <1 frase, sem jargão>
Onde: <nome exato do site/app, com link>
Passo a passo:
1. ...
Como saber que deu certo: <o que aparece na tela>
Depois de feito: responda "feito o item Nº X"
```

---

## Fila de pendências

> **ATENÇÃO:** As pendências abaixo **bloqueiam** a entrada em produção.
> Prioritárias para a Fase 10 (Go to Production).

### [1] ~~Escolher e registrar domínio oficial do Almanaque dos Clubes~~ ✅ FEITO
Domínio registrado: `almanaquedosclubes.com` na Vercel (14/08/2026), expira 14/08/2027.
- Frontend: Vercel (projeto `almanaque-dos-clubes`) → `almanaquedosclubes.com` + `www.almanaquedosclubes.com`
- Backend API: Railway (serviço `Almanaque-dos-Clubes`) → `api.almanaquedosclubes.com`
- DNS: Vercel DNS (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`)
- CORS da API atualizado para aceitar o novo domínio.

<!-- Novas pendências são adicionadas abaixo, com numeração sequencial. -->

---

### Pendência ODbL / Vercel free-tier — WS-D M1a-3

**Status:** ✅ **RESOLVIDA (2026-09-28)** — a atribuição **ODbL está viva** em
https://almanaquedosclubes.com/metodologia: “© contribuidores do OpenStreetMap … Open Database License
(ODbL)”, com menção a Nominatim, Wikidata CC0 e RSSSF “não é domínio público” intactos. O deploy de produção
da Vercel destravou e o **gate ODbL passou** → **WS-D M1a-3 [x]**.

**Residual:** ✅ **encerrado (2026-09-28)** — o literal canônico em inglês “© OpenStreetMap contributors”
(PR #264) **já está vivo**: `/metodologia` foi confirmada com “OpenStreetMap contributors” + “Open Database
License (ODbL)” + “Nominatim”, com Wikidata CC0, RSSSF “não é domínio público” e MG/GO/PR/EN intactos.

**Trava de mapa:** com a ODbL completa (PT+EN) publicada, a trava de mapa público pode ser removida **apenas
com aprovação explícita do Thinker (WS-C-3)** — o mapa segue `noindex/nofollow` e fora do nav.

Abaixo, o histórico original da pendência.
**Dados já vivos:** coordenadas derivadas de **Nominatim/OSM** (451) estão em produção **via API**.
**Risco:** conformidade de atribuição ODbL incompleta na superfície pública web.

**Ação obrigatória após o reset do limite (~24h):**

1. Confirmar deploy de produção da Vercel no SHA mais recente da `main` (target `production`, aliases
   `almanaquedosclubes.com` + `www.almanaquedosclubes.com`, status READY/SUCCESS).
2. Fetch cache-bypass de `/metodologia`.
3. Verificar strings obrigatórias:
   - “© OpenStreetMap contributors”
   - “ODbL” ou “Open Database License”
   - menção clara de que coordenadas/cidades complementares podem derivar de OpenStreetMap/Nominatim
4. Verificar ausência de regressão em `/metodologia`: Wikidata CC0; RSSSF “não é domínio público”;
   atribuições MG/GO/PR/EN intactas; metodologia de ranking intacta.
5. Somente após verde, marcar **WS-D M1a-3 [x]**.

**Se após ~24h o limite persistir:** escalar ao Operador para decisão de infraestrutura (upgrade de plano
Vercel, aumento de limite, janela de deploy ou alternativa de hosting). **Não contornar o rate limit** e **não
publicar o mapa como feature pronta**.

**Trava permanente:** nenhum lançamento público do mapa-múndi ou promoção de dados geográficos OSM antes da
atribuição ODbL viva em `/metodologia`.

```
### [3] Destravar o deploy de produção do web (Vercel free-tier) para publicar o WS-C-2
Por quê: o WS-C-2 (perfil público, busca global e carrossel) está mergeado na main com CI verde, mas o limite diário de deploys da Vercel free-tier impede o deploy de produção.
Onde: Vercel — painel do projeto almanaque-dos-clubes (https://vercel.com/end-art-studios/almanaque-dos-clubes)
Passo a passo:
1. Aguardar o reset do limite (~24h) OU autorizar upgrade de plano / aumento de limite / alternativa de hosting.
2. Um push para a main dispara o deploy de produção (job deploy-vercel-frontend) no SHA mais recente.
3. Abrir /clubs/<id> (perfil), /search (busca) e a home (carrossel) e confirmar 200.
Como saber que deu certo: o perfil mostra a atribuição ODbL quando houver coordenada OSM; a busca retorna clubes/competições; o carrossel mostra um subconjunto de campeões.
Depois de feito: responda "feito o item Nº 3"
```

**Status:** ✅ **RESOLVIDA (2026-09-28)** — o limite resetou e a **produção web publicou o WS-C-2**
(deployment `almanaque-dos-clubes-3x3ywwmeo`, target `production`, `Ready`). Smoke verde:
`/`,`/rankings`,`/metodologia`,`/map` 200 · perfil OSM com `geo-attribution` e gaps · perfil Wikidata **sem**
ODbL indevido · inexistente → 404 · `/map` `noindex` e fora do nav · `/search` com input+combobox ·
API `/clubs/:id/profile` `attribution.license=ODbL` · `/champions/carousel` 200 · `/search/global` 200.
Integridade intacta (`ranking_entries` `d2b117aa…`, estadual 7, EN pyramid 1, 0 sem QID). **WS-C-2 [x]**.

**Histórico:** bloqueio `api-deployments-free-per-day`, **sem retry forçado**; cada merge na `main` dispara 1
tentativa automática do job `deploy-vercel-frontend`. Escalação (>24h) não foi necessária.

```
### [2] Destravar deploy de produção do web (Vercel free-tier) para publicar a atribuição ODbL
Por quê: o limite diário de deploys da Vercel free-tier impede publicar a atribuição OpenStreetMap/ODbL em /metodologia.
Onde: Vercel — painel do projeto almanaque-dos-clubes (https://vercel.com/end-art-studios/almanaque-dos-clubes)
Passo a passo:
1. Aguardar o reset do limite (~24h) OU autorizar upgrade de plano / aumento de limite / alternativa de hosting.
2. Garantir um deploy de produção no SHA mais recente da main (git push já dispara; se o limite persistir, aguardar).
3. Abrir https://almanaquedosclubes.com/metodologia e confirmar a seção de coordenadas com “© OpenStreetMap contributors (ODbL)”.
Como saber que deu certo: a página /metodologia exibe a atribuição OpenStreetMap/ODbL sem perder Wikidata CC0 nem RSSSF.
Depois de feito: responda "feito o item Nº 2"
```

### [4] Concluir (ou cancelar) a janela "Setup - Screaming Frog SEO Spider 24.3" parada na tela
Por quê: o instalador do Screaming Frog exige elevação (UAC), que só o Operador pode autorizar; a automação instalou tudo o resto, mas o wizard de desktop ficou parado na página "Select Destination Location" aguardando clique.
Onde: janela local do Windows "Setup - Screaming Frog SEO Spider 24.3" (aberta em 29/09/2026). Instalador salvo em `C:\Users\edina\AppData\Local\Temp\ScreamingFrogSEOSpider-24.3.exe` caso a janela tenha sido fechada.
Passo a passo:
1. Se a janela "Setup - Screaming Frog SEO Spider 24.3" estiver aberta: clicar Next → I Agree → Install → Finish (não precisa licença; o tier gratuito crawla até 500 URLs).
2. Se houver um prompt do UAC pendente de uma segunda tentativa, autorizar ou cancelar (a instância extra já foi encerrada pela automação; só a janela original deve restar).
3. Alternativa: cancelar o wizard e rodar depois `MSYS_NO_PATHCONV=1 /tmp/ScreamingFrogSEOSpider-24.3.exe /VERYSILENT /NORESTART` num shell admin.
Como saber que deu certo: existe a pasta `C:\Program Files (x86)\Screaming Frog SEO Spider` com `screamingfrogseospider.exe`.
Depois de feito: responder "feito o item Nº 4" — o MCP `screaming-frog-mcp` (já instalado via uv) passa a funcionar e o crawl de 500 URLs pode ser re-executado com o Spider.
