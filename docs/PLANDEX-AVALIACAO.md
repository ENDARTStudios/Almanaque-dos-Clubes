# Plandex — avaliação e decisão

**Decisão: não adotado como ferramenta do projeto. A ideia que valia a pena foi implementada.**
Data da avaliação: 2026-10. Autor: agente, a pedido do Operador ("investigue a ferramenta e
implemente ao projeto… ou apenas copie as boas ideias que podem beneficiar o projeto").

## O que é

[Plandex](https://github.com/plandex-ai/plandex) é um agente de programação de terminal, em Go,
feito para tarefas grandes que tocam dezenas de arquivos. Os diferenciais que ele anuncia:

- contexto efetivo de ~2M tokens, com mapas de projeto via tree-sitter (30+ linguagens);
- **sandbox de diff cumulativo**: as mudanças ficam separadas dos arquivos até serem aprovadas;
- combinação de modelos de Anthropic, OpenAI, Google e abertos, com _model packs_;
- autonomia configurável, incluindo depuração automática de comandos de terminal.

Licença **MIT** (verificada em `LICENSE` do repositório): uso comercial liberado, sem copyleft.

## Viabilidade técnica — testada, não suposta

| Item                       | Resultado                                                                |
| -------------------------- | ------------------------------------------------------------------------ |
| Binário para Windows       | **Não existe.** Releases trazem só `darwin`, `freebsd` e `linux`         |
| WSL na máquina do Operador | Existe (distro `docker-desktop`, Linux 6.18)                             |
| Binário Linux sob WSL      | **Baixado e executado** — `plandex --help` respondeu                     |
| Docker                     | 29.8.1 instalado (parado no momento do teste)                            |
| Postgres local             | Já roda na porta 5432                                                    |
| RAM da máquina             | 15,8 GB                                                                  |
| Chave de modelo no projeto | **Nenhuma.** As `GOOGLE_CLIENT_ID/SECRET` são OAuth de login, não modelo |

O detalhe que quase passou: a distro `docker-desktop` monta os drives em `/mnt/host/c`, não em
`/mnt/c`, e não tem `curl`. Instalar o CLI ali exige baixar pelo Windows e chamar o binário pelo
caminho certo — funciona, mas é gambiarra de ambiente, não integração.

Arquitetura, para registro: o CLI é só a interface. **Todo trabalho passa por um servidor**
(Go + Postgres + sistema de arquivos persistente + SMTP para autenticação em produção). Adotar o
Plandex, portanto, não é instalar um programa: é operar um serviço.

## Por que não adotado

1. **Projeto em fim de vida.** Última release em jul/2025 (`cli/v2.2.1`). Os commits mais recentes
   tratam do encerramento do Plandex Cloud, em out/2025. O próprio README anuncia o
   _wind down_. Adotar isso é assumir uma dependência sem manutenção ativa, com 67 issues abertas.

2. **Só roda no Windows via WSL**, e não há binário nativo. Toda a operação ficaria dependente de
   uma distro que hoje existe por causa do Docker Desktop.

3. **Custo de infraestrutura para um problema que este projeto não tem.** Servidor + Postgres +
   SMTP + chave de modelo paga (ou Ollama local em 15,8 GB de RAM, com qualidade marginal para
   tarefas grandes) para habilitar um agente autônomo.

4. **O gargalo do projeto não é contexto.** O que travou o trabalho nesta base não foi janela de
   contexto nem execução autônoma de tarefas longas — foi **verificar o que a tela mostra** e
   **evitar que sessões diferentes se atropelem**. Um agente autônomo adicional no mesmo
   repositório agravaria o segundo problema, não o primeiro.

5. **Já existem múltiplas sessões de agente neste repositório.** Entre os PRs #663 e #680, boa parte
   não foi escrita nesta sessão. Somar mais um executor autônomo sobre o mesmo `main` aumenta a
   chance de conflito, sem resolver nada.

## A ideia que valia a pena — e foi implementada

Do Plandex veio **uma** ideia que serve a este projeto, e ela está em `scripts/preflight.mjs`:

> **Revisar o diff, com os portões rodando, ANTES de virar commit.**

O Plandex faz isso como "cumulative diff review sandbox". Aqui foi feito com o que o projeto já
tem, sem servidor, sem banco e sem chave de modelo:

```bash
pnpm preflight           # portões dos pacotes tocados pelas mudanças atuais
pnpm preflight --list    # só o escopo, sem executar nada
pnpm preflight --build   # inclui build (lento)
pnpm preflight --json    # saída para máquina
pnpm test:preflight      # 21 testes da lógica do próprio script
```

### O que ele resolve, concretamente

O erro que mais custou caro nesta base não foi código quebrado: foi **declarar um item verificado
apoiado em portão verde que não cobria o caso**. Três casos reais, todos passando por typecheck,
lint, build e teste de unidade:

- um componente exibindo `pages.admin.title` na tela — o typecheck valida o _tipo_ de `t()`, não a
  _existência_ da chave;
- o gate de operador posicionado **depois** do `<h1>`, anunciando ferramenta restrita a quem não
  pode abri-la;
- um seletor de idioma que abria a janela do sistema operacional.

Por isso o relatório tem duas partes, e a segunda é a principal: os portões que passaram, e **o
que nenhum portão automático cobre** naquelas mudanças específicas.

### Três decisões de projeto que valem registro

**Não modifica nada.** Não faz stage, não commita, não escreve arquivo. Rodar duas vezes dá o mesmo
resultado. Uma ferramenta de revisão que altera o que revisa não é ferramenta de revisão.

**Distingue "código quebrado" de "ambiente que não permite medir".** Descoberto rodando a própria
ferramenta: `api:test` falhou em 155 s porque o Postgres local recusou a credencial — e não havia
uma linha de `apps/api` alterada. Reportar isso como "portão VERMELHO" ensina a ignorar vermelho.
Reportar como "verde" seria mentir. O veredito é um terceiro: **PARCIAL — não medido aqui, o CI
mede com o banco dele**. O limite é declarado: se uma falha real contiver uma assinatura de
ambiente, ela será classificada como ambiente; por isso a saída mostra a linha que casou.

**Avisos derivados do escopo, não de lista fixa.** Arquivo em `apps/web/src/app` acende o aviso de
renderização; dicionário de i18n acende o de chave; rota de API sem teste acende o de rota;
autenticação acende o de segurança; CSS acende o de token. Arquivo irrelevante não acende nada.

### Custo medido

Rodada completa na máquina do Operador (turbo frio): ~250 s, dos quais ~155 s são o `api:test`
esperando o banco. Web sozinho: ~30 s (typecheck 4,6 s · lint 17,3 s · test 7,3 s).

## O que NÃO foi feito

- O Plandex **não foi instalado**. A avaliação parou depois de provar que o binário executa sob WSL.
- O pré-voo **não foi ligado ao CI**. Ele mede o ambiente do desenvolvedor; no CI os portões já
  rodam com o banco disponível. Ligá-lo ao CI testaria o próprio script, não o código.
- O pré-voo **não é pré-commit obrigatório**. O husky continua só com `lint-staged`. Torná-lo
  bloqueante custaria ~30 s por commit aos 3 min do caso com banco — decisão do Operador, não
  tomada aqui.

## Se a decisão mudar

Se o Plandex for retomado (por exemplo, se o projeto voltar a ter releases), o caminho testado é:

1. servidor self-hosted via `app/docker-compose.yml` do repositório deles (Postgres incluso);
2. `PLANDEX_SERVER` apontando o CLI para ele;
3. CLI executado de dentro de uma distro WSL de verdade — **não** da `docker-desktop`, que é mínima
   e monta os drives em `/mnt/host/`;
4. model pack `oss` (Ollama) para custo zero, ou chave de provedor paga para qualidade.
