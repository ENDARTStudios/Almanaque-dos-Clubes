/**
 * Gera a prancha do conceito em VERSÃO CLARA para o FigCraft.
 *
 * Por que existe um gerador separado em vez de um parâmetro no `concept-board.mjs`: a versão
 * clara não é o mesmo desenho com outras cores. Três coisas mudam de ESTRUTURA, não de valor:
 *
 *   1. **A elevação se inverte.** No escuro o cartão se separa do fundo por BORDA (a diferença
 *      de fundo é 1,06:1 e não se vê). No claro ele se separa por FUNDO mais branco + sombra
 *      suave. Usar borda aqui deixaria a tela com cara de planilha.
 *   2. **O glow sai.** Nada de gradiente quente atrás da dobra: em fundo claro isso vira mancha
 *      suja (foi o defeito que o próprio repo registrou em `theme-dark-glow` quando a seção
 *      seguinte também era escura). No lugar entra uma faixa tonal discreta.
 *   3. **A tinta é escolhida por medição.** `#e8412f` sobre branco dá 4,02:1 e REPROVA como
 *      texto; sobre papel quente, 3,79. Então a marca fica no PREENCHIMENTO (botão, chip, barra)
 *      e o texto usa `#b91c1c` (6,47 no branco / 6,10 no papel). É o par `primary` /
 *      `primary-ink` que o repo já tinha separado por esse motivo exato.
 *
 * Uso: node plugins/almanaque-design/tools/concept-board-light.mjs <saida.json>
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// ── Paleta VINHO — ESCOLHA DO OPERADOR, entre seis esquemas comparados lado a lado ──────────
// O caminho até aqui foi por eliminação, e vale registrar: `#e8412f` saturado foi rejeitado
// ("se destacam demais"); terracota dessaturado foi rejeitado com mais força ("conseguiu deixar
// ainda pior"). O erro de método era ADIVINHAR o gosto a partir de uma frase. O
// `palette-compare.mjs` pôs seis esquemas na mesma tela e a escolha passou a ser por
// comparação — venceu o vinho: quente, editorial, próximo do vermelho original sem o neon.
//
// As três cores têm papéis distintos, e trocar de papel é o que quebra uma paleta:
//   `primary`     preenchimento vivo — botão, chip, barra. Carrega texto BRANCO.
//   `primaryInk`  a mesma família, escura o bastante para SER TEXTO.
//   `secondary`   "verificado" e pódio. Complementar (ouro), nunca a família do ink.
//
// Medido no PIOR CASO (a faixa `#f2efea`, mais escura que o papel — é onde o contraste cai):
//   primaryInk 6,99 · secondary 4,65 · branco dentro do primary 6,29. Os três acima de 4,5.
//   O acento quase foi `#a16207`, que dá 4,29 na faixa e REPROVARIA — e o pódio fica justamente
//   sobre a faixa. Escurecido para `#94600a`.
const L = {
  bg: '#faf8f5', // papel quente — 17,81:1 com a tinta forte
  surface: '#ffffff', // cartão: elevação por BRANCO, não por borda
  surface2: '#f2efea', // cabeçalho de tabela, selo
  band: '#f5f1ec', // faixa tonal (substitui o glow escuro)
  ink: '#111111', // texto forte — 17,81:1
  ink2: '#57534e', // secundária — 7,20:1
  ink3: '#6b6560', // terciária — 5,42:1 (piso 4,5, com margem)
  primary: '#be123c', // PREENCHIMENTO — vinho vivo, o que "se destaca"
  primaryInk: '#9f1239', // TEXTO e link — 6,99:1 no pior caso
  onPrimary: '#ffffff', // dentro do vinho = 6,29:1
  gold: '#94600a', // "verificado" — 4,65:1 no pior caso (era #a16207, 4,29, reprovava)
  border: '#e0dad3', // hairline
  borderStrong: '#c9c1b8',
};
const solid = (color) => [{ type: 'solid', color }];

const GRID = { w: 1440, margin: 64, get content() { return this.w - this.margin * 2; } };
const COND = 'Barlow Condensed';
const BODY = 'Barlow';

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
      fills: solid(o.fill ?? L.surface),
      ...(o.radius ? { cornerRadius: o.radius } : {}),
      ...(o.stroke ? { strokes: solid(o.stroke), strokeWeight: o.sw ?? 1, strokeAlign: 'inside' } : {}),
      ...(o.opacity != null ? { opacity: o.opacity } : {}),
      // No CLARO a elevação é sombra, não borda. `effect.add` aceita dropShadow.
      ...(o.shadow
        ? { effects: [{ type: 'dropShadow', color: '#1a1a1a14', offsetX: 0, offsetY: 2, radius: 8, spread: 0 }] }
        : {}),
    },
  });
const txt = (parent, name, str, x, y, o = {}) =>
  emit('text.create', {
    text: str,
    x,
    y,
    parent,
    name,
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
      ...(o.tnum ? { features: { tnum: true } } : {}),
      fills: solid(o.fill ?? L.ink),
    },
  });
const rule = (parent, x, y, w, color = L.border, opacity = 1) =>
  box(parent, 'rule', x, y, w, 1, { fill: color, opacity });
const eyebrow = (parent, str, x, y, o = {}) =>
  txt(parent, 'eyebrow', str, x, y, {
    size: 11,
    upper: true,
    tracking: 1.6,
    color: L.ink3,
    width: o.width ?? 700,
  });

// ═══ 01 · HOME ═════════════════════════════════════════════════════════════════════════════
const home = frame('01 · home', 0, 0, GRID.w, 900, L.bg);
// Faixa tonal no lugar do glow: em fundo claro, gradiente quente vira mancha.
box(home, 'band', 0, 0, GRID.w, 72, { fill: L.surface });
rule(home, 0, 72, GRID.w);

// NAVBAR — busca como elemento mais largo (o portal do acervo)
txt(home, 'brand', 'ALMANAQUE', GRID.margin, 22, { condensed: true, size: 26, tracking: -0.2, fill: L.primaryInk, width: 170 });
txt(home, 'brand2', 'dos Clubes', GRID.margin + 172, 31, { size: 13, color: L.ink2, width: 120 });
box(home, 'search', 470, 19, 700, 36, { fill: L.bg, stroke: L.borderStrong, radius: 999 });
box(home, 'searchIcon', 494, 28, 16, 16, { fill: L.bg, stroke: L.ink3, sw: 1.5, ellipse: true });
txt(home, 'searchHint', 'Buscar 12.003 clubes, 1.932 competições, 70 rankings…', 522, 29, { size: 12.5, color: L.ink3, width: 560 });
// O CTA usa o vermelho da marca como PREENCHIMENTO e texto branco: 4,02:1 é limítrofe para
// texto normal, e por isso este botão é medido no gate. Se reprovar, a saída é o `onPrimary`.
box(home, 'ctaNav', 1194, 19, 182, 36, { fill: L.primary, radius: 999 });
txt(home, 'ctaNavT', 'Entrar', 1194, 29, { size: 13, color: L.onPrimary, weight: 'SemiBold', align: 'center', width: 182 });

// HERO — hierarquia com ar, sem enfeite
eyebrow(home, 'acervo verificado · 3 idiomas · fonte ao lado de cada número', GRID.margin, 124, { width: 620 });
txt(home, 'h1', 'O futebol é eterno.', GRID.margin, 150, { condensed: true, size: 96, tracking: -1.4, auto: true });
txt(home, 'h1b', 'A memória dele, também.', GRID.margin, 320, { condensed: true, size: 58, tracking: -0.6, auto: true, fill: L.ink2 });
txt(home, 'lede', 'Clubes, ídolos, campeões e as eras que não acabam — de todos os países e competições.', GRID.margin, 452, { size: 17, lineHeight: 26, width: 520, color: L.ink2 });
box(home, 'cta1', GRID.margin, 556, 226, 52, { fill: L.primary, radius: 12 });
txt(home, 'cta1t', 'Explorar o acervo', GRID.margin, 572, { size: 14.5, color: L.onPrimary, weight: 'SemiBold', align: 'center', width: 226 });
box(home, 'cta2', GRID.margin + 242, 556, 200, 52, { fill: L.surface, stroke: L.borderStrong, radius: 12 });
txt(home, 'cta2t', 'Como conferimos', GRID.margin + 242, 572, { size: 14.5, align: 'center', width: 200 });

// CARTÃO DE PROVA — branco sobre papel, com sombra leve (elevação, não borda)
const PX = 720;
const PW = GRID.w - GRID.margin - PX;
box(home, 'proof', PX, 124, PW, 300, { fill: L.surface, radius: 20, shadow: true });
eyebrow(home, 'campeão vigente no acervo', PX + 28, 152, { width: 400 });
txt(home, 'proofName', 'Real Madrid Club de Fútbol', PX + 28, 186, { condensed: true, size: 34, tracking: -0.3, auto: true });
txt(home, 'proofComp', 'FIFA Club World Cup · Temporada 2023', PX + 28, 234, { size: 13.5, color: L.ink2, width: 600 });
rule(home, PX + 28, 280, PW - 56, L.border);
txt(home, 'proofSrcL', 'FONTE', PX + 28, 304, { size: 11, tracking: 1.4, upper: true, color: L.ink3, width: 56 });
txt(home, 'proofSrcV', 'knowledge_graph', PX + 96, 302, { size: 13, color: L.ink2, width: 170 });
txt(home, 'proofLink', 'Wikidata ↗', PX + 284, 302, { size: 13, color: L.gold, width: 180 });
box(home, 'seal', PX + PW - 96, 292, 60, 60, { fill: L.surface2, stroke: L.border, radius: 999 });
txt(home, 'sealT', '★', PX + PW - 96, 308, { size: 24, fill: L.gold, align: 'center', width: 60 });
txt(home, 'proofNote', 'Escolhido entre os campeões com fonte verificada.', PX + 28, 356, { size: 12, color: L.ink3, width: 500 });

// FAIXA DE NÚMEROS — quatro cartões brancos
const stats = [
  ['12.003', 'clubes', 'wikidata'],
  ['1.932', 'competições', 'rsssf'],
  ['70', 'rankings', 'publicados'],
  ['418', 'campeões', 'auditados'],
];
const SW = (PW - 3 * 16) / 4;
stats.forEach(([n, label, src], i) => {
  const x = PX + i * (SW + 16);
  box(home, `stat${i}`, x, 456, SW, 124, { fill: L.surface, radius: 16, shadow: true });
  txt(home, `statN${i}`, n, x + 18, 474, { condensed: true, size: 38, tracking: -0.6, tnum: true, fill: L.primaryInk, width: SW - 36 });
  txt(home, `statL${i}`, label, x + 18, 526, { size: 13, color: L.ink2, width: SW - 36 });
  txt(home, `statS${i}`, src, x + 18, 550, { size: 11, tracking: 1.2, upper: true, color: L.ink3, width: SW - 36 });
});

// PRATELEIRAS — a camada de exploração
eyebrow(home, 'comece por onde quiser', GRID.margin, 660, { width: 400 });
const shelves = [
  ['Clubes & seleções', '12.003', L.primary],
  ['Competições', '1.932', L.gold],
  ['Rankings', '70', L.borderStrong],
  ['Mapa-múndi', 'o mundo inteiro', L.borderStrong],
  ['Comparar', 'lado a lado', L.borderStrong],
];
const CW = (GRID.content - 4 * 16) / 5;
shelves.forEach(([t, s, accent], i) => {
  const x = GRID.margin + i * (CW + 16);
  box(home, `shelf${i}`, x, 688, CW, 104, { fill: L.surface, radius: 14, shadow: true });
  box(home, `shelfBar${i}`, x, 688, 3, 104, { fill: accent });
  txt(home, `shelfT${i}`, t, x + 20, 706, { condensed: true, size: 20, width: CW - 92 });
  txt(home, `shelfS${i}`, s, x + 20, 744, { size: 13, color: L.ink2, width: CW - 40 });
  txt(home, `shelfC${i}`, '→', x + CW - 44, 710, { size: 15, color: L.ink3, align: 'right', width: 24 });
});
rule(home, GRID.margin, 836, GRID.content, L.border);
txt(home, 'footNote', 'Toda contagem vem da API pública e é conferível em /metodologia.', GRID.margin, 854, { size: 12.5, color: L.ink3, width: 700 });
txt(home, 'footBrand', 'ALMANAQUE dos Clubes', 1150, 854, { condensed: true, size: 15, color: L.ink2, align: 'right', width: 226 });

// ═══ 02 · TABELA ═══════════════════════════════════════════════════════════════════════════
const table = frame('02 · tabela', 1520, 0, GRID.w, 900, L.bg);
box(table, 'band', 0, 0, GRID.w, 72, { fill: L.surface });
rule(table, 0, 72, GRID.w);
txt(table, 'brand', 'ALMANAQUE', GRID.margin, 22, { condensed: true, size: 26, fill: L.primaryInk, width: 170 });
txt(table, 'title', 'Ranking CBF 2023', GRID.margin, 112, { condensed: true, size: 52, tracking: -1, auto: true });
txt(table, 'sub', '70 rankings publicados · método e fórmula declarados', GRID.margin, 178, { size: 14, color: L.ink2, width: 800 });
const chips = ['Por divisão', 'Pirâmide nacional', 'Gênero', 'País'];
chips.forEach((c, i) => {
  const x = GRID.margin + i * 158;
  const on = i === 0;
  box(table, `chip${i}`, x, 216, 146, 34, {
    fill: on ? L.primary : L.surface,
    stroke: on ? L.primary : L.borderStrong,
    radius: 999,
  });
  // Chip ativo: texto BRANCO sobre o terracota. Com a paleta dessaturada a tinta interna
  // inverteu — o `#1a0e0b` que funcionava no vermelho vivo dá 3,98:1 aqui e reprovaria. */
  txt(table, `chipT${i}`, c, x, 225, { size: 12.5, color: on ? L.onPrimary : L.ink2, align: 'center', width: 146 });
});

