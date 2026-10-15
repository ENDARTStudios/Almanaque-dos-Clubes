// Gera o script do FigCraft para o conceito visual do Almanaque dos Clubes.
//
// COMO ESTE ARQUIVO FUNCIONA
// O `run` do FigCraft devolve os ids dos nós criados, mas não os expõe de volta ao script —
// então a numeração é determinística e rastreada aqui (arquivo novo: ids a partir de 2).
// Duas armadilhas medidas nesta ferramenta, ambas corrigidas abaixo:
//   1. `parent` por NOME não vincula: o nó fica na página e sai fora do recorte do frame.
//      É obrigatório passar o ID numérico.
//   2. Qualquer texto sem largura definida estoura por cima do que estiver ao lado.
//      Aqui TODO texto tem largura explícita, e a grade abaixo é a única fonte de coordenadas.
//
// Uso: node plugins/almanaque-design/tools/concept-board.mjs <saida.json>
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// ── Tokens reais do design system (apps/web/src/app/globals.css) ───────────────────────────
const T = {
  bg: '#12100f',
  surface: '#1a1715',
  surface2: '#211d1a',
  muted: '#241f1d',
  fg: '#f7f3ea',
  fg70: '#b3aea3',
  fg55: '#8d8880',
  border: '#6b625a',
  primary: '#e8412f',
  onPrimary: '#1a0e0b',
  secondary: '#c9a227',
};
const solid = (color) => [{ type: 'solid', color }];

// ── Grade: a ÚNICA fonte de coordenadas ───────────────────────────────────────────────────
const GRID = { w: 1440, margin: 64, get content() { return this.w - this.margin * 2; } };
const COND = 'Barlow Condensed';
const BODY = 'Barlow';

// ── Runner ─────────────────────────────────────────────────────────────────────────────────
let nextId = 2;
const script = [];
const emit = (command, params) => (script.push({ command, params }), nextId++);
const frame = (name, x, y, w, h, fills) =>
  emit('frame.create', { name, x, y, width: w, height: h, props: { fills: solid(fills) } });
const box = (parent, name, x, y, w, h, o = {}) =>
  emit('node.create', {
    type: o.ellipse ? 'ellipse' : 'rectangle',
    parent,
    name,
    x,
    y,
    width: w,
    height: h,
    props: {
      fills: solid(o.fill ?? T.surface),
      ...(o.radius ? { cornerRadius: o.radius } : {}),
      ...(o.stroke ? { strokes: solid(o.stroke), strokeWeight: o.sw ?? 1, strokeAlign: 'inside' } : {}),
      ...(o.opacity != null ? { opacity: o.opacity } : {}),
    },
  });
// `width` é sempre passado: sem ele o texto estoura a coluna (foi o bug que invadiu o card).
const txt = (parent, name, str, x, y, o = {}) =>
  emit('text.create', {
    text: str,
    x,
    y,
    parent,
    name,
    // `width` sempre presente: sem ele o texto estoura a coluna (foi o bug que invadiu o card).
    // Exceção `auto`: libera o texto para crescer na horizontal (`textAutoResize`), usado nos
    // títulos curtos. A decisão vem de MEDIÇÃO, não de chute: "O futebol é eterno." a 96px mede
    // 641px reais, então uma caixa de 560 quebra a linha em duas e o bloco de baixo sobe por
    // cima. Com `auto` fica em uma linha e o layout continua previsível.
    ...(o.auto ? {} : { width: o.width ?? 400 }),
    props: {
      fontFamily: o.condensed ? COND : BODY,
      fontSize: o.size ?? 14,
      fontStyle: o.weight ?? (o.condensed ? 'Bold' : 'Regular'),
      ...(o.auto ? { textAutoResize: 'widthAndHeight' } : {}),
      ...(o.lineHeight ? { lineHeight: o.lineHeight } : {}),
      ...(o.tracking != null ? { letterSpacing: o.tracking } : {}),
      ...(o.upper ? { textCase: 'upper' } : {}),
      ...(o.align ? { textAlign: o.align } : {}),
      // Numeral tabular: colunas de números não "dançam" entre linhas.
      ...(o.tnum ? { features: { tnum: true } } : {}),
      fills: solid(o.fill ?? T.fg),
    },
  });
