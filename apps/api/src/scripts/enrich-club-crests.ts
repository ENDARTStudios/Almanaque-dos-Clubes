/**
 * BOT — escudos de clube com LICENÇA VERIFICADA (T32).
 *
 * ── O QUE ESTE BOT FAZ, E O QUE ELE SE RECUSA A FAZER ───────────────────────────────────
 * FAZ: pega os `Club.logoUrl` que já existem no acervo (752 clubes, TODOS apontando para
 * `upload.wikimedia.org/wikipedia/commons`), extrai o título do arquivo e pergunta ao Commons
 * qual é a licença. Grava o resultado em `ClubCrest` com `isCurrent = true`.
 *
 * NÃO FAZ: descobrir escudos HISTÓRICOS por conta própria. Tentei, e a busca livre do Commons
 * é ruidosa de um jeito perigoso: procurando o escudo do Manchester United ela devolve
 * `Ardwick AFC.png`, que é OUTRO clube, e `600px Man Utd stylized.svg`, que é uma foto de
 * ônibus. Ligar isso a um clube sem revisão produziria erro factual — o tipo de erro que este
 * acervo promete não ter. Histórico entra por lista CURADA (ver `--lista=`).
 *
 * ── POR QUE A LICENÇA É LIDA, E NÃO PRESUMIDA ───────────────────────────────────────────
 * O Commons não aceita fair use, então em teoria tudo lá é livre. Mas "em teoria" não é
 * auditoria: a licença de cada arquivo é consultada (`extmetadata.LicenseShortName`) e gravada.
 * Arquivo cuja licença não seja reconhecidamente livre é DESCARTADO e contado — nunca gravado
 * com licença inventada. Escudo de clube é marca registrada; errar aqui é problema jurídico,
 * não bug de tela.
 *
 * ── USO ─────────────────────────────────────────────────────────────────────────────────
 *   node dist/scripts/enrich-club-crests.js                  # dry-run: relatório + amostra
 *   node dist/scripts/enrich-club-crests.js --apply --allow-production
 *   node dist/scripts/enrich-club-crests.js --lista=curado.json --apply --allow-production
 *
 * Formato da lista curada:
 *   [{ "clubQid": "Q18656", "imageUrl": "https://...", "sourceUrl": "https://commons...",
 *      "license": "Public domain", "yearFrom": 1878, "yearTo": 1879, "isCurrent": false }]
 *
 * Idempotente: `@@unique([clubId, imageUrl])` impede duplicata, e o upsert procura por essa
 * chave antes de criar.
 */
/* eslint-disable security/detect-non-literal-fs-filename --
   o caminho da lista curada vem do OPERADOR (`--lista=`), num script de manutenção que roda no
   container. Não há entrada de usuário da aplicação por perto. */
