/**
 * BOT C — deriva o estado do clube pela COORDENADA, com fronteiras de primeiro nível.
 *
 * ── POR QUE ─────────────────────────────────────────────────────────────────────────────
 * O bot B (P131) parou em 9%: a maioria dos clubes não declara localização administrativa no
 * Wikidata (FC Trelleborg: `P131: []`). Mas **5.075 clubes com país ligado têm coordenada** —
 * e coordenada é um caminho independente.
 *
 * ── O BOT MEDE A PRÓPRIA ACURÁCIA, e isso não é enfeite ─────────────────────────────────
 * Existem 1.479 clubes que JÁ têm estado (ligados por P131 ou por dados anteriores). Eles são
 * verdade conhecida. Antes de oferecer aplicar, o bot roda a derivação nesses clubes e reporta a
 * taxa de acerto. Sem isso, um número como "4.900 clubes ligados" pareceria sucesso — e poderia
 * esconder 5% de clube no estado errado.
 *
 * Medido com esse método (Natural Earth 10m + fallback por nome):
 *   ponto-em-polígono puro ............ 94%
 *   ponto-em-polígono + consenso ....... 96%  (exige que o centroide mais próximo concorde)
 *   vizinho-mais-próximo sozinho ....... 76%  <- por isso NÃO se usa centroide sozinho
 *
 * ── O QUE O BOT NÃO FAZ ─────────────────────────────────────────────────────────────────
 * Não decide sozinho que 96% basta. `--apply` escreve; sem ele, o relatório mostra a acurácia e a
 * cobertura projetada. Quem aceita dado com 4% de erro é o dono do produto — e o clube no estado
 * errado é erro FACTUAL, do tipo que este acervo promete não ter.
 *
 * ── USO ─────────────────────────────────────────────────────────────────────────────────
 *   node dist/scripts/link-clubs-state-coords.js                        # valida e mostra cobertura
 *   node dist/scripts/link-clubs-state-coords.js --fronteiras=/tmp/ne.geojson
 *   node dist/scripts/link-clubs-state-coords.js --apply --allow-production --relatorio=/tmp/r.json
 *   node dist/scripts/link-clubs-state-coords.js --sem-consenso          # mais cobertura, menos acerto
 *
 * Sem `--fronteiras`, baixa o Natural Earth 10m (domínio público, ~39 MB) para um cache local.
 * O arquivo NÃO é versionado: 39 MB no repositório para um dado que se baixa em 4 segundos não
 * se justifica, e ele é regenerável.
 */
/* eslint-disable security/detect-non-literal-fs-filename --
   TODO caminho de arquivo neste script vem do OPERADOR, por argumento de CLI
   (`--fronteiras=`, `--relatorio=`), ou de uma constante deste arquivo. Nao ha entrada de
   usuario da aplicacao aqui: e um script de manutencao que roda no container, e o caminho e
   digitado junto com o comando, como qualquer outro argumento. Desligar a regra no arquivo
   inteiro e melhor que cinco comentarios repetindo a mesma justificativa. */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  acharRegiao,
  distanciaGraus,
  indexarRegioes,
  normalizarNome,
  type Regiao,
} from '../lib/geo/point-in-polygon.js';

const URL_FRONTEIRAS =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';
const CACHE_PADRAO = '/tmp/ne_10m_admin_1_states_provinces.geojson';

function argTexto(nome: string): string | null {
  const a = process.argv.find((x) => x.startsWith(`--${nome}=`));
  return a ? a.slice(nome.length + 3) : null;
}

async function carregarFronteiras(caminho: string): Promise<Map<string, Regiao[]>> {
  if (!existsSync(caminho)) {
    console.log(`  baixando fronteiras (${Math.round(39)} MB, uma vez)...`);
    const res = await fetch(URL_FRONTEIRAS);
    if (!res.ok) throw new Error(`download das fronteiras falhou: HTTP ${res.status}`);
    mkdirSync(dirname(caminho), { recursive: true });
    writeFileSync(caminho, Buffer.from(await res.arrayBuffer()));
  }
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  return indexarRegioes(bruto);
}