const rule = (parent, x, y, w, o = {}) =>
  box(parent, 'rule', x, y, w, 1, { fill: o.color ?? T.border, opacity: o.opacity ?? 0.3 });
// Rótulo-selo: caixa alta, tracking largo, miúdo. É o denominador comum das seções.
const eyebrow = (parent, str, x, y, o = {}) =>
  txt(parent, 'eyebrow', str, x, y, { size: 10.5, upper: true, tracking: 1.6, color: T.fg55, width: o.width ?? 700 });

// ═══ 01 · HOME ═════════════════════════════════════════════════════════════════════════════
const home = frame('01 · home', 0, 0, GRID.w, 900, T.bg);

// Profundidade: gradiente quente AMPLO e de opacidade baixíssima. Não é "spotlight": o detector
// de anti-padrões reprova halo de acento que lê como nuvem sobre o texto.
box(home, 'depthTop', 0, 0, GRID.w, 560, { fill: T.muted });
box(home, 'warmthA', 820, -300, 1200, 700, { fill: T.primary, opacity: 0.05, ellipse: true });
box(home, 'warmthB', -360, 300, 900, 620, { fill: T.secondary, opacity: 0.03, ellipse: true });

// NAVBAR — largura de cada rótulo definida, para nada colidir
box(home, 'nav', 0, 0, GRID.w, 72, { fill: T.surface, stroke: T.border });
txt(home, 'brand', 'ALMANAQUE', GRID.margin, 22, { condensed: true, size: 26, tracking: -0.2, width: 170 });
txt(home, 'brand2', 'dos Clubes', GRID.margin + 172, 31, { size: 13, color: T.fg70, width: 120 });
// A BUSCA vira o elemento mais largo da barra: deixa de ser campo secundário e passa a PORTAL.
box(home, 'search', 470, 19, 700, 36, { fill: T.bg, stroke: T.border, radius: 999 });
box(home, 'searchIcon', 494, 28, 16, 16, { fill: T.bg, stroke: T.fg55, sw: 1.5, ellipse: true });
txt(home, 'searchHint', 'Buscar 12.003 clubes, 1.932 competições, 70 rankings…', 522, 29, {
  size: 12.5,
  color: T.fg55,
  width: 560,
});
box(home, 'ctaNav', 1194, 19, 182, 36, { fill: T.primary, radius: 999 });
txt(home, 'ctaNavT', 'Entrar', 1194, 29, { size: 13, color: T.onPrimary, weight: 'SemiBold', align: 'center', width: 182 });

// HERO
eyebrow(home, 'acervo verificado · 3 idiomas · fonte ao lado de cada número', GRID.margin, 124, { width: 620 });
txt(home, 'h1', 'O futebol é eterno.', GRID.margin, 150, {
  condensed: true,
  size: 96,
  tracking: -1.4,
  auto: true,
});
txt(home, 'h1b', 'A memória dele, também.', GRID.margin, 320, {
  condensed: true,
  size: 58,
  tracking: -0.6,
  auto: true,
  fill: T.fg55,
});
txt(
  home,
  'lede',
  'Clubes, ídolos, campeões e as eras que não acabam — de todos os países e competições.',
  GRID.margin,
  452,
  { size: 17, lineHeight: 26, width: 520, color: T.fg70 },
);
box(home, 'cta1', GRID.margin, 556, 226, 52, { fill: T.primary, radius: 12 });
txt(home, 'cta1t', 'Explorar o acervo', GRID.margin, 572, {
  size: 14.5,
  color: T.onPrimary,
  weight: 'SemiBold',
  align: 'center',
  width: 226,
});
box(home, 'cta2', GRID.margin + 242, 556, 200, 52, { fill: T.surface, stroke: T.border, radius: 12 });
txt(home, 'cta2t', 'Como conferimos', GRID.margin + 242, 572, { size: 14.5, align: 'center', width: 200 });

