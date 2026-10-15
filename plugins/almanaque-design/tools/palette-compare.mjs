/**
 * COMPARADOR DE PALETAS — seis esquemas na MESMA tela, para escolha visual.
 *
 * Por que existe: eu errei duas vezes seguidas escolhendo cor por conta própria. Primeiro com
 * vermelho saturado (a crítica: "se destacam demais"), depois dessaturando para terracota e
 * bronze (a crítica: "conseguiu deixar ainda pior"). O erro de método foi tentar ADIVINHAR o
 * gosto do Operador a partir de uma frase. Aqui a decisão volta para quem tem o gosto: os seis
 * esquemas aparecem lado a lado, com os MESMOS componentes, e a escolha é por comparação.
 *
 * Cada esquema declara TRÊS cores com papéis distintos, e é isso que faz a paleta funcionar:
 *   `fill`   — preenchimento vivo (botão, chip, barra). Carrega texto BRANCO.
 *   `ink`    — a mesma família, escura o bastante para SER TEXTO. É o que se lê.
 *   `accent` — a cor de "verificado"/pódio. Complementar, nunca a mesma família do ink.
 *
 * A regra medida que todos respeitam: `ink` e `accent` acima de 4,5:1 sobre papel E sobre a
 * faixa `#f2efea` (o pior caso, porque a faixa é mais escura que o papel).
 *
 * Uso: node plugins/almanaque-design/tools/palette-compare.mjs <saida.json>
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const PAPEL = '#faf8f5';
const SURFACE = '#ffffff';
const SURFACE2 = '#f2efea';
const INK = '#111111';
const INK2 = '#57534e';
const INK3 = '#6b6560';
const BORDER = '#e0dad3';
const BORDER_STRONG = '#c9c1b8';

// ── Os seis esquemas. Medidos: todos os `ink` e `accent` passam em 4,5:1 no papel e na faixa.
const SCHEMES = [
  {
    id: 'A',
    name: 'A · Teal',
    note: 'Frio e sofisticado. Descansa a vista, não parece "site de futebol".',
    fill: '#0d9488',
    fillInk: '#1a0e0b',
    ink: '#0f766e',
    accent: '#a34a08',
  },
  {
    id: 'B',
    name: 'B · Vinho',
    note: 'Quente e editorial. O mais próximo do vermelho original, sem o neon.',
    fill: '#be123c',
    fillInk: '#ffffff',
    ink: '#9f1239',
    accent: '#94600a',
  },
  {
    id: 'C',
    name: 'C · Índigo',
    note: 'Confiável e limpo. Ar de dado sério, tipo Atlas ou anuário.',
    fill: '#2563eb',
    fillInk: '#ffffff',
    ink: '#1e40af',
    accent: '#a34a08',
  },
  {
    id: 'D',
    name: 'D · Esmeralda',
    note: 'Verde profundo com dourado. O par mais clássico de "almanaque".',
    fill: '#047857',
    fillInk: '#ffffff',
    ink: '#065f46',
    accent: '#a34a08',
  },
  {
    id: 'E',
    name: 'E · Amora',
    note: 'Roxo contido. Diferente de tudo no setor, e ainda sério.',
    fill: '#7c3aed',
    fillInk: '#ffffff',
    ink: '#5b21b6',
    accent: '#a34a08',
  },
  {
    id: 'F',
    name: 'F · Ardósia e âmbar',
    note: 'Quase neutro com um calor forte só no acento. O mais discreto dos seis.',
    fill: '#334155',
    fillInk: '#ffffff',
    ink: '#334155',
    accent: '#a34a08',
  },
];

const solid = (color) => [{ type: 'solid', color }];
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
      fills: solid(o.fill ?? SURFACE),
      ...(o.radius ? { cornerRadius: o.radius } : {}),
      ...(o.stroke ? { strokes: solid(o.stroke), strokeWeight: o.sw ?? 1, strokeAlign: 'inside' } : {}),
    },
  });
const txt = (parent, name, str, x, y, o = {}) =>
  emit('text.create', {
    text: str,
    x,
    y,
    parent,
    name,
    width: o.width ?? 400,
    props: {
      fontFamily: o.condensed ? 'Barlow Condensed' : 'Barlow',
      fontSize: o.size ?? 14,
      fontStyle: o.weight ?? (o.condensed ? 'Bold' : 'Regular'),
      ...(o.tracking != null ? { letterSpacing: o.tracking } : {}),
      ...(o.upper ? { textCase: 'upper' } : {}),
      ...(o.align ? { textAlign: o.align } : {}),
      ...(o.tnum ? { features: { tnum: true } } : {}),
      fills: solid(o.fill ?? INK),
    },
  });

const CARD_W = 1380;
const CARD_H = 300;
const GAP = 24;
let y = 0;

// Cabeçalho
const head = frame('00 · comparador', 0, 0, CARD_W + 80, 108, PAPEL);
txt(head, 'title', 'Seis esquemas de cor — mesma tela, você escolhe', 40, 24, {
  condensed: true, size: 40, tracking: -0.8, width: 900,
});
txt(head, 'sub', 'Cada faixa é a mesma tabela. O que muda é só a cor: preenchimento (botão/chip), texto (link e número) e verificado (pódio).', 40, 72, {
  size: 13.5, color: INK2, width: 1100,
});
y = 108;

SCHEMES.forEach((s) => {
  const f = frame(`${s.id} · ${s.name}`, 0, y, CARD_W + 80, CARD_H, PAPEL);
  const P = 40;
  const CW = CARD_W;

  // Nome + nota + as três cores como amostras
  txt(f, 'n', s.name, P, 22, { condensed: true, size: 30, tracking: -0.5, width: 260 });
  txt(f, 'note', s.note, P + 240, 32, { size: 13, color: INK2, width: 620 });
  // Amostras com o NOME do papel dentro — é o que permite avaliar sem decorar hex
  [
    ['preenchimento', s.fill, s.fillInk],
    ['texto', s.ink, '#ffffff'],
    ['verificado', s.accent, '#ffffff'],
  ].forEach(([label, fill, ink], i) => {
    const x = P + 880 + i * 156;
    box(f, `sw${i}`, x, 18, 144, 54, { fill, stroke: BORDER, radius: 10 });
    txt(f, `swT${i}`, label, x, 34, { size: 12, fill: ink, align: 'center', width: 144 });
  });

  // Botão e chip — o preenchimento vivo, que é o que mais "se destaca"
  box(f, 'btn', P, 92, 190, 44, { fill: s.fill, radius: 10 });
  txt(f, 'btnT', 'Explorar o acervo', P, 105, { size: 14, fill: s.fillInk, weight: 'SemiBold', align: 'center', width: 190 });
  box(f, 'chip', P + 206, 92, 150, 44, { fill: s.fill, radius: 999 });
  txt(f, 'chipT', 'Por divisão', P + 206, 105, { size: 13, fill: s.fillInk, align: 'center', width: 150 });
  // Número grande — o destaque editorial
  txt(f, 'bigN', '12.003', P + 380, 84, { condensed: true, size: 44, tracking: -0.8, tnum: true, fill: s.ink, width: 200 });
  txt(f, 'bigL', 'clubes no acervo', P + 380, 138, { size: 12.5, color: INK2, width: 220 });
  // Link
  txt(f, 'lkL', 'link de clube', P + 620, 92, { size: 12, upper: true, tracking: 1.2, color: INK3, width: 160 });
  txt(f, 'lk', 'Inter Milan', P + 620, 112, { size: 15, fill: s.ink, width: 220 });
  // Barra de acento da prateleira
  box(f, 'bar', P + 880, 84, 4, 56, { fill: s.fill });
  txt(f, 'barT', 'barra de acento', P + 896, 92, { size: 12, upper: true, tracking: 1.2, color: INK3, width: 200 });
  txt(f, 'barV', 'na prateleira', P + 896, 112, { size: 14, color: INK2, width: 200 });

  // A TABELA — onde as três cores convivem e onde dá para julgar de verdade
  const TY = 176;
  const TX = P;
  const TW = CW - 40;
  const COL = { pos: TX, club: TX + 40, pts: TX + 700, jogos: TX + 780, pais: TX + 880 };
  box(f, 'thead', TX, TY, TW, 22, { fill: SURFACE2, radius: 6 });
  [['#', COL.pos], ['CLUBE', COL.club], ['PTS', COL.pts], ['JOGOS', COL.jogos], ['PAÍS', COL.pais]].forEach(
    ([t, x], i) => txt(f, `th${i}`, t, x, TY + 5, { size: 10.5, upper: true, tracking: 1.2, color: INK3, width: 120 }),
  );
  const ROWS = [
    ['1', 'Inter Milan', '100', '58', 'IT'],
    ['2', 'Sociedade Esportiva Palmeiras', '94', '55', 'BR'],
    ['3', 'Club de Regatas do Flamengo', '91', '54', 'BR'],
  ];
  ROWS.forEach(([pos, club, pts, jogos, pais], i) => {
    const ry = TY + 26 + i * 30;
    box(f, `row${i}`, TX, ry, TW, 30, { fill: i % 2 === 1 ? SURFACE2 : SURFACE, radius: 6 });
    // pódio em `accent`
    txt(f, `r${i}p`, pos, COL.pos, ry + 6, { condensed: true, size: 20, tnum: true, fill: Number(pos) <= 3 ? s.accent : INK3, width: 32 });
    txt(f, `r${i}c`, club, COL.club, ry + 8, { size: 13.5, weight: Number(pos) <= 3 ? 'SemiBold' : 'Regular', fill: s.ink, width: 600 });
    txt(f, `r${i}pts`, pts, COL.pts, ry + 4, { condensed: true, size: 19, tnum: true, fill: INK, width: 60 });
    txt(f, `r${i}j`, jogos, COL.jogos, ry + 8, { size: 12.5, tnum: true, color: INK2, width: 60 });
    txt(f, `r${i}pa`, pais, COL.pais, ry + 8, { size: 12, color: INK3, width: 60 });
  });
  txt(f, 'src', 'Fonte: RSSSF · fórmula cbf-2023-raw', TX, TY + 122, { size: 11.5, color: INK3, width: 500 });

  y += CARD_H + GAP;
});

const out = resolve(process.argv[2] ?? '.tmp/fig/palettes.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(script, null, 1));
console.log(`${SCHEMES.length} esquemas · passos: ${script.length} · escrito em ${out}`);