const TB = { x: GRID.margin, w: GRID.content };
const COL = {
  pos: { x: GRID.margin, w: 56 },
  club: { x: GRID.margin + 64, w: 700 },
  pts: { x: GRID.margin + 820, w: 92 },
  jogos: { x: GRID.margin + 920, w: 96 },
  tit: { x: GRID.margin + 1024, w: 96 },
  pais: { x: GRID.margin + 1176, w: 72 },
};
box(table, 'thead', TB.x, 288, TB.w, 38, { fill: L.surface2, radius: 10 });
[
  ['#', COL.pos, 'left'],
  ['CLUBE', COL.club, 'left'],
  ['PTS', COL.pts, 'right'],
  ['JOGOS', COL.jogos, 'right'],
  ['TÍTULOS', COL.tit, 'right'],
  ['PAÍS', COL.pais, 'left'],
].forEach(([label, c, align], i) =>
  txt(table, `th${i}`, label, c.x, 300, { size: 11, tracking: 1.4, upper: true, color: L.ink3, align, width: c.w }),
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
  // Zebra no claro: branco sobre papel, com a faixa alternada em `surface2`.
  box(table, `row${i}`, TB.x, y, TB.w, 60, { fill: i % 2 === 1 ? L.surface2 : L.surface, radius: 10 });
  txt(table, `pos${i}`, pos, COL.pos.x, y + 16, {
    condensed: true, size: 24, tnum: true,
    fill: Number(pos) <= 3 ? L.gold : L.ink3, width: COL.pos.w,
  });
  txt(table, `club${i}`, club, COL.club.x, y + 19, {
    size: 15.5,
    weight: Number(pos) <= 3 ? 'SemiBold' : 'Regular',
    fill: L.primaryInk, width: COL.club.w,
  });
  txt(table, `pts${i}`, pts, COL.pts.x, y + 13, { condensed: true, size: 28, tnum: true, align: 'right', width: COL.pts.w });
  txt(table, `jogos${i}`, jogos, COL.jogos.x, y + 20, { size: 14, tnum: true, align: 'right', color: L.ink2, width: COL.jogos.w });
  txt(table, `tit${i}`, tit, COL.tit.x, y + 20, { size: 14, tnum: true, align: 'right', color: L.ink2, width: COL.tit.w });
  txt(table, `pais${i}`, pais, COL.pais.x, y + 20, { size: 12, tracking: 1, color: L.ink3, width: COL.pais.w });
});
rule(table, TB.x, 768, TB.w, L.border);
txt(table, 'src', 'Fonte: tabelas finais RSSSF · fórmula cbf-2023-raw · publicado 13/10/2026', TB.x, 786, { size: 12, color: L.ink3, width: 800 });
txt(table, 'page', '1 de 3', 1280, 786, { size: 12, tnum: true, color: L.ink2, align: 'right', width: 96 });

