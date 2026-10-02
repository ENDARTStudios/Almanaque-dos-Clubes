# T443 — Teste de fogo do cutover (healthcheck gate) — 2026-09-16

Cenário: replay do modo de falha do T437 (credencial `DATABASE_URL_APP`
inválida → entrypoint/healthcheck falham no deployment novo).

| Hora (UTC) | Evento | health /api/v1/health |
|---|---|---|
| 23:04:43 | Variável quebrada aplicada (deploy de fogo) | — |
| 23:05:19 | poll 1 | **200** |
| 23:05:54 | poll 2 | **200** |
| 23:06:30 | poll 3 | **200** |
| 23:07:06 | poll 4 | **200** |
| 23:07:41 | poll 5 | **200** |
| 23:08:17 | Variável restaurada → redeploy SUCCESS | 200 |

Railway: deployment novo `8f282931` = **FAILED** (isolado);
`e97dff22` (bom) permaneceu **SUCCESS servindo** o tráfego.
Produção NÃO caiu durante a janela — o gate do healthcheck
(railway.json → deploy.healthcheckPath) funcionou conforme desenhado.
