# Processo de implementação do sistema FICHA

> Este documento existe para que a implementação **não dependa de ninguém dizer qual é o próximo
> passo**. Ele tem quatro partes: como medir o estado, a lista do que falta, a ordem em que se
> executa cada item com o portão que o aprova, e o que o portão **não** cobre.

---

## 1. Como o estado é medido

```bash
pnpm run ficha:status     # tabela legível
pnpm run ficha:check      # sai com 1 se alguma fase estiver bloqueada (para CI)
node scripts/ficha-status.mjs --json
```

O script lê o repositório e recalcula, a cada execução:

| Medida             | Como                                                    | Por que importa                                |
| ------------------ | ------------------------------------------------------- | ---------------------------------------------- |
| Rotas              | `apps/web/src/app/**/page.tsx`                          | "migrar as telas" não tem denominador sem isso |
| Rotas usando FICHA | import de `@/components/ficha/`                         | mede a migração de verdade, não a intenção     |
| Componentes        | arquivos em `components/ficha/`                         |                                                |
| Componente testado | o caminho aparece em algum teste                        | componente sem teste é regressão esperando     |
| Componente em uso  | algum `.tsx` fora dele importa                          | componente sem uso é código morto              |
| Estados            | `EmptyState` / `ErrorState` / `SkeletonFicha` na página | a lacuna que o conceito declarou               |

Duas regras do medidor que **não** são detalhe de implementação:

1. **A medição segue UM NÍVEL de delegação.** A página pode delegar a lista a um componente
   (`CountryIndex`, `RankingsTable`, `GlobalSearch`). O vazio pertence a quem RENDERIZA a lista,
   não a quem a monta. Sem isso o critério reprova uma arquitetura que está correta.
2. **O Next herda fronteiras por segmento.** `app/error.tsx` cobre toda rota abaixo dele que não
   definir a própria — um arquivo cobre 39 rotas. Contar só o arquivo irmão subestimaria a
   cobertura.

**Estado em 2026-11-03, medido:**

```
rotas ................................ 55
usando o sistema FICHA ............... 49 (89%)
componentes .......................... 12 · 12 com teste · 12 em uso
estados: vazio 49/49 migradas · erro 55/55 · carregando 55/55
F0 Fundação .......................... ✓ 12/12
F0b Componentes em uso ............... ✓ 12/12
F1 Estados ........................... ✓ 49/49
F2 Migração das telas ................ ✓ 49/55
```

---

## 2. A lista — o que falta, item por item

Cada item tem **critério de aceite** e **portão**. Sem os dois, o item não está pronto.

### F0 · Fundação — ✓ CONCLUÍDA (12 componentes)

| #     | Item                                       | Portão                      |
| ----- | ------------------------------------------ | --------------------------- |
| F0.1  | Tokens de dado, degrau e metal em `@theme` | `ui:audit:ci` verde         |
| F0.2  | Componentes FICHA                          | `typecheck`                 |
| F0.3  | Teste para cada um                         | `ficha:status` mostra 12/12 |
| F0b.1 | Todo componente tem consumidor             | `ficha:check` reprova morto |

### F1 · Estados — ✓ CONCLUÍDA

| #    | Item                                                      | Critério            | Portão         |
| ---- | --------------------------------------------------------- | ------------------- | -------------- |
| F1.1 | Toda rota migrada usa `EmptyState`                        | o script conta 100% | `ficha:status` |
| F1.2 | Toda rota que busca dado usa `ErrorState` com `retryHref` | idem                | `ficha:status` |
| F1.3 | Toda rota com `loading.tsx` usa `SkeletonFicha`           | idem                | `ficha:status` |

**Exceções declaradas** (aparecem na saída do script, com motivo). Exceção declarada é revisável;
exceção silenciosa é dívida escondida:

