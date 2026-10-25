/**
 * BOT T596 (item 36) — COBERTURA DE ESCUDOS via P18 do Wikidata, licença verificada.
 *
 * ── O GAP QUE ESTE BOT ATACA ─────────────────────────────────────────────────────────
 * O bot T32 (`enrich-club-crests.ts`) cobriu os clubes que JÁ tinham `logoUrl` no acervo
 * (752 de ~12.017). Os demais — milhares com QID e sem escudo — têm na maioria das vezes
 * uma imagem no próprio item do Wikidata (P18, "imagem"), que é o mesmo asset curado
 * pelas comunidades da Wikipédia: o arquivo mora no Wikimedia Commons, com licença
 * explícita e auditável. Este bot lê o P18, VERIFICA a licença no Commons e grava em
 * `ClubCrest` com `isCurrent = true`. Nada é lembrado: cada licença vem da resposta da
 * API do Commons, na mesma régua do bot T32 (`licencaAceita` — NC/ND recusados).
 *
 * ── POR QUE NÃO USA footylogos.com / seeklogo / brandsoftheworld ─────────────────────
 * Esses agregadores republicam escudos SEM licença verificável e sem autorização dos
 * detentores — usar por "fins ilustrativos" é o argumento que não sobrevive a uma
 * notificação de DMCA (o acervo já tem política de resposta: /direitos-autorais). A
 * fonte aqui é a MESMA imagem que a Wikipédia usa, com a licença gravada linha a linha.
 * O histórico editorial (historiadofutebol.com) pode INSPIRAR a lista curada do T32,
 * mas nenhum texto ou imagem é copiado.
 *
 * ── GUARDA DE PLAUSIBILIDADE (declarada) ──────────────────────────────────────────────
 * P18 é "imagem do item" — para clubes é quase sempre o escudo, mas pode ser foto de
 * estádio. Regra: só entra arquivo de extensão vetorial/transparente (.svg/.png/.gif);
 * .jpg/.jpeg são DESCARTADOS e contados — foto de estádio vem quase sempre em jpg, e
 * escudo errado é pior que escudo ausente. Consequência honesta: um clube cuja única
 * imagem P18 for uma foto fica de fora (gap declarado no relatório).
 *
 * ── USO ────────────────────────────────────────────────────────────────────────────────
 *   node dist/scripts/enrich-club-crests-p18.js                          # dry-run
 *   node dist/scripts/enrich-crests-p18.js --apply --allow-production [--limit=500]
 *
 * Idempotente: `@@unique([clubId, imageUrl])`; seleção só pega clube SEM escudo vigente.
 * Reversível: DELETE FROM club_crests WHERE "importedFrom" = 'wikidata-p18';
 */
import { PrismaClient } from '@prisma/client';
import { licencaAceita } from './enrich-club-crests.js';

const UA =
  'AlmanaqueDosClubes-WikidataBot/1.0 (+https://almanaquedosclubes.com; endart.studios@gmail.com)';
const IMPORTED_FROM = 'wikidata-p18';
/** Tamanho do lote por requisição (teto da API MediaWiki). */
const LOTE = 50;

/**
 * P18 é "imagem do item": para clube é quase sempre o escudo, mas pode ser foto de
 * estádio. A extensão é a única pista barata e determinística — e a regra do acervo é
 * RECUSAR quando a dúvida existe. SVG/PNG/GIF podem ser logo; JPG quase sempre é foto.
 */
export function pareceEscudo(nomeArquivo: string): boolean {
  return /\.(svg|png|gif)$/i.test(nomeArquivo);
}

interface ClaimP18 {
  rank?: 'preferred' | 'normal' | 'deprecated';
  mainsnak?: {
    datavalue?: { value?: string | { text?: string } };
    snaktype?: string;
  };
}

/**
 * Escolhe O arquivo do P18: rank `preferred` vence; entre iguais, o primeiro truthy.
 * Snak `somevalue`/`novalue` ou valor sem texto não são arquivo — devolvem null.
 */
export function escolheP18(claims: ClaimP18[] | undefined): string | null {
  if (!claims?.length) return null;
  const valor = (c: ClaimP18): string | null => {
    const v = c.mainsnak?.datavalue?.value;
    if (typeof v === 'string') return v.startsWith('File:') ? v : `File:${v}`;
    if (v && typeof v === 'object' && typeof v.text === 'string')
      return v.text.startsWith('File:') ? v.text : `File:${v.text}`;
    return null;
  };
  const preferred = claims.find((c) => c.rank === 'preferred');
  if (preferred) {
    const v = valor(preferred);
    if (v) return v;
  }
  for (const c of claims) {
    if (c.rank === 'deprecated') continue;
    const v = valor(c);
    if (v) return v;
  }
  return null;
}