interface EstadoAlvo {
  id: string;
  code: string;
  nome: string;
  iso: string;
  lat: number | null;
  lon: number | null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const consenso = !process.argv.includes('--sem-consenso');
  const relatorio = argTexto('relatorio') ?? '/tmp/link-clubs-state-coords.json';
  /* Amostra minima de validação por país para ele poder receber escrita. 15 é o piso que o
     próprio dado sustenta: abaixo disso a "acurácia de 100%" pode ser sorte de 5 casos. */
  const amostraMinima = Number(argTexto('amostra-minima') ?? 15);
  const caminhoFronteiras = argTexto('fronteiras') ?? CACHE_PADRAO;

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
    const regioesPorPais = await carregarFronteiras(caminhoFronteiras);
    console.log(
      `  fronteiras: ${[...regioesPorPais.values()].reduce((s, v) => s + v.length, 0)} regiões em ${regioesPorPais.size} países`,
    );

    const estados = (await prisma.state.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        latitude: true,
        longitude: true,
        country: { select: { iso2: true } },
      },
    })) as Array<{
      id: string;
      code: string;
      name: string;
      latitude: number | null;
      longitude: number | null;
      country: { iso2: string } | null;
    }>;

    const porCodigo = new Map<string, EstadoAlvo>();
    const porNome = new Map<string, EstadoAlvo>();
    const centroidePorPais = new Map<string, EstadoAlvo[]>();
    for (const e of estados) {
      if (!e.country) continue;
      const alvo: EstadoAlvo = {
        id: e.id,
        code: e.code,
        nome: normalizarNome(e.name),
        iso: e.country.iso2,
        lat: e.latitude,
        lon: e.longitude,
      };
      porCodigo.set(alvo.code, alvo);
      porNome.set(`${alvo.iso}|${alvo.nome}`, alvo);
      if (alvo.lat !== null && alvo.lon !== null) {
        if (!centroidePorPais.has(alvo.iso)) centroidePorPais.set(alvo.iso, []);
        centroidePorPais.get(alvo.iso)!.push(alvo);
      }
    }

    /** Deriva o estado de um ponto. Devolve também SE houve consenso. */
    function derivar(lon: number, lat: number, iso: string) {
      const regiao = acharRegiao(lon, lat, iso, regioesPorPais);
      if (!regiao) return null;
      // Código primeiro (mais forte); nome como fallback para os códigos ISO de versão antiga.
      const porCodigoMatch =
        porCodigo.get(regiao.code) ?? porNome.get(`${iso}|${regiao.nome}`) ?? null;
      if (!porCodigoMatch) return null;

      let centroideMatch: EstadoAlvo | null = null;
      let menor = Infinity;
      for (const s of centroidePorPais.get(iso) ?? []) {
        const d = distanciaGraus({ lat, lon }, { lat: s.lat as number, lon: s.lon as number });
        if (d < menor) {
          menor = d;
          centroideMatch = s;
        }
      }
      const concordam = centroideMatch?.id === porCodigoMatch.id;
      if (consenso && !concordam) return null;
      return { estado: porCodigoMatch, concordam };
    }

    const clubes = await prisma.club.findMany({
      where: { deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      select: { id: true, country: true, latitude: true, longitude: true, stateId: true },
    });

    // ── 1. VALIDAÇÃO contra os clubes que já têm estado ─────────────────────────────────
    let validados = 0;
    let acertos = 0;
    /** Acerto POR PAÍS: é o que permite aprovar país a país em vez de tudo ou nada. */
    const porPaisVal = new Map<string, { n: number; ok: number }>();
    for (const c of clubes) {
      if (!c.stateId || !c.country || c.latitude === null || c.longitude === null) continue;
      const r = derivar(c.longitude, c.latitude, c.country);
      if (!r) continue;
      validados++;
      const acertou = r.estado.id === c.stateId;
      if (acertou) acertos++;
      const iso = c.country.toUpperCase();
      const v = porPaisVal.get(iso) ?? { n: 0, ok: 0 };
      v.n++;
      if (acertou) v.ok++;
      porPaisVal.set(iso, v);
    }
    const acuracia = validados ? Math.round((acertos / validados) * 1000) / 10 : 0;

    /* PORTÃO POR PAÍS — a decisão central deste bot.
       A acurácia global (95,6%) esconde uma distribuição muito desigual: medido no acervo,
       BR/NL/DK/BE/SE/AU/FI/CH/TR/PT acertam 100%, enquanto GB acerta 40%, AR 79%, NO/ES 86%.
       Aplicar a média deixaria ~134 clubes no estado errado — erro FACTUAL. Aplicar só onde o
       método foi validado em 100% (com amostra mínima) deixa os países difíceis como LACUNA
       DECLARADA, que é o que este acervo promete: ausência visível, nunca erro silencioso. */
    const paisesAprovados = new Set<string>();
    for (const [iso, v] of porPaisVal) {
      if (v.n >= amostraMinima && v.ok === v.n) paisesAprovados.add(iso);
    }

    // ── 2. COBERTURA sobre os clubes que NÃO têm estado ────────────────────────────────
    const candidatos: Array<{ clubeId: string; stateId: string }> = [];
    for (const c of clubes) {
      if (c.stateId || !c.country || c.latitude === null || c.longitude === null) continue;
      if (!paisesAprovados.has(c.country.toUpperCase())) continue;
      const r = derivar(c.longitude, c.latitude, c.country);
      if (r) candidatos.push({ clubeId: c.id, stateId: r.estado.id });
    }

    console.log(`\n  ── validação (contra ${validados} clube(s) já ligados) ─────────`);
    console.log(
      `  acurácia medida .... ${acuracia}%${consenso ? ' (exigindo consenso)' : ' (SEM consenso)'}`,
    );
    const recusados = [...porPaisVal.entries()]
      .filter(([iso, v]) => !paisesAprovados.has(iso) && v.n >= amostraMinima)
      .sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n);
    console.log(`\n  ── portão por país (amostra mínima ${amostraMinima}) ────────────────`);
    console.log(
      `  aprovados (100%, n>=${amostraMinima}) .. ${paisesAprovados.size}: ${[...paisesAprovados].join(' ')}`,
    );
    if (recusados.length) {
      console.log('  RECUSADOS (ficam como lacuna declarada):');
      for (const [iso, v] of recusados) {
        console.log(
          `    ${iso}  ${v.ok}/${v.n} = ${Math.round((v.ok / v.n) * 100)}%  — método não confiável aqui`,
        );
      }
    }
    console.log(`\n  ── cobertura (clubes sem estado, só em país aprovado) ────────`);
    console.log(`  candidatos ......... ${candidatos.length}`);
    /* Acurácia dos APROVADOS, não a global. Os candidatos saem só de país aprovado, então usar a
       média global (que inclui GB a 40%) projetaria erro que o portão já excluiu — dizia ~54
       erros para um conjunto selecionado justamente por não ter nenhum. */
    let nAprov = 0;
    let okAprov = 0;
    for (const iso of paisesAprovados) {
      const v = porPaisVal.get(iso);
      if (!v) continue;
      nAprov += v.n;
      okAprov += v.ok;
    }
    console.log(
      `  acurácia nos aprovados ${okAprov}/${nAprov} = ${nAprov ? Math.round((okAprov / nAprov) * 100) : 0}%`,
    );

    writeFileSync(
      relatorio,
      JSON.stringify(
        { geradoEm: new Date().toISOString(), apply, consenso, acuracia, validados, candidatos },
        null,
        2,
      ),
    );
    console.log(`  relatório .......... ${relatorio}`);

    if (!apply) {
      console.log('\n  DRY-RUN: nada foi escrito.');
      console.log('  Aplicar exige decidir que a acurácia medida é aceitável:');
      console.log('    --apply --allow-production --relatorio=/tmp/r.json');
      return;
    }

    const porEstado = new Map<string, string[]>();
    for (const c of candidatos) {
      if (!porEstado.has(c.stateId)) porEstado.set(c.stateId, []);
      porEstado.get(c.stateId)!.push(c.clubeId);
    }
    let escritos = 0;
    for (const [stateId, ids] of porEstado) {
      const res = await prisma.club.updateMany({
        where: { id: { in: ids }, stateId: null },
        data: { stateId },
      });
      escritos += res.count;
    }
    console.log(`\n  APLICADO: ${escritos} clube(s) ligados a ${porEstado.size} estado(s).`);
    console.log('  Rollback: UPDATE clubs SET "stateId" = NULL WHERE id IN (ids do relatório);');

    if (validados < 200) {
      console.warn(
        '\n  AVISO: amostra de validação pequena — a acurácia pode não representar o conjunto.',
      );
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && /link-clubs-state-coords\.(ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