// CARTÃO DE PROVA — o campeão vigente REAL, com a fonte visível. A coluna começa em 720.
const PX = 720;
const PW = GRID.w - GRID.margin - PX; // 656
box(home, 'proof', PX, 124, PW, 300, { fill: T.surface, stroke: T.border, radius: 20 });
eyebrow(home, 'campeão vigente no acervo', PX + 28, 152, { width: 400 });
txt(home, 'proofName', 'Real Madrid Club de Fútbol', PX + 28, 186, {
  condensed: true,
  size: 34,
  tracking: -0.3,
  auto: true,
});
txt(home, 'proofComp', 'FIFA Club World Cup · Temporada 2023', PX + 28, 234, { size: 13.5, color: T.fg70, width: 600 });
rule(home, PX + 28, 280, PW - 56, { opacity: 0.24 });
txt(home, 'proofSrcL', 'FONTE', PX + 28, 304, { size: 10, tracking: 1.4, upper: true, color: T.fg55, width: 56 });
txt(home, 'proofSrcV', 'knowledge_graph', PX + 96, 302, { size: 13, color: T.fg70, width: 170 });
// Verificado ganha o dourado — a cor tem papel, não é enfeite
txt(home, 'proofLink', 'Wikidata ↗', PX + 284, 302, { size: 13, color: T.secondary, width: 180 });
box(home, 'seal', PX + PW - 96, 292, 60, 60, { fill: T.surface2, stroke: T.border, radius: 999 });
txt(home, 'sealT', '★', PX + PW - 96, 308, { size: 24, fill: T.secondary, align: 'center', width: 60 });
txt(home, 'proofNote', 'Escolhido entre os campeões com fonte verificada.', PX + 28, 356, {
  size: 12,
  color: T.fg55,
  width: 500,
});

// FAIXA DE DADOS — quatro números, cada um com a procedência ao lado
const stats = [
  ['12.003', 'clubes', 'wikidata'],
  ['1.932', 'competições', 'rsssf'],
  ['70', 'rankings', 'publicados'],
  ['418', 'campeões', 'auditados'],
];
const SW = (PW - 3 * 16) / 4; // 152
stats.forEach(([n, label, src], i) => {
  const x = PX + i * (SW + 16);
  box(home, `stat${i}`, x, 456, SW, 124, { fill: T.surface, stroke: T.border, radius: 16 });
  txt(home, `statN${i}`, n, x + 18, 474, { condensed: true, size: 38, tracking: -0.6, tnum: true, width: SW - 36 });
  txt(home, `statL${i}`, label, x + 18, 526, { size: 13, color: T.fg70, width: SW - 36 });
  txt(home, `statS${i}`, src, x + 18, 550, { size: 10, tracking: 1.2, upper: true, color: T.fg55, width: SW - 36 });
});

// CAMADA DE EXPLORAÇÃO — o que a versão atual não tem: forma de ENTRAR no acervo
eyebrow(home, 'comece por onde quiser', GRID.margin, 660, { width: 400 });
const shelves = [
  ['Eras', '1900 → hoje', T.primary],
  ['Países', '6 continentes', T.secondary],
  ['Competições', '1.932', T.border],
  ['Ídolos', 'por clube e era', T.border],
  ['Rankings', 'com fórmula', T.border],
];
const CW = (GRID.content - 4 * 16) / 5; // 249.6
shelves.forEach(([t, s, accent], i) => {
  const x = GRID.margin + i * (CW + 16);
  box(home, `shelf${i}`, x, 700, CW, 104, { fill: T.surface, stroke: T.border, radius: 14 });
  // A barra de acento da esquerda diferencia as categorias sem depender de cor de texto
  box(home, `shelfBar${i}`, x, 700, 3, 104, { fill: accent });
  txt(home, `shelfT${i}`, t, x + 20, 718, { condensed: true, size: 23, width: CW - 92 });
  txt(home, `shelfS${i}`, s, x + 20, 752, { size: 12.5, color: T.fg70, width: CW - 40 });
  // O afordance de "abrir" fica à DIREITA, no eixo do título: convenção de card clicável.
  // A primeira versão o punha abaixo do subtítulo e ele encostava no rótulo da seção.
  txt(home, `shelfC${i}`, '→', x + CW - 44, 722, {
    size: 15,
    color: T.fg55,
    align: 'right',
    width: 24,
  });
});

