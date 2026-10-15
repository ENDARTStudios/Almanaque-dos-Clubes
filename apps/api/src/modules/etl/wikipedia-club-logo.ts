/**
 * T552 — escudo do clube a partir do INFOBOX da Wikipédia (fonte aprovada desde o T450-w8:
 * substituta do Wikidata limitado, com proveniência por registro).
 *
 * Por que existe: o `logoUrl` do acervo está em 2,4% porque o P154 do Wikidata não cobre
 * os clubes. O infobox do artigo costuma trazer o escudo — e o arquivo está no Commons,
 * logo com licença verificável.
 *
 * O acervo é INTERNACIONAL: medido em produção, 6 de 12 clubes da fila não têm artigo na
 * wiki PT (são alemães, turcos, peruanos). Por isso o extrator é parametrizado por wiki
 * (`PERFIS_WIKI`), cada uma com o seu template e os seus nomes de campo.
 *
 * O extrator é PURO (wikitext → nome de arquivo) para poder ser testado sem rede. O que
 * ele NÃO faz: decidir licença (isso é do Commons, por arquivo) nem escrever no acervo.
 */

/** Pista de que o arquivo é escudo — usada só nos campos AMBÍGUOS. */
const HINT_ESCUDO = /escudo|bras[aã]o|logo|logotipo|wappen|crest|badge|shield|emblem/i;

/** Um campo do infobox: `|chave = valor` até o próximo `|` de primeiro nível ou `}}`. */
const RE_CAMPO = /^\s*\|\s*([a-zà-ú _0-9]+)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\}\}|$)/gim;

/**
 * Perfil de infobox por wiki: o template que abre o infobox de clube e os campos que
 * podem carregar o escudo, em dois níveis de confiança:
 * - EXPLÍCITO: o nome do campo já diz que é escudo — aceita qualquer arquivo de imagem;
 * - AMBÍGUO (`imagem`/`image`/`bild`): em vários infoboxes é a FOTO DO ESTÁDIO, então só
 *   vale se o NOME DO ARQUIVO indicar escudo.
 */
export interface InfoboxPerfil {
  template: RegExp;
  explicitos: string[];
  ambiguos: string[];
}

export const PERFIS_WIKI: Record<string, InfoboxPerfil> = {
  ptwiki: {
    template: /\{\{\s*(?:Info|Infobox)\s*\/?\s*[Cc]lube\b/,
    explicitos: ['escudo', 'brasao', 'brasão', 'logotipo', 'logo'],
    ambiguos: ['imagem', 'img'],
  },
  enwiki: {
    template: /\{\{\s*Infobox\s+football\s+club\b/i,
    explicitos: ['logo', 'crest', 'badge'],
    ambiguos: ['image', 'img'],
  },
  dewiki: {
    template: /\{\{\s*Infobox\s+Fußballklub\b|\{\{\s*Infobox\s+Fußballverein\b/i,
    explicitos: ['logo', 'wappen'],
    ambiguos: ['bild', 'image'],
  },
};

/** Wikis tentadas, na ordem — a PT primeiro porque é a fonte já aprovada no acervo. */
export const WIKIS_ESCUDO = ['ptwiki', 'enwiki', 'dewiki'] as const;
export type WikiEscudo = (typeof WIKIS_ESCUDO)[number];

function normalizar(nome: string): string {
  return nome.trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Nome do arquivo a partir do valor CRU de um campo.
 * Aceita `[[Ficheiro:X.png|120px]]`, `[[File:X.svg]]`, `X.jpg`, e recusa URL externa
 * (imagem fora do Commons não tem licença verificável) e extensão que não é imagem.
 */
export function arquivoDoValor(valor: string): string | null {
  const semComentario = valor.replace(/<!--[\s\S]*?-->/g, '');
  const link = /\[\[\s*(?:ficheiro|imagem|file|image)\s*:\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]/i.exec(
    semComentario,
  );
  const primeiro = link ? link[1]! : (semComentario.split(/[|\n]/)[0] ?? '');
  const nome = normalizar(primeiro.replace(/^\[\[|\]\]$/g, ''));
  if (!nome) return null;
  if (/^https?:/i.test(nome)) return null; // fora do Commons: sem licença verificável
  if (!/\.(png|svg|jpe?g|gif|webp)$/i.test(nome)) return null;
  return nome;
}

/**
 * Recorta o bloco do infobox contando chaves a partir do `{{` de abertura.
 * Regex simples de `\{\{.*?\}\}` quebra com template aninhado (`{{#if:}}`, `{{flagicon}}`)
 * — o balanceamento é o que o T450-w7 aprendeu a fazer.
 */
export function blocoInfoboxClube(wikitext: string, template?: RegExp): string | null {
  const re = template ?? PERFIS_WIKI.ptwiki!.template;
  const achado = re.exec(wikitext);
  if (!achado) return null;
  const inicio = achado.index;
  let nivel = 0;
  for (let i = inicio; i < wikitext.length - 1; i++) {
    if (wikitext.startsWith('{{', i)) {
      nivel += 1;
      i += 1;
      continue;
    }
    if (wikitext.startsWith('}}', i)) {
      nivel -= 1;
      i += 1;
      if (nivel === 0) return wikitext.slice(inicio, i + 1);
    }
  }
  return wikitext.slice(inicio); // sem fechamento balanceado: usa o resto (conservador)
}

/** Nome do arquivo do escudo no infobox, segundo o perfil da wiki. */
export function escudoDeWikitext(wikitext: string, perfil: InfoboxPerfil): string | null {
  const bloco = blocoInfoboxClube(wikitext, perfil.template);
  if (!bloco) return null;
  const valores = new Map<string, string>();
  for (const m of bloco.matchAll(RE_CAMPO)) {
    const chave = (m[1] ?? '').trim().toLowerCase();
    if (!valores.has(chave)) valores.set(chave, m[2] ?? '');
  }
  for (const campo of perfil.explicitos) {
    const valor = valores.get(campo);
    if (valor === undefined) continue;
    const arquivo = arquivoDoValor(valor);
    if (arquivo) return arquivo;
  }
  for (const campo of perfil.ambiguos) {
    const valor = valores.get(campo);
    if (valor === undefined) continue;
    const arquivo = arquivoDoValor(valor);
    // Campo ambíguo: só passa se o nome do arquivo disser que é escudo.
    if (arquivo && HINT_ESCUDO.test(arquivo)) return arquivo;
  }
  return null;
}

/** Atalho para a wiki PT (compatível com o uso original). */
export function escudoDoInfobox(wikitext: string): string | null {
  return escudoDeWikitext(wikitext, PERFIS_WIKI.ptwiki!);
}