| Rota                                      | Por que não tem vazio                                       |
| ----------------------------------------- | ----------------------------------------------------------- |
| `/compare`, `/clubs/compare`              | seletor de dois clubes: não há lista que possa vir sem item |
| `/dashboard`                              | painel de conta com cartões fixos                           |
| `/dashboard/subscription`                 | "sem plano" É o plano gratuito                              |
| `/apoiadores`                             | busca CONTAGENS para a prova do acervo, não uma lista       |
| `/direitos-titular`, `/direitos-autorais` | documento legal com formulário: não há lista                |
| `/estadios/[id]`, `/temporadas/[id]`      | ficha de registro único; campo ausente mostra "—"           |
| `/`                                       | composição de abertura: cada seção traz o próprio estado    |
| `/admin` e 5 painéis                      | o "vazio" já é expresso como ZERO no KPI ou no cartão       |

### F2 · Migração das telas — ✓ CONCLUÍDA (49/55)

Todas as telas de dado migraram. As 6 restantes são **decisão**, não pendência:

| Rota                                                                                        | Por que fica fora                                                                                                                       |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/auth/login` · `/auth/register` · `/auth/forgot-password` · `/auth/reset-password/[token]` | card centralizado `auth-card__*`; um cabeçalho de página dentro de um card de 400px quebraria o layout — e o conceito não desenhou auth |
| `/checkout`                                                                                 | fluxo de compra: composição própria, sem título de página                                                                               |
| `/favoritos`                                                                                | é um redirect; não tem UI                                                                                                               |

### F3 · Superfícies que não existiam — ✓ CONCLUÍDA

| #    | Item                               | Como foi                                                |
| ---- | ---------------------------------- | ------------------------------------------------------- |
| F3.1 | `/estadios` + `/estadios/[id]`     | exigiu o módulo `stadiums` na API (não existia)         |
| F3.2 | `/temporadas` + `/temporadas/[id]` | usa o módulo `seasons`, que já existia                  |
| F3.3 | `/rankings/[id]`                   | `findEntries` passou a resolver `clubName`/`playerName` |
| F3.4 | Páginas legais                     | `ContentDocument` e `LegalDocument` migrados (8 rotas)  |
| F3.5 | 404                                | bola furada — o conceito só tinha o número do protocolo |
| F3.6 | Auth                               | **fora**, pela razão em F2                              |

### F4 · Identidade visual — ✓ CONCLUÍDA

| #    | Item            | Como foi                                                         |
| ---- | --------------- | ---------------------------------------------------------------- |
| F4.2 | Globo na home   | **refeito**, não portado: o SVG do conceito vazava da esfera     |
| F4.3 | Gráficos em uso | `DataTable` no índice de competições · `Donut` na ficha do clube |

> **F4.2 é o caso que justifica o resto deste documento.** O `globo-animado.svg` do conceito foi
> renderizado em Chromium e OLHADO antes de ser portado. Tinha meridianos vazando da esfera e
> gomos pentagonais chapados saindo da silhueta. Portar teria importado os defeitos com aparência
> de trabalho feito. O componente `Globe` refaz a projeção e o teste trava as invariantes.

### F5 · Qualidade — ✓ CONCLUÍDA

| #    | Item                      | Portão           | Estado                |
| ---- | ------------------------- | ---------------- | --------------------- |
| F5.1 | `typecheck`               | CI               | verde                 |
| F5.2 | `lint` 0 erros            | CI               | verde                 |
| F5.3 | `test`                    | CI               | verde                 |
| F5.4 | `ui:audit:ci` 0 bloqueios | CI               | verde                 |
| F5.5 | `build`                   | CI               | verde                 |
| F5.6 | Contraste nos 3 metais    | `ficha-contrast` | **teste**, não tabela |

---

## 3. O processo — como executar sem perguntar

### Regra de ouro

**Um item por PR de trabalho.** Não se abre a próxima tela com a anterior sem teste, porque foi
assim que o bug do bronze sobreviveu: o pódio existia, funcionava na tela, e estava com a cor
errada.

### O ciclo, para qualquer item

```
1. RODAR      pnpm run ficha:status        → confirmar que o item está pendente
2. LER        a página/componente antes de editar (regra da skill do design system)
3. EXTRAIR    o bloco de JSX para components/ficha/ se ele não for testável sozinho
4. TESTAR     o componente (jsdom + testing-library), antes de plugar na página
5. PLUGAR     na página, com EmptyState/ErrorState/SkeletonFicha
6. PORTÕES    typecheck · lint · test · ui:audit:ci · build
7. MEDIR      pnpm run ficha:status        → o item saiu de pendente
8. COMMIT     mensagem com o antes/depois medido
```

### Quando o item toca a API: passo 6b

Typecheck e build **não executam SQL**. O módulo `stadiums` passou nos dois com um bug que só o
banco mostrou: `ORDER BY capacity DESC` no Postgres trata `NULL` como o MAIOR valor, então o
estádio sem capacidade encabeçava a lista ordenada por capacidade. O mesmo erro já tinha sido
corrigido em `rankings` e não em `stadiums`.

O `.env` da raiz aponta para o Railway e **não se toca nele** (credenciais são do Operador).
O ambiente local já tem o necessário; basta apontar as variáveis **no comando**:

```bash
# Postgres de teste (PostGIS) e Redis que já rodam localmente
PW=$(docker inspect almanaque-postgis-test --format '{{range .Config.Env}}{{println .}}{{end}}' \
     | grep '^POSTGRES_PASSWORD=' | cut -d= -f2-)