rule(home, GRID.margin, 836, GRID.content, { opacity: 0.22 });
txt(home, 'footNote', 'Toda contagem vem da API pública e é conferível em /metodologia.', GRID.margin, 854, {
  size: 12.5,
  color: T.fg55,
  width: 700,
});
txt(home, 'footBrand', 'ALMANAQUE dos Clubes', 1150, 854, {
  condensed: true,
  size: 15,
  color: T.fg70,
  align: 'right',
  width: 226,
});

// ═══ 02 · BUSCA (paleta de comando) ═══════════════════════════════════════════════════════
const search = frame('02 · busca', 1520, 0, GRID.w, 900, T.bg);
box(search, 'scrim', 0, 0, GRID.w, 900, { fill: '#000000', opacity: 0.55 });
box(search, 'nav', 0, 0, GRID.w, 72, { fill: T.surface, stroke: T.border });
txt(search, 'brand', 'ALMANAQUE', GRID.margin, 22, { condensed: true, size: 26, width: 170 });
box(search, 'search', 470, 19, 700, 36, { fill: T.bg, stroke: T.primary, radius: 999, sw: 1.5 });
txt(search, 'q', 'real madrid', 522, 29, { size: 13, width: 280 });
box(search, 'caret', 626, 27, 1.5, 20, { fill: T.primary });

// Paleta de comando: 760 de largura, ancorada na barra. A profundidade vem de borda + camada
// elevada — não de sombra difusa, que o detector lê como "glassmorphism decorativo".
const QX = 470;
const QW = 760;
box(search, 'palette', QX, 76, QW, 596, { fill: T.surface, stroke: T.border, radius: 18 });
eyebrow(search, 'clubes', QX + 30, 100, { width: 300 });
const results = [
  ['Real Madrid Club de Fútbol', 'Espanha · 1902 · 36 títulos', '36', true],
  ['Real Madrid Castilla', 'Espanha · 1972 · equipe filial', '0', false],
  ['Real Sociedad de Fútbol', 'Espanha · 1909 · 2 títulos', '2', false],
  ['Real Betis Balompié', 'Espanha · 1907 · 1 título', '1', false],
];
results.forEach(([name, meta, titles, active], i) => {
  const y = 128 + i * 72;
  if (active) box(search, `rowBg${i}`, QX + 16, y - 6, QW - 32, 64, { fill: T.muted, radius: 12 });
  box(search, `dot${i}`, QX + 32, y + 10, 36, 36, { fill: T.surface2, stroke: T.border, ellipse: true });
  txt(search, `rowN${i}`, name, QX + 82, y + 8, {
    size: 15.5,
    weight: active ? 'SemiBold' : 'Regular',
    width: 480,
  });
  txt(search, `rowM${i}`, meta, QX + 82, y + 30, { size: 12.5, color: T.fg55, width: 480 });
  // O número SEMPRE rotulado: sem rótulo, "36" é adivinhação
  txt(search, `rowT${i}`, titles, QX + QW - 156, y + 6, {
    condensed: true,
    size: 26,
    tnum: true,
    align: 'right',
    width: 60,
  });
  txt(search, `rowTL${i}`, 'títulos', QX + QW - 176, y + 36, {
    size: 10,
    upper: true,
    tracking: 1.2,
    color: T.fg55,
    align: 'right',
    width: 80,
  });
});
rule(search, QX + 16, 428, QW - 32, { opacity: 0.2 });
eyebrow(search, 'competições', QX + 30, 452, { width: 300 });
const comps = [
  ['Copa Libertadores', 'CONMEBOL · 1960 → hoje'],
  ['La Liga', 'Espanha · 1929 → hoje'],
];
comps.forEach(([n, m], i) => {
  const y = 484 + i * 62;
  box(search, `compDot${i}`, QX + 32, y + 6, 36, 36, { fill: T.surface2, stroke: T.border, ellipse: true });
  txt(search, `compN${i}`, n, QX + 82, y + 4, { size: 14.5, width: 480 });
  txt(search, `compM${i}`, m, QX + 82, y + 26, { size: 12, color: T.fg55, width: 480 });
});
rule(search, QX + 16, 616, QW - 32, { opacity: 0.2 });
// Atalhos de teclado: o que torna a busca "intuitiva" de verdade é ela ser dirigível sem mouse
txt(search, 'hintK', '↑↓ navegar      ⏎ abrir      ⌥K comparar      esc fechar', QX + 30, 636, {
  size: 11.5,
  color: T.fg55,
  width: 700,
});

