import type { Locale } from './config';

/**
 * FICHA — strings dos componentes do sistema e dos três estados que faltavam.
 *
 * Módulo ADITIVO, como os `wsC*.ts`: não altera o `Dictionary` global nem o `types.ts`, que é
 * compartilhado por três idiomas e por 40 telas. Consumido por Server Components (via cookie de
 * locale) e por Client Components (via `useI18n().locale`).
 *
 * ── POR QUE ESTE MÓDULO EXISTE ───────────────────────────────────────────────────────────────
 * A regra 4 do design system: "nenhum texto literal na tela — toda string visível passa por
 * dicionário ou módulo aditivo". Os componentes novos (gráfico, estado vazio, estado de erro,
 * pódio) precisavam de strings e não podiam ficar com português cravado no JSX.
 *
 * ── O QUE ELE **NÃO** CONTÉM ────────────────────────────────────────────────────────────────
 * Rótulo de degrau de alcance e título de seção: esses já existem no dicionário
 * (`s.degrauMundial`, `s.destaques`) e duplicá-los aqui criaria duas fontes para o mesmo texto.
 */
export interface FichaStrings {
  /** Os três estados que nenhuma das 22 telas do conceito tinha desenhado. */
  states: {
    emptyTitle: string;
    emptyBody: string;
    errorTitle: string;
    errorBody: string;
    /**
     * Fronteira de erro (o componente quebrou), NÃO falha de origem.
     * `errorBody` diz "a origem não respondeu" — o que é falso quando a exceção veio do próprio
     * React, e ainda referencia "o número abaixo", que nesse caso não existe.
     */
    crashTitle: string;
    crashBody: string;
    retry: string;
    loading: string;
    loadingChart: string;
  };
  /** Nomes acessíveis dos gráficos. O gráfico é uma imagem: sem isto ele não é lido. */
  charts: {
    barsLabel: string;
    lineLabel: string;
    donutLabel: string;
    /** Texto que resume a série para leitor de tela. */
    summary: string;
  };
  /** Pódio: o lugar em texto, porque a cor do medalhão nunca é o único portador. */
  podium: {
    first: string;
    second: string;
    third: string;
  };
}

export const fichaStrings: Record<Locale, FichaStrings> = {
  'pt-br': {
    states: {
      emptyTitle: 'Nada aqui ainda',
      emptyBody:
        'Esta lista está vazia porque o acervo não tem dado para este recorte. Não preenchemos com exemplo.',
      errorTitle: 'Não foi possível carregar',
      errorBody:
        'A origem não respondeu. O número que aparece abaixo é o último que conseguimos verificar.',
      crashTitle: 'Esta tela falhou ao montar',
      crashBody:
        'O erro foi registrado. O identificador abaixo liga esta tela ao log — não é preciso recarregar a página para tentar de novo.',
      retry: 'Tentar de novo',
      loading: 'Carregando',
      loadingChart: 'Montando o gráfico',
    },
    charts: {
      barsLabel: 'Gráfico de barras',
      lineLabel: 'Gráfico de linha',
      donutLabel: 'Gráfico de rosca',
      summary: 'Resumo da série',
    },
    podium: {
      first: 'Campeão',
      second: 'Vice-campeão',
      third: '3º lugar',
    },
  },
  'en-us': {
    states: {
      emptyTitle: 'Nothing here yet',
      emptyBody:
        'This list is empty because the archive has no data for this slice. We do not fill it with samples.',
      errorTitle: 'Could not load',
      errorBody: 'The source did not answer. The number below is the last one we could verify.',
      crashTitle: 'This screen failed to render',
      crashBody:
        'The error was recorded. The identifier below links this screen to the log — you do not need to reload to try again.',
      retry: 'Try again',
      loading: 'Loading',
      loadingChart: 'Building the chart',
    },
    charts: {
      barsLabel: 'Bar chart',
      lineLabel: 'Line chart',
      donutLabel: 'Donut chart',
      summary: 'Series summary',
    },
    podium: {
      first: 'Champion',
      second: 'Runner-up',
      third: 'Third place',
    },
  },
  'es-es': {
    states: {
      emptyTitle: 'Aquí todavía no hay nada',
      emptyBody:
        'Esta lista está vacía porque el acervo no tiene datos para este recorte. No la rellenamos con ejemplos.',
      errorTitle: 'No se pudo cargar',
      errorBody: 'El origen no respondió. El número de abajo es el último que pudimos verificar.',
      crashTitle: 'Esta pantalla falló al montarse',
      crashBody:
        'El error quedó registrado. El identificador de abajo vincula esta pantalla al registro — no hace falta recargar para intentarlo de nuevo.',
      retry: 'Intentar de nuevo',
      loading: 'Cargando',
      loadingChart: 'Armando el gráfico',
    },
    charts: {
      barsLabel: 'Gráfico de barras',
      lineLabel: 'Gráfico de líneas',
      donutLabel: 'Gráfico de anillo',
      summary: 'Resumen de la serie',
    },
    podium: {
      first: 'Campeón',
      second: 'Subcampeón',
      third: 'Tercer lugar',
    },
  },
};
