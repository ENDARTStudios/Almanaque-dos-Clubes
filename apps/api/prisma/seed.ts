/**
 * Seed expandido — dados realistas brasileiros + RBAC.
 *
 * Cria:
 * - 10 clubes brasileiros históricos (Flamengo, Palmeiras, Santos, Corinthians,
 *   São Paulo, Cruzeiro, Grêmio, Internacional, Atlético-MG, Fluminense)
 * - 3 competições (Brasileirão Série A, Copa do Brasil, Libertadores)
 * - 2 rankings (Ranking CBF 2023, Ranking CONMEBOL 2023) com 10 entradas cada
 * - 3 roles (admin, pro, free) + 18 permissões granulares + atribuições
 *
 * Idempotente: usa upsert/findFirst+update (não duplica em execução repetida).
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  PERMISSIONS,
  ROLE_NAMES,
  ROLE_PERMISSIONS,
} from '../src/modules/auth/rbac.service.js';

const prisma = new PrismaClient();

interface ClubSeed {
  name: string;
  fullName: string;
  shortName: string;
  city: string;
  state: string;
  country: string;
  foundedYear: number;
  primaryColor: string;
  website?: string;
}

interface CompetitionSeed {
  name: string;
  country: string | null;
  type: 'LEAGUE' | 'CUP' | 'TOURNAMENT' | 'SUPER_CUP';
}

const CLUBS: ClubSeed[] = [
  {
    name: 'Flamengo',
    fullName: 'Clube de Regatas do Flamengo',
    shortName: 'FLA',
    city: 'Rio de Janeiro',
    state: 'RJ',
    country: 'BR',
    foundedYear: 1895,
    primaryColor: '#C8102E',
    website: 'https://www.flamengo.com.br',
  },
  {
    name: 'Palmeiras',
    fullName: 'Sociedade Esportiva Palmeiras',
    shortName: 'PAL',
    city: 'São Paulo',
    state: 'SP',
    country: 'BR',
    foundedYear: 1914,
    primaryColor: '#006437',
    website: 'https://www.palmeiras.com.br',
  },
  {
    name: 'Santos',
    fullName: 'Santos Futebol Clube',
    shortName: 'SAN',
    city: 'Santos',
    state: 'SP',
    country: 'BR',
    foundedYear: 1912,
    primaryColor: '#FFFFFF',
  },
  {
    name: 'Corinthians',
    fullName: 'Sport Club Corinthians Paulista',
    shortName: 'COR',
    city: 'São Paulo',
    state: 'SP',
    country: 'BR',
    foundedYear: 1910,
    primaryColor: '#000000',
  },
  {
    name: 'São Paulo',
    fullName: 'São Paulo Futebol Clube',
    shortName: 'SAO',
    city: 'São Paulo',
    state: 'SP',
    country: 'BR',
    foundedYear: 1930,
    primaryColor: '#FE0000',
  },
  {
    name: 'Cruzeiro',
    fullName: 'Cruzeiro Esporte Clube',
    shortName: 'CRU',
    city: 'Belo Horizonte',
    state: 'MG',
    country: 'BR',
    foundedYear: 1921,
    primaryColor: '#003F87',
  },
  {
    name: 'Grêmio',
    fullName: 'Grêmio Foot-Ball Porto Alegrense',
    shortName: 'GRE',
    city: 'Porto Alegre',
    state: 'RS',
    country: 'BR',
    foundedYear: 1903,
    primaryColor: '#0E61A4',
  },
  {
    name: 'Internacional',
    fullName: 'Sport Club Internacional',
    shortName: 'INT',
    city: 'Porto Alegre',
    state: 'RS',
    country: 'BR',
    foundedYear: 1909,
    primaryColor: '#E5101B',
  },
  {
    name: 'Atlético-MG',
    fullName: 'Clube Atlético Mineiro',
    shortName: 'CAM',
    city: 'Belo Horizonte',
    state: 'MG',
    country: 'BR',
    foundedYear: 1908,
    primaryColor: '#000000',
  },
  {
    name: 'Fluminense',
    fullName: 'Fluminense Football Club',
    shortName: 'FLU',
    city: 'Rio de Janeiro',
    state: 'RJ',
    country: 'BR',
    foundedYear: 1902,
    primaryColor: '#7A0C2A',
  },
];

const COMPETITIONS: CompetitionSeed[] = [
  {
    name: 'Campeonato Brasileiro Série A',
    country: 'BR',
    type: 'LEAGUE',
  },
  {
    name: 'Copa do Brasil',
    country: 'BR',
    type: 'CUP',
  },
  {
    name: 'Copa Libertadores da América',
    country: null, // Competição continental
    type: 'TOURNAMENT',
  },
];

// Ranking CBF 2023 — pontos atribuídos pela CBF (aproximação realista)
const RANKING_CBF_2023 = [
  { club: 'Palmeiras', position: 1, points: 2848 },
  { club: 'Flamengo', position: 2, points: 2799 },
  { club: 'Atlético-MG', position: 3, points: 2670 },
  { club: 'Fluminense', position: 4, points: 2635 },
  { club: 'Corinthians', position: 5, points: 2570 },
  { club: 'São Paulo', position: 6, points: 2455 },
  { club: 'Grêmio', position: 7, points: 2400 },
  { club: 'Internacional', position: 8, points: 2380 },
  { club: 'Santos', position: 9, points: 2245 },
  { club: 'Cruzeiro', position: 10, points: 2190 },
];

// Ranking CONMEBOL 2023 — pontos da Libertadores (aproximação realista)
const RANKING_CONMEBOL_2023 = [
  { club: 'Flamengo', position: 1, points: 2800 },
  { club: 'Palmeiras', position: 2, points: 2750 },
  { club: 'Atlético-MG', position: 3, points: 2350 },
  { club: 'Fluminense', position: 4, points: 2200 },
  { club: 'Internacional', position: 5, points: 2050 },
  { club: 'São Paulo', position: 6, points: 1950 },
  { club: 'Grêmio', position: 7, points: 1900 },
  { club: 'Corinthians', position: 8, points: 1850 },
  { club: 'Santos', position: 9, points: 1700 },
  { club: 'Cruzeiro', position: 10, points: 1600 },
];

async function seedClubs() {
  console.log('🌱 Criando clubes...');
  let created = 0;
  for (const club of CLUBS) {
    const result = await prisma.club.upsert({
      where: { name_country: { name: club.name, country: club.country } },
      update: {
        fullName: club.fullName,
        shortName: club.shortName,
        city: club.city,
        state: club.state,
        foundedYear: club.foundedYear,
        primaryColor: club.primaryColor,
        website: club.website,
        status: 'ACTIVE',
      },
      create: club,
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    }
    console.log(`  ✓ ${result.name} (${result.country}) — ${result.city}/${result.state}`);
  }
  console.log(`  Total: ${CLUBS.length} clubes processados (${created} novos)`);
  return CLUBS.length;
}

async function seedCompetitions() {
  console.log('\n🌱 Criando competições...');
  // Idempotência: busca por nome (não há @@unique em name)
  for (const comp of COMPETITIONS) {
    const existing = await prisma.competition.findFirst({
      where: { name: comp.name, country: comp.country },
    });
    if (existing) {
      await prisma.competition.update({
        where: { id: existing.id },
        data: { type: comp.type },
      });
      console.log(`  ↻ ${comp.name} (atualizado)`);
    } else {
      await prisma.competition.create({ data: comp });
      console.log(`  + ${comp.name}`);
    }
  }
  console.log(`  Total: ${COMPETITIONS.length} competições`);
  return COMPETITIONS.length;
}

async function seedRankings() {
  console.log('\n🌱 Criando rankings...');

  // 1. Ranking CBF 2023 — associado ao Brasileirão
  const brasileirao = await prisma.competition.findFirst({
    where: { name: 'Campeonato Brasileiro Série A' },
  });
  if (!brasileirao) throw new Error('Brasileirão não encontrado');

  // Ranking não tem @@unique em name — usa findFirst + create/update para idempotência
  let rankingCbf = await prisma.ranking.findFirst({
    where: { name: 'Ranking CBF 2023' },
  });
  if (rankingCbf) {
    rankingCbf = await prisma.ranking.update({
      where: { id: rankingCbf.id },
      data: {
        competitionId: brasileirao.id,
        season: '2023',
        publishedAt: new Date('2023-12-20'),
      },
    });
  } else {
    rankingCbf = await prisma.ranking.create({
      data: {
        name: 'Ranking CBF 2023',
        competitionId: brasileirao.id,
        season: '2023',
        publishedAt: new Date('2023-12-20'),
      },
    });
  }

  // Limpa entradas existentes e recria (idempotente)
  await prisma.rankingEntry.deleteMany({ where: { rankingId: rankingCbf.id } });
  for (const entry of RANKING_CBF_2023) {
    const club = await prisma.club.findFirst({
      where: { name: entry.club, country: 'BR' },
    });
    if (!club) {
      console.warn(`  ⚠ Clube não encontrado: ${entry.club}`);
      continue;
    }
    await prisma.rankingEntry.create({
      data: {
        rankingId: rankingCbf.id,
        clubId: club.id,
        position: entry.position,
        points: entry.points,
      },
    });
  }
  console.log(`  ✓ Ranking CBF 2023 (${RANKING_CBF_2023.length} entradas)`);

  // 2. Ranking CONMEBOL 2023 — associado à Libertadores
  // NOTA: o Prisma às vezes normaliza "América" para "America" sem acento —
  // busca com insensibilidade a acento para robustez.
  const libertadores = await prisma.competition.findFirst({
    where: { name: { contains: 'Libertadores' } },
  });
  if (!libertadores) throw new Error('Libertadores não encontrada');

  let rankingConmebol = await prisma.ranking.findFirst({
    where: { name: 'Ranking CONMEBOL 2023' },
  });
  if (rankingConmebol) {
    rankingConmebol = await prisma.ranking.update({
      where: { id: rankingConmebol.id },
      data: {
        competitionId: libertadores.id,
        season: '2023',
        publishedAt: new Date('2023-12-15'),
      },
    });
  } else {
    rankingConmebol = await prisma.ranking.create({
      data: {
        name: 'Ranking CONMEBOL 2023',
        competitionId: libertadores.id,
        season: '2023',
        publishedAt: new Date('2023-12-15'),
      },
    });
  }

  await prisma.rankingEntry.deleteMany({ where: { rankingId: rankingConmebol.id } });

  for (const entry of RANKING_CONMEBOL_2023) {
    const club = await prisma.club.findFirst({
      where: { name: entry.club, country: 'BR' },
    });
    if (!club) {
      console.warn(`  ⚠ Clube não encontrado: ${entry.club}`);
      continue;
    }
    await prisma.rankingEntry.create({
      data: {
        rankingId: rankingConmebol.id,
        clubId: club.id,
        position: entry.position,
        points: entry.points,
      },
    });
  }
  console.log(`  ✓ Ranking CONMEBOL 2023 (${RANKING_CONMEBOL_2023.length} entradas)`);

  return 2;
}

async function seedRbac() {
  console.log('\n🌱 Criando roles e permissões (RBAC)...');

  // 1. Cria todas as permissões (idempotente por name @unique)
  let permissionsCreated = 0;
  for (const [key, name] of Object.entries(PERMISSIONS)) {
    const existing = await prisma.permission.findUnique({ where: { name } });
    if (!existing) {
      await prisma.permission.create({
        data: {
          name,
          description: `Permissão: ${key.toLowerCase().replace(/_/g, ' ')}`,
        },
      });
      permissionsCreated++;
    }
  }
  console.log(`  Permissões: ${Object.keys(PERMISSIONS).length} (${permissionsCreated} novas)`);

  // 2. Cria as 3 roles padrão (idempotente por name @unique)
  const roleDescriptions: Record<string, string> = {
    [ROLE_NAMES.ADMIN]: 'Administrador — acesso total ao sistema',
    [ROLE_NAMES.PRO]: 'Plano Pro — CRUD de clubes/players + leitura geral',
    [ROLE_NAMES.FREE]: 'Plano Free — apenas leitura de dados públicos',
  };

  let rolesCreated = 0;
  for (const roleName of Object.values(ROLE_NAMES)) {
    const existing = await prisma.role.findUnique({ where: { name: roleName } });
    if (!existing) {
      await prisma.role.create({
        data: {
          name: roleName,
          description: roleDescriptions[roleName],
        },
      });
      rolesCreated++;
    }
  }
  console.log(`  Roles: ${Object.values(ROLE_NAMES).length} (${rolesCreated} novas)`);

  // 3. Atribui permissões às roles (idempotente por PK composta [roleId, permissionId])
  let assignmentsCreated = 0;
  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.warn(`  ⚠ Role não encontrada: ${roleName}`);
      continue;
    }
    for (const permName of permissionNames) {
      const permission = await prisma.permission.findUnique({ where: { name: permName } });
      if (!permission) {
        console.warn(`  ⚠ Permissão não encontrada: ${permName}`);
        continue;
      }
      // Upsert por PK composta [roleId, permissionId]
      const existing = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: permission.id },
        });
        assignmentsCreated++;
      }
    }
  }
  console.log(`  Atribuições role-permissão: ${assignmentsCreated} novas`);

  // 4. Verifica integridade pós-seed
  const totalRoles = await prisma.role.count();
  const totalPermissions = await prisma.permission.count();
  const totalAssignments = await prisma.rolePermission.count();

  if (totalRoles < 3) throw new Error(`Esperado ≥3 roles, atual ${totalRoles}`);
  if (totalPermissions < 18) throw new Error(`Esperado ≥18 permissões, atual ${totalPermissions}`);
  if (totalAssignments < 18) throw new Error(`Esperado ≥18 atribuições, atual ${totalAssignments}`);
}

async function main() {
  console.log('🌱 Iniciando seed expandido do Almanaque dos Clubes...\n');

  const clubsCount = await seedClubs();
  const competitionsCount = await seedCompetitions();
  const rankingsCount = await seedRankings();
  await seedRbac();

  // Verifica integridade pós-seed
  const clubs = await prisma.club.count();
  const competitions = await prisma.competition.count();
  const rankings = await prisma.ranking.count();
  const rankingEntries = await prisma.rankingEntry.count();

  console.log('\n📊 Resumo pós-seed:');
  console.log(`  Clubes:        ${clubs}`);
  console.log(`  Competições:  ${competitions}`);
  console.log(`  Rankings:     ${rankings}`);
  console.log(`  Entries:      ${rankingEntries}`);

  // Sanity checks
  if (clubs < 10) throw new Error(`Esperado ≥10 clubes, atual ${clubs}`);
  if (competitions < 3) throw new Error(`Esperado ≥3 competições, atual ${competitions}`);
  if (rankings < 2) throw new Error(`Esperado ≥2 rankings, atual ${rankings}`);
  if (rankingEntries < 20) throw new Error(`Esperado ≥20 entries (10x2), atual ${rankingEntries}`);

  console.log('\n✅ Seed concluído com sucesso.');
}

main()
  .catch((err) => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