// ═══ 03 · DADOS ═══════════════════════════════════════════════════════════════════════════
const table = frame('03 · dados', 3040, 0, GRID.w, 900, T.bg);
box(table, 'nav', 0, 0, GRID.w, 72, { fill: T.surface, stroke: T.border });
txt(table, 'brand', 'ALMANAQUE', GRID.margin, 22, { condensed: true, size: 26, width: 170 });
txt(table, 'title', 'Ranking CBF 2023', GRID.margin, 112, { condensed: true, size: 52, tracking: -1, auto: true });
txt(table, 'sub', '70 rankings publicados · método e fórmula declarados', GRID.margin, 178, {
  size: 14,
  color: T.fg70,
  width: 800,
});
const chips = ['Por divisão', 'Pirâmide nacional', 'Gênero', 'País'];
chips.forEach((c, i) => {
  const x = GRID.margin + i * 158;
  const on = i === 0;
  box(table, `chip${i}`, x, 216, 146, 34, {
    fill: on ? T.primary : T.surface,
    stroke: on ? T.primary : T.border,
    radius: 999,
  });
  txt(table, `chipT${i}`, c, x, 225, {
    size: 12.5,
    color: on ? T.onPrimary : T.fg70,
    align: 'center',
    width: 146,
  });
});

// Colunas: cada célula é uma CAIXA com largura explícita, não um ponto. Isso importa porque
// `textAlign: right` alinha dentro da largura — a primeira versão largava a coluna CLUBE com
// 640px de caixa, que invadia as colunas numéricas, e a de PAÍS com 150px, que estourava o
// frame. As larguras aqui somam exatamente os 1312px de conteúdo.
const TB = { x: GRID.margin, w: GRID.content };
const COL = {
  pos: { x: GRID.margin, w: 56 },
  club: { x: GRID.margin + 64, w: 700 }, // 128 → 828
  pts: { x: GRID.margin + 820, w: 92 }, // 884 → 976
  jogos: { x: GRID.margin + 920, w: 96 }, // 984 → 1080
  tit: { x: GRID.margin + 1024, w: 96 }, // 1088 → 1184
  pais: { x: GRID.margin + 1176, w: 72 }, // 1240 → 1312
};
box(table, 'thead', TB.x, 288, TB.w, 38, { fill: T.surface2, radius: 10 });
[
  ['#', COL.pos, 'left'],
  ['CLUBE', COL.club, 'left'],
  ['PTS', COL.pts, 'right'],
  ['JOGOS', COL.jogos, 'right'],
  ['TÍTULOS', COL.tit, 'right'],
  ['PAÍS', COL.pais, 'left'],
].forEach(([label, c, align], i) =>
  txt(table, `th${i}`, label, c.x, 300, {
    size: 10.5,
    tracking: 1.4,
    upper: true,
    color: T.fg55,
    align,
    width: c.w,
  }),
);
const rows = [
  ['1', 'Inter Milan', '100', '58', '0', 'IT'],
  ['2', 'Sociedade Esportiva Palmeiras', '94', '55', '3', 'BR'],
  ['3', 'Club de Regatas do Flamengo', '91', '54', '3', 'BR'],
  ['4', 'Manchester City FC', '88', '52', '1', 'EN'],
  ['5', 'Club Atlético River Plate', '86', '50', '2', 'AR'],
  ['6', 'Bayern München', '84', '49', '6', 'DE'],
  ['7', 'Paris Saint-Germain FC', '81', '48', '4', 'FR'],
];
rows.forEach(([pos, club, pts, jogos, tit, pais], i) => {
  const y = 334 + i * 60;
  if (i % 2 === 1) box(table, `zebra${i}`, TB.x, y, TB.w, 60, { fill: T.surface, radius: 10 });
  // A posição é o dado mais escaneado: numeral tabular, dourado só no pódio
  txt(table, `pos${i}`, pos, COL.pos.x, y + 16, {
    condensed: true,
    size: 24,
    tnum: true,
    fill: Number(pos) <= 3 ? T.secondary : T.fg55,
    width: COL.pos.w,
  });
  txt(table, `club${i}`, club, COL.club.x, y + 19, {
    size: 15.5,
    weight: Number(pos) <= 3 ? 'SemiBold' : 'Regular',
    width: COL.club.w,
  });
  txt(table, `pts${i}`, pts, COL.pts.x, y + 13, {
    condensed: true,
    size: 28,
    tnum: true,
    align: 'right',
    width: COL.pts.w,
  });
  txt(table, `jogos${i}`, jogos, COL.jogos.x, y + 20, {
    size: 14,
    tnum: true,
    align: 'right',
    color: T.fg70,
    width: COL.jogos.w,
  });
  txt(table, `tit${i}`, tit, COL.tit.x, y + 20, {
    size: 14,
    tnum: true,
    align: 'right',
    color: T.fg70,
    width: COL.tit.w,
  });
  txt(table, `pais${i}`, pais, COL.pais.x, y + 20, { size: 12, tracking: 1, color: T.fg55, width: COL.pais.w });
  if (i < rows.length - 1) rule(table, TB.x, y + 60, TB.w, { opacity: 0.14 });
});
rule(table, TB.x, 768, TB.w, { opacity: 0.28 });
txt(table, 'src', 'Fonte: tabelas finais RSSSF · fórmula cbf-2023-raw · publicado 13/10/2026', TB.x, 786, {
  size: 12,
  color: T.fg55,
  width: 800,
});
txt(table, 'page', '1 de 3', 1280, 786, { size: 12, tnum: true, color: T.fg70, align: 'right', width: 96 });