import { existsSync, readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

function argTexto(nome: string): string | null {
  const a = process.argv.find((x) => x.startsWith(`--${nome}=`));
  return a ? a.slice(nome.length + 3) : null;
}

const UA =
  'AlmanaqueDosClubes-WikidataBot/1.0 (+https://almanaquedosclubes.com; endart.studios@gmail.com)';
const IMPORTED_FROM = 'commons-license-verified';

/**
 * Licenças aceitas. Lista EXPLÍCITA: o padrão é recusar. Aceitar por prefixo ("CC") deixaria
 * passar CC-BY-NC, que proíbe uso comercial — e o Almanaque é um produto.
 */
const LICENCAS_LIVRES = [
  'public domain',
  'cc0',
  'cc by 4.0',
  'cc by 3.0',
  'cc by-sa 4.0',
  'cc by-sa 3.0',
  'pd',
];

export function licencaAceita(licenca: string | null | undefined): boolean {
  if (!licenca) return false;
  const l = licenca.trim().toLowerCase();
  /* NC (non-commercial) e ND (no-derivatives) ficam FORA mesmo sendo "CC": este é um produto, e
     ND impediria recortar/redimensionar a imagem numa lista de escudos. */
  if (l.includes('-nc') || l.includes('-nd') || l.includes('noncommercial')) return false;
  return LICENCAS_LIVRES.some((aceita) => l === aceita || l.startsWith(aceita));
}

/**
 * Extrai o título do arquivo de uma URL do Commons.
 * `.../commons/5/50/FC_Helsing%C3%B8r_logo.svg` → `File:FC Helsingør logo.svg`
 */
export function tituloDoArquivo(url: string): string | null {
  const m = /\/commons\/[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)$/i.exec(url);
  if (!m) return null;
  try {
    return `File:${decodeURIComponent(m[1]).replace(/_/g, ' ')}`;
  } catch {
    // Percent-encoding inválido: não dá para montar o título, e chutar corromperia a consulta.
    return null;
  }
}

/** URL da página de descrição (não a do arquivo): é ela que serve de `sourceUrl`. */
export function paginaDeOrigem(titulo: string): string {
  return `https://commons.wikimedia.org/wiki/${encodeURIComponent(titulo.replace(/ /g, '_'))}`;
}

interface InfoCommons {
  license: string | null;
  artist: string | null;
  url: string | null;
}

/** Consulta a licença de até 50 arquivos por requisição. */
async function licencasDe(titulos: string[]): Promise<Map<string, InfoCommons>> {
  const out = new Map<string, InfoCommons>();
  for (let i = 0; i < titulos.length; i += 50) {
    const lote = titulos.slice(i, i + 50);
    const url =
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
      '&iiprop=extmetadata|url&titles=' +
      encodeURIComponent(lote.join('|'));
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
    const json = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            imageinfo?: Array<{
              url?: string;
              extmetadata?: Record<string, { value?: string }>;
            }>;
          }
        >;
      };
    };
    for (const pg of Object.values(json.query?.pages ?? {})) {
      const ii = pg.imageinfo?.[0];
      const meta = ii?.extmetadata ?? {};
      const artista = (meta.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim();
      out.set(pg.title ?? '', {
        license: meta.LicenseShortName?.value?.trim() ?? null,
        artist: artista || null,
        url: ii?.url ?? null,
      });
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return out;
}

interface LinhaCrest {
  imageUrl: string;
  sourceUrl: string;
  license: string;
  attribution: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  isCurrent: boolean;
  periodLabel: string | null;
}

/** Rótulo do período: só com os anos que existem. Sem ano, não inventa faixa. */
export function periodo(
  yearFrom: number | null,
  yearTo: number | null,
  atual: boolean,
): string | null {
  if (yearFrom !== null && yearTo !== null) return `${yearFrom}\u2013${yearTo}`;
  if (yearFrom !== null) return atual ? `${yearFrom}\u2013hoje` : `${yearFrom}\u2013?`;
  if (yearTo !== null) return `? \u2013${yearTo}`;
  return null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const lista = argTexto('lista');

  if (!(process.env.DATABASE_URL ?? '').startsWith('postgres')) {
    console.error('BLOQUEADO: exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const planos: Array<{ clubId: string; clubName: string; crest: LinhaCrest }> = [];
    const descartados: Record<string, number> = {};

    /* ── 1. Lista curada (histórico verificado à mão) ─────────────────────────────────── */
    if (lista) {
      if (!existsSync(lista)) {
        console.error(`lista curada não encontrada: ${lista}`);
        process.exit(1);
      }
      const itens = JSON.parse(readFileSync(lista, 'utf8')) as Array<{
        clubQid: string;
        imageUrl: string;
        sourceUrl: string;
        license: string;
        yearFrom?: number | null;
        yearTo?: number | null;
        isCurrent?: boolean;
      }>;
      const qids = [...new Set(itens.map((i) => i.clubQid))];
      const clubes = await prisma.club.findMany({
        where: { qid: { in: qids } },
        select: { id: true, qid: true, name: true },
      });
      const porQid = new Map(clubes.map((c) => [c.qid as string, c]));
      for (const item of itens) {
        const clube = porQid.get(item.clubQid);
        if (!clube) {
          descartados.clube_nao_encontrado = (descartados.clube_nao_encontrado ?? 0) + 1;
          continue;
        }
        if (!licencaAceita(item.license)) {
          descartados.licenca_recusada = (descartados.licenca_recusada ?? 0) + 1;
          continue;
        }
        const yf = item.yearFrom ?? null;
        const yt = item.yearTo ?? null;
        const atual = item.isCurrent ?? false;
        planos.push({
          clubId: clube.id,
          clubName: clube.name,
          crest: {
            imageUrl: item.imageUrl,
            sourceUrl: item.sourceUrl,
            license: item.license,
            attribution: null,
            yearFrom: yf,
            yearTo: yt,
            isCurrent: atual,
            periodLabel: periodo(yf, yt, atual),
          },
        });
      }
    }

    /* ── 2. Escudo vigente a partir do logoUrl já existente (licença verificada) ──────── */
    const comLogo = await prisma.club.findMany({
      where: { deletedAt: null, logoUrl: { contains: 'wikimedia.org' } },
      select: { id: true, name: true, logoUrl: true },
      orderBy: { id: 'asc' },
    });
    const porTitulo = new Map<string, Array<{ id: string; name: string }>>();
    for (const c of comLogo) {
      const titulo = tituloDoArquivo(c.logoUrl as string);
      if (!titulo) {
        descartados.url_nao_parseavel = (descartados.url_nao_parseavel ?? 0) + 1;
        continue;
      }
      if (!porTitulo.has(titulo)) porTitulo.set(titulo, []);
      porTitulo.get(titulo)!.push({ id: c.id, name: c.name });
    }

    const info = await licencasDe([...porTitulo.keys()]);
    for (const [titulo, clubes] of porTitulo) {
      const meta = info.get(titulo);
      if (!meta) {
        descartados.sem_resposta_commons = (descartados.sem_resposta_commons ?? 0) + 1;
        continue;
      }
      if (!licencaAceita(meta.license)) {
        /* Licença ausente ou restritiva: NÃO grava. É a diferença entre "não temos" e "temos e
           está errado" — e escudo é marca registrada. */
        descartados.licenca_recusada = (descartados.licenca_recusada ?? 0) + 1;
        continue;
      }
      for (const clube of clubes) {
        planos.push({
          clubId: clube.id,
          clubName: clube.name,
          crest: {
            imageUrl: meta.url ?? (comLogo.find((x) => x.id === clube.id)!.logoUrl as string),
            sourceUrl: paginaDeOrigem(titulo),
            license: meta.license as string,
            attribution: meta.artist,
            yearFrom: null,
            yearTo: null,
            isCurrent: true,
            periodLabel: null,
          },
        });
      }
    }

    console.log(`\nBOT escudos · ${apply ? 'APLICANDO' : 'DRY-RUN'} · ${planos.length} escudo(s)`);
    console.log(`  clubes com logoUrl no Commons: ${comLogo.length}`);
    if (Object.keys(descartados).length) console.log(`  descartes: ${JSON.stringify(descartados)}`);

    let criados = 0;
    let existentes = 0;
    for (const p of planos) {
      const jaTem = await prisma.clubCrest.findUnique({
        where: { clubId_imageUrl: { clubId: p.clubId, imageUrl: p.crest.imageUrl } },
        select: { id: true },
      });
      if (jaTem) {
        existentes++;
        continue;
      }
      criados++;
      if (apply) {
        await prisma.clubCrest.create({
          data: {
            clubId: p.clubId,
            ...p.crest,
            importedFrom: IMPORTED_FROM,
            importedAt: new Date(),
          },
        });
      }
    }

    console.log(`  novos ................. ${criados}`);
    console.log(`  já existentes ......... ${existentes}`);
    if (!apply) console.log('\n  DRY-RUN: nada foi escrito.');
    else
      console.log(
        '\n  APLICADO. Rollback: DELETE FROM club_crests WHERE "importedFrom" = \'commons-license-verified\';',
      );
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && /enrich-club-crests\.(ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
