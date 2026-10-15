/**
 * PRANCHA DOS ESTADOS — as quatro famílias semânticas com a paleta vinho.
 *
 * Por que existe: as cores de ESTADO (sucesso, aviso, perigo, informação) foram recalibradas por
 * CÁLCULO na inversão para o tema claro e nunca foram vistas renderizadas. Contraste medido não
 * responde a pergunta que importa aqui: as quatro COMBINAM entre si e com o vinho do acento?
 * Quatro famílias de matizes diferentes na mesma tela podem passar em AA uma a uma e ainda
 * assim parecerem uma colcha de retalhos.
 *
 * Cada estado aparece em DOIS papéis, porque são dois problemas de cor distintos:
 *   `surface` + `ink`  — o badge (fundo tênue, tinta forte). É o par que carrega texto.
 *   `ink` sobre papel  — a mensagem inline, sem fundo. Mais difícil, porque não há superfície
 *                        dedicada para segurar o contraste.
 *
 * Uso: node plugins/almanaque-design/tools/state-board.mjs <saida.json>
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const P = {
  bg: '#faf8f5',
  surface: '#ffffff',
  surface2: '#f2efea',
  ink: '#111111',
  ink2: '#57534e',
  ink3: '#6b6560',
  primary: '#be123c',
  primaryInk: '#9f1239',
  onPrimary: '#ffffff',
  gold: '#94600a',
  border: '#e0dad3',
};

/**
 * DUAS FAMÍLIAS DE ESTADO — a decisão é do Operador, e o motivo é de COESÃO, não de contraste.
 *
 * As quatro cores semânticas foram recalibradas por cálculo na inversão e as quatro passam em
 * AA. Mas "passa em contraste" não é a pergunta certa aqui: o verde, o azul e o vermelho de
 * convenção são FRIOS, e o site inteiro é quente (papel quente, vinho, ouro). Na mesma tela
 * eles parecem enxertados. Isto é o mesmo tipo de defeito do painel de auth quase-preto — o
 * detector não vê, porque não é problema de leitura.
 *
 * `frio`  — os valores de hoje. Máxima convenção: qualquer pessoa lê verde/vermelho/azul.
 * `quente`— os mesmos papéis com matiz puxado para oliva, telha e petróleo. Coesão com a paleta.
 *
 * Medidos nas DUAS superfícies (própria e papel) — todos os oito passam em AA.
 */
const FAMILIAS = {
  frio: {
    rotulo: 'A · Fria — a de hoje',
    nota: 'Convenção máxima: verde, âmbar, vermelho e azul. Qualquer pessoa lê sem aprender. Custa coesão com o papel quente.',
    estados: [
      { nome: 'Sucesso', ink: '#127035', surface: '#dcfce7', msg: 'Favorito adicionado ao seu perfil.', badge: 'ATIVO' },
      { nome: 'Aviso', ink: '#a34a08', surface: '#fef3c7', msg: 'Fonte com apenas uma tabela: cobertura parcial.', badge: 'PARCIAL' },
      { nome: 'Perigo', ink: '#b91c1c', surface: '#fee2e2', msg: 'Não foi possível carregar os rankings.', badge: 'FALHOU' },
      { nome: 'Informação', ink: '#1d4ed8', surface: '#dbeafe', msg: 'Ranking publicado; revisão pendente.', badge: 'NOVO' },
    ],
  },
  quente: {
    rotulo: 'B · Quente — alinhada à paleta',
    nota: 'Oliva, âmbar, telha e petróleo. Os mesmos papéis, com o matiz puxado para a família do vinho — e uma vantagem: o perigo fica longe do vinco da marca.',
    estados: [
      { nome: 'Sucesso', ink: '#3f6212', surface: '#ecfccb', msg: 'Favorito adicionado ao seu perfil.', badge: 'ATIVO' },
      { nome: 'Aviso', ink: '#a34a08', surface: '#fef3c7', msg: 'Fonte com apenas uma tabela: cobertura parcial.', badge: 'PARCIAL' },
      { nome: 'Perigo', ink: '#a52a1a', surface: '#fde8e2', msg: 'Não foi possível carregar os rankings.', badge: 'FALHOU' },
      { nome: 'Informação', ink: '#0e5a70', surface: '#dff0f4', msg: 'Ranking publicado; revisão pendente.', badge: 'NOVO' },
    ],
  },
};

// Neutro e acento são COMUNS às duas famílias: não são estado semântico, são papel.
const COMUNS = [
  { nome: 'Neutro', ink: P.ink2, surface: '#efece7', msg: 'Sem dados para este filtro.', badge: '—' },
  { nome: 'Acento (marca)', ink: P.primaryInk, surface: '#fdf2f4', msg: 'Campeão vigente com fonte verificada.', badge: 'VERIFICADO' },
];

