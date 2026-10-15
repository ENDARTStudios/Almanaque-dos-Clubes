import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * ESLint do `apps/web`.
 *
 * Este arquivo é curto, mas a história dele não é: **o `apps/web` não era lintado em pipeline
 * nenhum**. O script `lint` da RAIZ varre apenas `apps/api`, `apps/worker` e `packages`, então
 * nada aqui era verificado no CI. Quando finalmente ligamos, descobrimos que o linter nem
 * EXECUTAVA: o `eslint-plugin-react@7.37.5` (arrastado pelo `eslint-config-next`) declara peer
 * até `^9.7` e chama `context.getFilename()`, removido no ESLint 10. O dependabot tinha subido
 * o ESLint para 10 no PR #596 e **toda** regra do plugin React morria com
 * `contextOrFilename.getFilename is not a function` — silenciosamente, porque ninguém rodava.
 * O ESLint foi fixado em `^9.39.5` (o último suportado pelo plugin) no `package.json`.
 *
 * Com o linter rodando de verdade, 39 problemas apareceram — nenhum deles novo, todos
 * acumulados enquanto ninguém olhava. A maior parte foi corrigida (código morto, imports,
 * navegação com `window.location`, refs escritos durante o render). O que sobra está abaixo.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      /**
       * `react-hooks/set-state-in-effect` — rebaixada de erro para AVISO, de propósito.
       *
       * A regra vem do `eslint-plugin-react-hooks@7` e sinaliza padrões que o **React Compiler**
       * não consegue otimizar: escrever estado sincronamente dentro de um efeito. Ela é
       * legítima — mas NÃO é um bug de corretude. O padrão "busca dado num efeito e guarda no
       * estado" é React idiomático, funciona, e existe em 11 arquivos deste app
       * (AuthProvider, MapExplorer, RankingsTable, ReportDashboard, useFavorites,
       * CompareSelector, ClubCommunity, DireitosAutoraisPanel, DireitosTitularPanel,
       * FavoritesTargetList, i18n/Provider).
       *
       * Por que não consertar agora: cada um exige trocar o carregamento por outra estratégia
       * (unificar em `use()`/SWR, ou derivar em vez de guardar). Feito às pressas, num commit
       * cujo assunto é *ligar o lint*, seria a mudança mais arriscada do repositório — toca
       * sessão (AuthProvider), favoritos e o provider de idioma.
       *
       * Por que AVISO e não desligada: com `warn`, código NOVO que introduza o padrão aparece
       * no relatório. Desligada, ninguém saberia. É dívida declarada, não dívida escondida.
       *
       * O caminho de saída é um PR próprio de migração de carregamento, com o lint já no CI
       * para provar que nada regrediu. Aí esta linha volta a `error`.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