// ═══ 04 · SISTEMA ═════════════════════════════════════════════════════════════════════════
const sys = frame('04 · sistema', 4560, 0, GRID.w, 900, T.bg);
txt(sys, 'title', 'Sistema', GRID.margin, 60, { condensed: true, size: 52, tracking: -1, auto: true });
txt(sys, 'sub', 'Os tokens não mudam de identidade — mudam de AMBIÇÃO.', GRID.margin, 126, {
  size: 14,
  color: T.fg70,
  width: 800,
});

eyebrow(sys, 'cor · papel declarado, nunca decorativo', GRID.margin, 178, { width: 600 });
const swatches = [
  ['#12100f', 'fundo', T.bg],
  ['#1a1715', 'superfície', T.surface],
  ['#f7f3ea', 'texto', T.fg],
  ['#e8412f', 'sinal vivo', T.primary],
  ['#c9a227', 'verificado', T.secondary],
  ['#6b625a', 'hairline', T.border],
];
const SWW = (GRID.content - 5 * 14) / 6;
// A tinta de cada amostra é escolhida por CONTRASTE medido, não por estética. Números reais
// (calculados, não estimados): #1a0e0b sobre a marca = 4,70:1; sobre o dourado = 7,81:1;
// #f7f3ea sobre o hairline = 5,39:1 — todos acima do piso 4,5. O primeiro rascunho usava preto
// puro em tudo, que PASSA no vermelho (5,23) e no dourado (8,68) mas REPROVA no hairline
// (3,52). Usar o token onPrimary resolve os três e mantém a tinta dentro do sistema.
const inkFor = (fill) => {
  if (fill === T.fg) return { strong: T.bg, soft: T.bg };      // claro: tinta escura
  if (fill === T.primary || fill === T.secondary) return { strong: T.onPrimary, soft: T.onPrimary };
  if (fill === T.border) return { strong: T.fg, soft: T.fg };
  return { strong: T.fg, soft: T.fg70 };                        // fundo/superfície: tinta clara
};
swatches.forEach(([hex, role, fill], i) => {
  const x = GRID.margin + i * (SWW + 14);
  const ink = inkFor(fill);
  box(sys, `sw${i}`, x, 202, SWW, 104, { fill, stroke: T.border, radius: 14 });
  txt(sys, `swH${i}`, hex, x + 14, 258, { size: 11.5, tnum: true, fill: ink.strong, width: SWW - 28 });
  txt(sys, `swR${i}`, role, x + 14, 278, { size: 11.5, fill: ink.soft, width: SWW - 28 });
});