interface InfoCommons {
  license: string | null;
  artist: string | null;
  url: string | null;
}

/** Licença/URL de até 50 arquivos por requisição ao Commons (imageinfo + extmetadata). */
export async function infoCommons(titulos: string[]): Promise<Map<string, InfoCommons>> {
  const out = new Map<string, InfoCommons>();
  for (let i = 0; i < titulos.length; i += LOTE) {
    const lote = titulos.slice(i, i + LOTE);
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

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const limiteArg = process.argv.find((a) => a.startsWith('--limit='));
  const limite = limiteArg ? Math.max(1, parseInt(limiteArg.slice(8), 10) || 0) : null;

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
    // Universo: clube vivo, com QID, SEM escudo vigente em `club_crests`.
    // (O que já tem linha isCurrent=true veio do bot T32 ou de lista curada — intocável.)
    const alvos = await prisma.club.findMany({
      where: {
        deletedAt: null,
        qid: { not: null },
        crests: { none: { isCurrent: true } },
      },
      select: { id: true, name: true, qid: true },
      orderBy: { id: 'asc' },
      ...(limite ? { take: limite } : {}),
    });

    const descartes: Record<string, number> = {};
    const d = (k: string) => (descartes[k] = (descartes[k] ?? 0) + 1);

    // P18 por QID, em lotes.
    const arquivoPorClube = new Map<string, { clubId: string; clubName: string; titulo: string }>();
    const qids = alvos.map((c) => c.qid as string);
    for (let i = 0; i < qids.length; i += LOTE) {
      const lote = qids.slice(i, i + LOTE);
      const url =
        'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=' +
        encodeURIComponent(lote.join('|'));
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
      const json = (await res.json()) as {
        entities?: Record<string, { claims?: Record<string, ClaimP18[]> }>;
      };
      for (const [qid, entidade] of Object.entries(json.entities ?? {})) {
        const alvo = alvos.find((c) => c.qid === qid);
        if (!alvo) continue;
        const titulo = escolheP18(entidade.claims?.P18);
        if (!titulo) {
          d('sem_p18');
          continue;
        }
        if (!pareceEscudo(titulo)) {
          d('extensao_foto');
          continue;
        }
        arquivoPorClube.set(qid, { clubId: alvo.id, clubName: alvo.name, titulo });
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    // Licença de cada arquivo (a MESMA que agrupa clubes com arquivo igual).
    const titulosUnicos = [...new Set([...arquivoPorClube.values()].map((v) => v.titulo))];
    const infos = await infoCommons(titulosUnicos);

    interface Plano {
      clubId: string;
      clubName: string;
      titulo: string;
      imageUrl: string;
      license: string;
      attribution: string | null;
    }
    const planos: Plano[] = [];
    for (const { clubId, clubName, titulo } of arquivoPorClube.values()) {
      const info = infos.get(titulo);
      if (!info?.url) {
        d('sem_resposta_commons');
        continue;
      }
      if (!licencaAceita(info.license)) {
        d('licenca_recusada');
        continue;
      }
      planos.push({
        clubId,
        clubName,
        titulo,
        imageUrl: info.url,
        license: info.license as string,
        attribution: info.artist,
      });
    }

    console.log(
      `\nBOT escudos P18 · ${apply ? 'APLICANDO' : 'DRY-RUN'} · ${planos.length} escudo(s)`,
    );
    console.log(`  clubes no universo (com QID, sem escudo vigente): ${alvos.length}`);
    console.log(`  com P18 vetorial/transparente: ${arquivoPorClube.size}`);
    if (Object.keys(descartes).length) console.log(`  descartes: ${JSON.stringify(descartes)}`);

    let criados = 0;
    let existentes = 0;
    for (const p of planos) {
      const jaTem = await prisma.clubCrest.findUnique({
        where: { clubId_imageUrl: { clubId: p.clubId, imageUrl: p.imageUrl } },
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
            imageUrl: p.imageUrl,
            sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(
              p.titulo.replace(/ /g, '_'),
            )}`,
            license: p.license,
            attribution: p.attribution,
            yearFrom: null,
            yearTo: null,
            isCurrent: true,
            periodLabel: null,
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
        `\n  APLICADO. Rollback: DELETE FROM club_crests WHERE "importedFrom" = '${IMPORTED_FROM}';`,
      );
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && /enrich-club-crests-p18\.(ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