const solid = (color) => [{ type: 'solid', color }];
let nextId = 2;
const script = [];
const emit = (c, p) => (script.push({ command: c, params: p }), nextId++);
const frame = (name, x, y, w, h, fills) =>
  emit('frame.create', { name, x, y, width: w, height: h, props: { fills: solid(fills) } });
const box = (parent, name, x, y, w, h, o = {}) =>
  emit('node.create', {
    type: 'rectangle',
    parent, name, x, y, width: w, height: h,
    props: {
      fills: solid(o.fill ?? P.surface),
      ...(o.radius ? { cornerRadius: o.radius } : {}),
      ...(o.stroke ? { strokes: solid(o.stroke), strokeWeight: 1, strokeAlign: 'inside' } : {}),
      ...(o.shadow ? { effects: [{ type: 'dropShadow', color: '#1a1a1a14', offsetX: 0, offsetY: 2, radius: 8, spread: 0 }] } : {}),
    },
  });
const txt = (parent, name, str, x, y, o = {}) =>
  emit('text.create', {
    text: str, x, y, parent, name,
    width: o.width ?? 400,
    props: {
      fontFamily: o.condensed ? 'Barlow Condensed' : 'Barlow',
      fontSize: o.size ?? 14,
      fontStyle: o.weight ?? (o.condensed ? 'Bold' : 'Regular'),
      ...(o.tracking != null ? { letterSpacing: o.tracking } : {}),
      ...(o.upper ? { textCase: 'upper' } : {}),
      ...(o.align ? { textAlign: o.align } : {}),
      fills: solid(o.fill ?? P.ink),
    },
  });
const rule = (parent, x, y, w, color = P.border) => box(parent, 'rule', x, y, w, 1, { fill: color });
const eyebrow = (parent, s, x, y, w = 700) =>
  txt(parent, 'eb', s, x, y, { size: 11, upper: true, tracking: 1.6, fill: P.ink3, width: w });

const W = 1440;
const M = 64;
const CONTEUDO = W - M * 2;

/** Uma FAIXA por família: nome, nota, badges, e as mensagens com e sem superfície. */
function faixa(nome, x0, y0, fam) {
  const f = frame(nome, x0, y0, W, 500, P.bg);
  const estados = [...fam.estados, ...COMUNS];
  const larg = (CONTEUDO - (estados.length - 1) * 12) / estados.length;

  txt(f, 'r', fam.rotulo, M, 30, { condensed: true, size: 34, tracking: -0.6, width: 460 });
  txt(f, 'n', fam.nota, M + 480, 40, { size: 13, color: P.ink2, width: 780 });

  eyebrow(f, 'badge · 12px · fundo tênue com tinta forte', M, 96, 700);
  estados.forEach((e, i) => {
    const colX = M + i * (larg + 12);
    box(f, `bg${i}`, colX, 124, larg, 40, { fill: e.surface, radius: 999 });
    txt(f, `bt${i}`, e.badge, colX, 136, { size: 12, weight: 'SemiBold', fill: e.ink, align: 'center', width: larg });
    txt(f, `bn${i}`, e.nome, colX, 178, { size: 12, color: P.ink3, align: 'center', width: larg });
  });

  eyebrow(f, 'mensagem inline · 14px · com superfície e sem superfície', M, 232, 800);
  estados.forEach((e, i) => {
    const y = 262 + i * 38;
    box(f, `ib${i}`, M, y, 620, 32, { fill: e.surface, radius: 8 });
    box(f, `ibr${i}`, M, y, 4, 32, { fill: e.ink, radius: 2 });
    txt(f, `it${i}`, e.msg, M + 18, y + 9, { size: 13, fill: e.ink, width: 580 });
    txt(f, `ft${i}`, e.msg, M + 680, y + 9, { size: 13, fill: e.ink, width: 600 });
  });
  return f;
}

faixa('A · fria', 0, 0, FAMILIAS.frio);
faixa('B · quente', 0, 520, FAMILIAS.quente);

// ── Quadro 02: os mesmos estados num CRUD real, para julgar em contexto ─────────────────────
const b2 = frame('02 · em contexto', 1520, 0, W, 900, P.bg);
box(b2, 'band', 0, 0, W, 68, { fill: P.surface });
rule(b2, 0, 68, W);
txt(b2, 'brand', 'ALMANAQUE', M, 22, { condensed: true, size: 24, fill: P.primaryInk, width: 170 });
txt(b2, 'sub', 'Painel — fontes monitoradas', M + 174, 28, { size: 12.5, color: P.ink2, width: 300 });

