/**
 * T395 — Identifica e soft-desabilita contas de teste em produção.
 *
 * SOFT-DISABLE (reversível): marca `status = 'INACTIVE'` (o schema `users`
 * NÃO tem coluna `deleted_at`; usa `status` para desabilitar).
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/cleanup-test-accounts.ts         # DRY-RUN (lista apenas)
 *   pnpm --filter @almanaque/api exec tsx scripts/cleanup-test-accounts.ts --apply # desabilita (requer autorização do Operador)
 *
 * Critério: email contendo 'test'/'teste' ou domínio '@test.' (case-insensitive).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main(): Promise<void> {
  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'test', mode: 'insensitive' } },
        { email: { contains: 'teste', mode: 'insensitive' } },
        { email: { contains: '@test.', mode: 'insensitive' } },
      ],
    },
    select: { id: true, email: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  if (candidates.length === 0) {
    console.log('Nenhuma conta de teste encontrada. Produção limpa.');
    return;
  }

  console.log('Contas de teste candidatas:');
  for (const u of candidates) console.log(`  ${u.id}  ${u.email}  [${u.status}]`);

  if (!APPLY) {
    console.log('\nDRY-RUN — nada aplicado. Rode com --apply para desabilitar (requer autorização do Operador).');
    return;
  }

  for (const u of candidates) {
    await prisma.user.update({ where: { id: u.id }, data: { status: 'INACTIVE' } });
    console.log(`  → INACTIVE: ${u.email}`);
  }
  console.log(`\n${candidates.length} conta(s) marcada(s) como INACTIVE.`);
}

main()
  .catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
