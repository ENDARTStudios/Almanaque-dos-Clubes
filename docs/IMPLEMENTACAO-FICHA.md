# Processo de implementação do sistema FICHA

> Este documento existe para que a implementação **não dependa de ninguém dizer qual é o próximo
> passo**. Ele tem três partes: como medir o estado, a lista do que falta, e a ordem em que se
> executa cada item com o portão que o aprova.

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

**Estado em 2026-11-03, medido:**

```
rotas ................................ 50
usando o sistema FICHA ............... 2 (4%)
componentes .......................... 9 · 9 com teste
estados: vazio 1/50 · erro 0/50 · carregando 0/50
F0 Fundação .......................... ✓ 9/9
F1 Estados nas páginas migradas ...... bloqueada
F2 Migração das telas públicas ....... bloqueada
```

---

## 2. A lista — o que falta, item por item

Cada item tem **critério de aceite** e **portão**. Sem os dois, o item não está pronto.

### F0 · Fundação — ✓ CONCLUÍDA

| #    | Item                               | Portão                    |
| ---- | ---------------------------------- | ------------------------- |
| F0.1 | Tokens de dado e metal em `@theme` | `ui:audit:ci` verde       |
| F0.2 | 9 componentes FICHA                | `typecheck`               |
| F0.3 | Teste para cada um dos 9           | `ficha:status` mostra 9/9 |

### F1 · Estados — BLOQUEADA (1/2)

| #    | Item                                                      | Critério            | Portão         |
| ---- | --------------------------------------------------------- | ------------------- | -------------- |
| F1.1 | Toda rota migrada usa `EmptyState`                        | o script conta 100% | `ficha:status` |
| F1.2 | Toda rota que busca dado usa `ErrorState` com `retryHref` | idem                | `ficha:status` |
| F1.3 | Toda rota com `loading.tsx` usa `SkeletonFicha`           | idem                | `ficha:status` |
| F1.4 | `States` tem teste                                        | feito               | `vitest`       |

### F2 · Migração das telas — BLOQUEADA (2/10)

| #     | Tela                         | Por que nesta ordem                         | Estado                                |
| ----- | ---------------------------- | ------------------------------------------- | ------------------------------------- |
| F2.1  | `/competitions`              | descoberta; já tem `FichaHead` + `TierCard` | **feita**                             |
| F2.2  | `/competitions/[id]`         | maior superfície de dado                    | **feita no pódio**; tabelas pendentes |
| F2.3  | `/clubs`                     | descoberta, hierarquia país→estado→cidade   | pendente                              |
| F2.4  | `/clubs/[id]`                | 10 blocos reais mapeados no conceito        | pendente                              |
| F2.5  | `/players` + `/players/[id]` | lista + ficha                               | pendente                              |
| F2.6  | `/legends`                   | panteão, superfície escura                  | pendente                              |
| F2.7  | `/map`                       | coropleto + filtros com bandeira            | pendente                              |
| F2.8  | `/rankings`                  | já tem `RankingsTable`; falta o cabeçalho   | pendente                              |
| F2.9  | `/matches`                   | lista densa                                 | pendente                              |
| F2.10 | `/search` + `/favoritos`     | transversais                                | pendente                              |

### F3 · Superfícies que ainda não têm desenho nem código

| #    | Item                                 | Observação                                |
| ---- | ------------------------------------ | ----------------------------------------- |
| F3.1 | `/estadios` + `/estadios/[id]`       | rota **não existe**; 84 estádios no banco |
| F3.2 | `/temporadas` + `/temporadas/[ano]`  | rota **não existe**; 32 temporadas        |
| F3.3 | `/rankings/[slug]`                   | rota **não existe**; 72 rankings          |
| F3.4 | Páginas legais                       | rotas existem, sem FICHA                  |
| F3.5 | `/404`                               | `not-found.tsx` existe? verificar         |
| F3.6 | Auth: entrar, criar conta, recuperar | existem, sem FICHA                        |

### F4 · Identidade visual

| #    | Item                               | Observação                                 |
| ---- | ---------------------------------- | ------------------------------------------ |
| F4.1 | Logo: SVG oficial no lugar do mock | `public/brand/` já tem 3 SVG               |
| F4.2 | Globo animado na home              | `globo-animado.svg` pronto no conceito     |
| F4.3 | Gráficos animados portados         | componentes feitos; usar nas telas de dado |

### F5 · Qualidade

| #    | Item                          | Portão              |
| ---- | ----------------------------- | ------------------- |
| F5.1 | `typecheck`                   | CI                  |
| F5.2 | `lint` 0 erros                | CI                  |
| F5.3 | `test`                        | CI                  |
| F5.4 | `ui:audit:ci` 0 bloqueios     | CI                  |
| F5.5 | `build`                       | CI                  |
| F5.6 | Contraste medido nos 3 metais | manual, documentado |

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

### Por que extrair antes de testar

Um bloco dentro de um Server Component de 1.000 linhas não pode ser renderizado sozinho, então
não pode ser verificado sozinho. O pódio ficou 1.307 linhas enterrado, sem teste, e por isso
carregou bronze pintado de ouro. Extrair é pré-requisito de testar, não refactor cosmético.

### Por que o portão vem antes do commit

`ui:audit:ci` mede contraste, movimento e classes proibidas. Ele **não** mede hierarquia, forma,
proporção de gráfico nem estado semântico — para isso existem os testes de componente. Os dois
juntos são o portão; um só não é.

### Quando um item revelar um bug

O bug **faz parte do item**. Foi o que aconteceu com o bronze: a migração do pódio encontrou a cor
errada. Não se abre um PR "de migração" deixando o bug para depois — o item só fecha com o bug
fechado e coberto por teste.

---

## 4. O que este documento não decide

- **Não decide copy.** O texto de cada tela vem do dicionário existente (`pages.*`), e texto novo
  passa por `types.ts` + 3 locales.
- **Não decide dado que não existe.** `Player` não tem cidade; `/estadios` não tem rota. Item de
  F3 que dependa disso começa por migração de schema, não por tela.
- **Não substitui a skill `design-system-almanaque`.** Onde as duas divergirem, a skill manda.

---

## 5. Como saber que acabou

`pnpm run ficha:check` sai com **0** — as três fases verdes. Hoje sai com 1, e os dois bloqueios
são os itens F1 e F2 acima.