eyebrow(sys, 'tipografia · escala e função', GRID.margin, 338, { width: 600 });
txt(sys, 'tDisplay', 'Aa', GRID.margin, 358, { condensed: true, size: 92, tracking: -2, width: 160 });
txt(sys, 'tDisplayM', 'Barlow Condensed Bold', 244, 372, { size: 15, weight: 'SemiBold', width: 400 });
txt(sys, 'tDisplayS', 'display 96 / entrelinha 92 / tracking −1,4', 244, 396, { size: 12.5, color: T.fg70, width: 400 });
txt(sys, 'tDisplayU', 'usada em: título, número-herói, posição de ranking', 244, 418, {
  size: 12,
  color: T.fg55,
  width: 460,
});
txt(sys, 'tBody', 'Aa', GRID.margin, 478, { size: 54, width: 160 });
txt(sys, 'tBodyM', 'Barlow Regular / SemiBold', 244, 486, { size: 15, weight: 'SemiBold', width: 400 });
txt(sys, 'tBodyS', 'corpo 17 / 26 · apoio 13 / 20 · rótulo 10,5 caixa alta', 244, 508, {
  size: 12.5,
  color: T.fg70,
  width: 460,
});
txt(sys, 'tBodyU', 'usada em: texto corrido, metadados, rótulos de coluna', 244, 530, {
  size: 12,
  color: T.fg55,
  width: 460,
});

eyebrow(sys, 'número · o dado como tipografia', GRID.margin, 592, { width: 600 });
txt(sys, 'numA', '12.003', GRID.margin, 612, { condensed: true, size: 56, tracking: -1, tnum: true, width: 260 });
txt(sys, 'numB', '11.998', GRID.margin + 280, 612, { condensed: true, size: 56, tracking: -1, tnum: true, width: 260, fill: T.fg70 });
txt(sys, 'numNote', 'Numeral tabular (`tnum`): as colunas alinham mesmo com dígitos de larguras diferentes.', GRID.margin, 682, {
  size: 12.5,
  color: T.fg55,
  width: 900,
});

eyebrow(sys, 'movimento · três motores, um dono cada', GRID.margin, 730, { width: 600 });
const motion = [
  ['GSAP', 'revela na dobra', 'power4.out · 0,6s'],
  ['motion/react', 'spring de gesto e saída', 'stiffness 320 · damping 30'],
  ['CSS', 'estado, hover e foco', '0,2s ease-out'],
];
const MW = (GRID.content - 2 * 16) / 3;
motion.forEach(([eng, role, spec], i) => {
  const x = GRID.margin + i * (MW + 16);
  box(sys, `m${i}`, x, 754, MW, 92, { fill: T.surface, stroke: T.border, radius: 14 });
  txt(sys, `mE${i}`, eng, x + 20, 770, { condensed: true, size: 22, width: MW - 40 });
  txt(sys, `mR${i}`, role, x + 20, 800, { size: 12.5, color: T.fg70, width: MW - 40 });
  txt(sys, `mS${i}`, spec, x + 20, 820, { size: 11.5, color: T.fg55, width: MW - 40 });
});

const out = resolve(process.argv[2] ?? '.tmp/fig/concept.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(script, null, 1));
console.log(`passos: ${script.length} · ids até ${nextId - 1} · escrito em ${out}`);