eyebrow(b2, 'linhas com estado — como o operador lê uma tabela de saúde', M, 100, 800);
const LINHAS = [
  ['knowledge_graph', '38.412 nós', 'Saudável', '#3f6212', '#ecfccb'],
  ['rsssf', '1.932 tabelas', 'Parcial', '#a34a08', '#fef3c7'],
  ['wikidata_p54', 'sem tentativa', 'Falhou', '#a52a1a', '#fde8e2'],
  ['cbf_2023_raw', 'fila', 'Novo', '#0e5a70', '#dff0f4'],
  ['osm_tiles', '—', 'Sem dados', P.ink2, '#efece7'],
];
const TW = CONTEUDO;
box(b2, 'thead', M, 130, TW, 34, { fill: P.surface2, radius: 8 });
['FONTE', 'VOLUME', 'ESTADO'].forEach((h, i) =>
  txt(b2, `th${i}`, h, M + 20 + i * 360, 140, { size: 11, upper: true, tracking: 1.3, fill: P.ink3, width: 300 }),
);
LINHAS.forEach(([fonte, vol, estado, ink, surf], i) => {
  const y = 168 + i * 52;
  box(b2, `r${i}`, M, y, TW, 52, { fill: i % 2 === 1 ? P.surface2 : P.surface, radius: 8 });
  txt(b2, `f${i}`, fonte, M + 20, y + 17, { size: 13.5, fill: P.primaryInk, width: 340 });
  txt(b2, `v${i}`, vol, M + 380, y + 17, { size: 13.5, color: P.ink2, width: 300 });
  box(b2, `bs${i}`, M + 740, y + 12, 120, 28, { fill: surf, radius: 999 });
  txt(b2, `bt${i}`, estado, M + 740, y + 19, { size: 12, weight: 'SemiBold', fill: ink, align: 'center', width: 120 });
  // Régua de progresso: o segundo canal de estado, sem depender da cor do texto
  box(b2, `pr${i}`, M + 900, y + 24, 300, 4, { fill: P.surface2, radius: 2 });
  box(b2, `pf${i}`, M + 900, y + 24, [300, 180, 0, 60, 0][i], 4, { fill: ink, radius: 2 });
});

// Alerta de topo: a mensagem que o operador vê primeiro
box(b2, 'alert', M, 470, TW, 56, { fill: '#fde8e2', radius: 12 });
box(b2, 'alertBar', M, 470, 4, 56, { fill: '#a52a1a', radius: 2 });
txt(b2, 'alertT', '2 fontes fora do ar desde 03:12 — a ingestão do P54 não completou.', M + 22, 486, { size: 14, fill: '#a52a1a', width: 900 });
box(b2, 'alertBtn', M + TW - 150, 482, 130, 32, { fill: '#a52a1a', radius: 8 });
txt(b2, 'alertBtnT', 'Ver detalhes', M + TW - 150, 490, { size: 12.5, weight: 'SemiBold', fill: '#ffffff', align: 'center', width: 130 });

// Sucesso e aviso convivendo, para julgar se as quatro brigam entre si
box(b2, 'ok', M, 546, TW / 2 - 8, 52, { fill: '#ecfccb', radius: 12 });
txt(b2, 'okT', 'Última sincronização concluída às 03:40.', M + 20, 562, { size: 13.5, fill: '#3f6212', width: 500 });
box(b2, 'wn', M + TW / 2 + 8, 546, TW / 2 - 8, 52, { fill: '#fef3c7', radius: 12 });
txt(b2, 'wnT', 'Cobertura de 62%: abaixo da meta de 80%.', M + TW / 2 + 28, 562, { size: 13.5, fill: '#a34a08', width: 500 });

eyebrow(b2, 'a marca no mesmo campo de visão — é isto que precisa não brigar', M, 640, 900);
box(b2, 'cta', M, 672, 200, 46, { fill: P.primary, radius: 10 });
txt(b2, 'ctaT', 'Explorar o acervo', M, 686, { size: 14, weight: 'SemiBold', fill: P.onPrimary, align: 'center', width: 200 });
txt(b2, 'ctaN', 'Acento em vinho, separado dos quatro estados: cor de MARCA não entra na escala semântica.', M + 220, 686, { size: 13, color: P.ink2, width: 800 });

const out = resolve(process.argv[2] ?? '.tmp/fig/estados.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(script, null, 1));
console.log(
  `2 famílias · ${FAMILIAS.frio.estados.length + COMUNS.length} papéis por faixa · passos: ${script.length} · escrito em ${out}`,
);
