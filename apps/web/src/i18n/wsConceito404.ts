import type { Locale } from './config';

/** Copy adicional do 404 no conceito FICHA (título/descrição continuam em common.*). */
export interface Conceito404Strings {
  kicker: string;
  ballCaption: string;
  note: string;
  shortcutsLabel: string;
  legendsHint: string;
}

export const wsConceito404: Record<Locale, Conceito404Strings> = {
  'pt-br': {
    kicker: 'Erro 404',
    ballCaption: 'a bola furou',
    note: 'O 404 não é erro do acervo: nenhum dado é inventado para preencher a página.',
    shortcutsLabel: 'Três caminhos de volta',
    legendsHint: 'o panteão do futebol',
  },
  'en-us': {
    kicker: 'Error 404',
    ballCaption: 'the ball went flat',
    note: 'The 404 is not an archive error: no data is invented to fill the page.',
    shortcutsLabel: 'Three ways back',
    legendsHint: 'the football pantheon',
  },
  'es-es': {
    kicker: 'Error 404',
    ballCaption: 'la pelota se desinfló',
    note: 'El 404 no es un error del acervo: ningún dato se inventa para rellenar la página.',
    shortcutsLabel: 'Tres caminos de vuelta',
    legendsHint: 'el panteón del fútbol',
  },
};
