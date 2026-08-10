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

### [1] Escolher e registrar domínio oficial do Almanaque dos Clubes
Por quê: A Fase 7 (DNSSEC/CAA/HSTS preload) só pode ser aplicada com domínio próprio. Sem isso, deploy usará subdomínio gratuito (Fly.io/Railway) sem HSTS preload.
Onde: Em qualquer registrador de domínios (ex.: Registro.br para `.br`, Namecheap/Cloudflare para TLDs genéricos).
Passo a passo:
1. Escolher o domínio (sugestões: `almanaquedosclubes.com.br`, `almanaque.club`, `adclubes.com`).
2. Registrar no registrador escolhido.
3. Configurar DNS apontando para o serviço de deploy (instruções serão fornecidas na Fase 9).
Como saber que deu certo: Ao acessar o domínio pelo navegador, carregar a página do Almanaque dos Clubes (em produção).
Depois de feito: responda "feito o item Nº 1"

<!-- Novas pendências são adicionadas abaixo, com numeração sequencial. -->