// ═══ 03 · BUSCA ════════════════════════════════════════════════════════════════════════════
const search = frame('03 · busca', 3040, 0, GRID.w, 900, L.bg);
box(search, 'band', 0, 0, GRID.w, 72, { fill: L.surface });
rule(search, 0, 72, GRID.w);
txt(search, 'brand', 'ALMANAQUE', GRID.margin, 22, { condensed: true, size: 26, fill: L.primaryInk, width: 170 });
box(search, 'search', 470, 19, 700, 36, { fill: L.bg, stroke: L.primary, sw: 1.5, radius: 999 });
txt(search, 'q', 'real madrid', 522, 29, { size: 13, width: 280 });
box(search, 'caret', 626, 27, 1.5, 20, { fill: L.primary });

const QX = 470;
const QW = 760;
box(search, 'palette', QX, 76, QW, 596, { fill: L.surface, radius: 18, shadow: true });
eyebrow(search, 'clubes', QX + 30, 100, { width: 300 });
const results = [
  ['Real Madrid Club de Fútbol', 'Espanha · 1902 · 36 títulos', '36', true],
  ['Real Madrid Castilla', 'Espanha · 1972 · equipe filial', '0', false],
  ['Real Sociedad de Fútbol', 'Espanha · 1909 · 2 títulos', '2', false],
  ['Real Betis Balompié', 'Espanha · 1907 · 1 título', '1', false],
];
results.forEach(([name, meta, titles, active], i) => {
  const y = 128 + i * 72;
  if (active) box(search, `rowBg${i}`, QX + 16, y - 6, QW - 32, 64, { fill: L.surface2, radius: 12 });
  box(search, `dot${i}`, QX + 32, y + 10, 36, 36, { fill: L.bg, stroke: L.borderStrong, ellipse: true });
  txt(search, `rowN${i}`, name, QX + 82, y + 8, { size: 15.5, weight: active ? 'SemiBold' : 'Regular', width: 480 });
  txt(search, `rowM${i}`, meta, QX + 82, y + 30, { size: 12.5, color: L.ink3, width: 480 });
  txt(search, `rowT${i}`, titles, QX + QW - 156, y + 6, { condensed: true, size: 26, tnum: true, align: 'right', fill: L.primaryInk, width: 60 });
  txt(search, `rowTL${i}`, 'títulos', QX + QW - 176, y + 36, { size: 11, upper: true, tracking: 1.2, color: L.ink3, align: 'right', width: 80 });
});
rule(search, QX + 16, 428, QW - 32, L.border);
eyebrow(search, 'competições', QX + 30, 452, { width: 300 });
[
  ['Copa Libertadores', 'CONMEBOL · 1960 → hoje'],
  ['La Liga', 'Espanha · 1929 → hoje'],
].forEach(([n, m], i) => {
  const y = 484 + i * 62;
  box(search, `compDot${i}`, QX + 32, y + 6, 36, 36, { fill: L.bg, stroke: L.borderStrong, ellipse: true });
  txt(search, `compN${i}`, n, QX + 82, y + 4, { size: 14.5, width: 480 });
  txt(search, `compM${i}`, m, QX + 82, y + 26, { size: 12, color: L.ink3, width: 480 });
});
rule(search, QX + 16, 616, QW - 32, L.border);
txt(search, 'hintK', '↑↓ navegar      ⏎ abrir      ⌥K comparar      esc fechar', QX + 30, 636, { size: 11.5, color: L.ink3, width: 700 });

