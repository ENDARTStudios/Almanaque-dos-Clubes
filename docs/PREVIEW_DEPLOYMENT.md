# PREVIEW_DEPLOYMENT.md — Preview por PR

## Web (Vercel)

- Todo PR gera **preview automático** da Vercel (comentário do bot no PR com a URL).
- O preview usa o mesmo build de produção; `LEGAL_PAGES_ENABLED` e flags seguem o ambiente do
  projeto (validar claims de oferta no preview ANTES do merge quando a task toca texto público).
- `deploy-vercel-frontend` no CI: roda no merge para main (produção).

## API (Railway)

- Ambientes adicionais (ex.: `preview`) existem sob demanda (T447) — NÃO ficam ligados por padrão:
  provisionamento de DB fresh exige baseline+resolve (procedimento no PR do T447; armadilha:
  env duplicado apontando para credenciais de produção = dado de produção em DB novo).
- Para validar API em PR sem preview: rodar a suíte de integração com Postgres real local
  ([docs/TESTING.md](./TESTING.md)) + DRY-RUN dos scripts.

## Regras

1. Preview é para OLHAR (dados de fixture); ingestão/escrita real só em produção via os scripts
   de container (autônomo do Doer) com DRY-RUN antes.
2. NUNCA apontar preview para banco de produção.
3. Após merge: verificação por FINGERPRINT no container de produção
   ([docs/PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md)) — "preview verde" não é produção.
