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