// ═══ 04 · SISTEMA ══════════════════════════════════════════════════════════════════════════
const sys = frame('04 · sistema', 4560, 0, GRID.w, 900, L.bg);
txt(sys, 'title', 'Sistema — versão clara', GRID.margin, 60, { condensed: true, size: 52, tracking: -1, auto: true });
txt(sys, 'sub', 'A elevação vem do branco e da sombra. A marca vive no preenchimento; o texto usa o par escuro.', GRID.margin, 126, { size: 14, color: L.ink2, width: 900 });

eyebrow(sys, 'cor · papel declarado, com o contraste medido', GRID.margin, 178, { width: 700 });
/* A tinta de cada amostra é escolhida por CONTRASTE sobre o PRÓPRIO preenchimento — e a
   inversão de tinta aparece aqui de novo: no terracota e no bronze a tinta legível é a CLARA,
   não a escura. É por isso que `onPrimary` é branco nesta paleta. */
const swatches = [
  ['#faf8f5', 'fundo', L.bg, L.ink],
  ['#ffffff', 'superfície', L.surface, L.ink],
  ['#f2efea', 'elevado 2', L.surface2, L.ink],
  ['#be123c', 'preenchimento', L.primary, L.onPrimary],
  ['#9f1239', 'texto/ link', L.primaryInk, L.onPrimary],
  ['#94600a', 'verificado', L.gold, L.onPrimary],
];
const SWW = (GRID.content - 5 * 14) / 6;
swatches.forEach(([hex, role, fill, ink], i) => {
  const x = GRID.margin + i * (SWW + 14);
  box(sys, `sw${i}`, x, 202, SWW, 104, { fill, stroke: L.border, radius: 14 });
  txt(sys, `swH${i}`, hex, x + 14, 258, { size: 11.5, tnum: true, fill: ink, width: SWW - 28 });
  txt(sys, `swR${i}`, role, x + 14, 278, { size: 11.5, fill: ink, width: SWW - 28 });
});

