/**
 * T552 — escudo do clube a partir do INFOBOX da Wikipédia PT (fonte aprovada desde o
 * T450-w8: substituta do Wikidata limitado, com proveniência por registro).
 *
 * Por que existe: o `logoUrl` está em 2,4% porque o P154 do Wikidata simplesmente não
 * cobre os clubes do acervo. O infobox do artigo PT costuma trazer o escudo — e o arquivo
 * está no Commons, logo com licença verificável.
 *
 * O extrator é PURO (wikitext → nome de arquivo) para poder ser testado sem rede. O que
 * ele NÃO faz: decidir licença (isso é do Commons, por arquivo) nem escrever no acervo.
 *
 * Ordem de preferência dos campos: `escudo`/`brasao`/`logotipo`/`logo` antes de `imagem`,
 * porque em alguns infoboxes `imagem` é foto do estádio, e escudo explícito é mais seguro.
 */

/**
 * Campos que carregam o escudo. Dois níveis, porque o risco é diferente:
 * - EXPLÍCITO: o nome do campo já diz que é escudo — aceita qualquer arquivo de imagem;
 * - INFERIDO (`imagem`/`img`): em vários infoboxes esse campo é a FOTO DO ESTÁDIO, então
 *   só aceita se o NOME DO ARQUIVO indicar escudo (logo/escudo/brasão/crest/badge/shield).
 */
const CAMPOS_ESCUDO_EXPLICITO = ['escudo', 'brasao', 'brasão', 'logotipo', 'logo'];
const CAMPOS_ESCUDO_INFERIDO = ['imagem', 'img'];
const HINT_ESCUDO = /escudo|bras[aã]o|logo|logotipo|crest|badge|shield|emblem/i;

/** Um campo do infobox: `|chave = valor` até o próximo `|` de primeiro nível ou `}}`. */
const RE_CAMPO = /^\s*\|\s*([a-zà-ú _0-9]+)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\}\}|$)/gim;

function normalizar(nome: string): string {
  return nome.trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Nome do arquivo a partir do valor CRU de um campo.
 * Aceita `[[Ficheiro:X.png|120px]]`, `[[Imagem:X.svg]]`, `X.jpg`, e recusa URL externa
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
 * Recorta o bloco do infobox de clube contando chaves a partir do `{{` de abertura.
 * Regex simples de `\{\{.*?\}\}` quebra com template aninhado (`{{#if:}}`, `{{flagicon}}`)
 * — o balanceamento é o que o T450-w7 aprendeu a fazer.
 */
export function blocoInfoboxClube(wikitext: string): string | null {
  const inicio = wikitext.search(/\{\{\s*(?:Info|Infobox)\s*\/?\s*[Cc]lube\b/);
  if (inicio < 0) return null;
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

/** Nome do arquivo do escudo no infobox do clube, ou `null` se não houver. */
export function escudoDoInfobox(wikitext: string): string | null {
  const bloco = blocoInfoboxClube(wikitext);
  if (!bloco) return null;
  const valores = new Map<string, string>();
  for (const m of bloco.matchAll(RE_CAMPO)) {
    const chave = (m[1] ?? '').trim().toLowerCase();
    if (!valores.has(chave)) valores.set(chave, m[2] ?? '');
  }
  for (const campo of CAMPOS_ESCUDO_EXPLICITO) {
    const valor = valores.get(campo);
    if (valor === undefined) continue;
    const arquivo = arquivoDoValor(valor);
    if (arquivo) return arquivo;
  }
  for (const campo of CAMPOS_ESCUDO_INFERIDO) {
    const valor = valores.get(campo);
    if (valor === undefined) continue;
    const arquivo = arquivoDoValor(valor);
    // Campo ambíguo: só passa se o nome do arquivo disser que é escudo.
    if (arquivo && HINT_ESCUDO.test(arquivo)) return arquivo;
  }
  return null;
}