DATABASE_URL="postgresql://almanaque:$PW@localhost:54330/almanaque_test?schema=public" \
REDIS_URL="redis://localhost:6379" REDIS_HOST=localhost REDIS_PORT=6379 \
  pnpm --filter api exec vitest run
```

Estado medido com esse comando: **1804 passando · 5 falhando** (era 1683 · 82 — as 82 eram só a
URL do Railway).

Uma execução posterior deu **9 falhando**, não 5. A diferença não é do código: o banco de teste é
**stateful** e alguns testes não limpam tudo o que criam, então o resultado deriva entre
execuções. Consequência prática: **o número de falhas não é uma linha de base estável** — o que
se compara é o CONJUNTO de arquivos que falham, não a contagem. Para uma linha de base limpa,
recriar o schema do banco de teste antes de rodar.

As falhas restantes são **pré-existentes e comprovadas** contra `origin/main`: `legends` (2),
`rls-sessions-policies` (2) e `enrich-media-service` (1). A primeira é estado de fixture na
agregação; as duas últimas dependem de políticas RLS e de endpoint externo.

O comando acima está empacotado:

```bash
pnpm run ficha:verify:api    # acha o container, valida pg_isready e roda a suíte da API
```

### Por que extrair antes de testar

Um bloco dentro de um Server Component de 1.000 linhas não pode ser renderizado sozinho, então
não pode ser verificado sozinho. O pódio ficou 1.307 linhas enterrado, sem teste, e por isso
carregou bronze pintado de ouro. Extrair é pré-requisito de testar, não refactor cosmético.

### Quando o desenho vem do conceito: olhar antes de portar

`@playwright/test` está instalado e os navegadores baixados. Renderizar um SVG/rota e **ver** o
resultado custa um comando e pega o que nenhum teste de tipo pega. Foi assim que o globo foi
recusado na primeira versão.

### Quando um item revelar um bug

O bug **faz parte do item**. Foi o que aconteceu com o bronze e com o `nulls: 'last'`: a migração
encontrou o defeito. Não se abre um PR "de migração" deixando o bug para depois.

---

## 4. O que este documento não decide

- **Não decide copy.** O texto de cada tela vem do dicionário existente (`pages.*`), e texto novo
  passa por `types.ts` + 3 locales.
- **Não decide dado que não existe.** `Player` não tem cidade; `/estadios` exporta `capacity` como
  `null`, nunca `0`.
- **Não substitui a skill `design-system-almanaque`.** Onde as duas divergirem, a skill manda.
- **Não decide se uma tela deve existir.** As 6 rotas fora do F2 estão fora por decisão, não por
  falta de tempo.

---

## 5. Como saber que acabou

```bash
pnpm run ficha:check        # sai com 0 — as fases verdes
```

Sai com **0**.

Mas o `check` verde **não** significa que tudo está verificado. Ele mede o frontend. O que ele
não mede, e continua sendo obrigação de quem mexe:

| Não medido                                | Onde verificar                           |
| ----------------------------------------- | ---------------------------------------- |
| SQL de rotas novas                        | suíte de integração com Postgres local   |
| Posição de um elemento dentro de uma tela | screenshot em Chromium + olhar           |
| As 5 falhas de API pré-existentes         | rodar contra `origin/main` para comparar |