eyebrow(sys, 'a escolha, e o que ela respeita', GRID.margin, 338, { width: 700 });
txt(sys, 'noteA', 'Vinho: quente e editorial. Preenchimento #be123c · texto #9f1239 · verificado #94600a', GRID.margin, 362, { size: 15, color: L.ink, width: 900 });
txt(sys, 'noteB', 'Cada uma tem um PAPEL: o vinho vivo preenche, o vinho escuro escreve, o ouro marca o verificado. Trocar de papel é o que quebra uma paleta.', GRID.margin, 388, { size: 15, color: L.ink, width: 980 });
txt(sys, 'noteC', 'Conferido no pior caso, que é a faixa #f2efea da tabela — mais escura que o papel, e é onde o pódio fica: texto 6,99:1 · verificado 4,65:1 · branco no botão 6,29:1.', GRID.margin, 420, { size: 13, color: L.ink2, width: 980 });

eyebrow(sys, 'tipografia · a mesma da versão escura', GRID.margin, 484, { width: 600 });
txt(sys, 'tD', 'Aa', GRID.margin, 504, { condensed: true, size: 88, tracking: -2, width: 160 });
txt(sys, 'tDM', 'Barlow Condensed Bold — título e número', 244, 522, { size: 15, weight: 'SemiBold', width: 420 });
txt(sys, 'tDS', 'display 96 · numeral tabular em toda coluna de dado', 244, 546, { size: 12.5, color: L.ink2, width: 460 });
txt(sys, 'tB', 'Aa', GRID.margin, 618, { size: 52, width: 160 });
txt(sys, 'tBM', 'Barlow Regular / SemiBold — corpo e apoio', 244, 626, { size: 15, weight: 'SemiBold', width: 420 });
txt(sys, 'tBS', 'corpo 17/26 · apoio 13/20 · rótulo 11 caixa alta', 244, 650, { size: 12.5, color: L.ink2, width: 460 });

eyebrow(sys, 'movimento · inalterado', GRID.margin, 714, { width: 600 });
[
  ['GSAP', 'revela na dobra', 'power4.out · 0,6s'],
  ['motion/react', 'spring de gesto', 'stiffness 320'],
  ['CSS', 'estado e hover', '0,2s ease-out'],
].forEach(([eng, role, spec], i) => {
  const MW = (GRID.content - 2 * 16) / 3;
  const x = GRID.margin + i * (MW + 16);
  box(sys, `m${i}`, x, 738, MW, 92, { fill: L.surface, radius: 14, shadow: true });
  txt(sys, `mE${i}`, eng, x + 20, 754, { condensed: true, size: 22, width: MW - 40 });
  txt(sys, `mR${i}`, role, x + 20, 784, { size: 12.5, color: L.ink2, width: MW - 40 });
  txt(sys, `mS${i}`, spec, x + 20, 804, { size: 11.5, color: L.ink3, width: MW - 40 });
});

const out = resolve(process.argv[2] ?? '.tmp/fig/light.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(script, null, 1));
console.log(`passos: ${script.length} · ids até ${nextId - 1} · escrito em ${out}`);
