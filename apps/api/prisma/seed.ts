/**
 * Seed mínimo — cria alguns clubes brasileiros históricos para teste.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const clubs = [
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
  ];

  for (const club of clubs) {
    const created = await prisma.club.upsert({
      where: { name_country: { name: club.name, country: club.country } },
      update: {},
      create: club,
    });
    console.log(`  ✓ ${created.name} (${created.country})`);
  }

  console.log('🌱 Seed concluído.');
}

main()
  .catch((err) => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
