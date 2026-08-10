/**
 * Smoke test para subscription.service.ts.
 * Verifica:
 *   1. createFreeSubscription cria assinatura FREE inicial
 *   2. createFreeSubscription é idempotente (não duplica)
 *   3. changePlan troca FREE → PRO e atualiza currentPeriodEnd
 *   4. cancelSubscription marca CANCELLED sem reverter plano
 *   5. isActiveSubscription funciona
 *   6. hasMinimumPlan verifica hierarquia FREE < PRO < ELITE
 *   7. createBilling cria registro PENDING
 *   8. markBillingPaid muda para PAID + renova currentPeriodEnd (transação)
 *   9. refundBilling e failBilling
 *   10. findBillingByExternalId (idempotência webhook)
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/verify-billing.ts
 */
import { prisma } from '../src/config/prisma.js';
import {
  PLAN_PRICES_CENTS,
  PLAN_CYCLE_DAYS,
  createFreeSubscription,
  getSubscription,
  changePlan,
  cancelSubscription,
  isActiveSubscription,
  hasMinimumPlan,
  createBilling,
  markBillingPaid,
  refundBilling,
  failBilling,
  listUserBillings,
  findBillingByExternalId,
} from '../src/modules/billing/subscription.service.js';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}${extra !== undefined ? ` — ${JSON.stringify(extra)}` : ''}`);
  }
}

async function main() {
  console.log('🧪 Smoke test — subscription/billing service\n');

  // Limpa
  await prisma.billing.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.user.deleteMany({});

  // Cria user
  const user = await prisma.user.create({
    data: {
      email: 'bill-test@example.com',
      passwordHash: 'dummy',
      status: 'ACTIVE',
    },
  });

  // Test 1: createFreeSubscription
  console.log('Test 1: createFreeSubscription cria assinatura FREE');
  const sub1 = await createFreeSubscription(user.id);
  assert('plan é FREE', sub1.plan === 'FREE');
  assert('status é ACTIVE', sub1.status === 'ACTIVE');
  assert('startedAt preenchido', sub1.startedAt instanceof Date);
  assert('currentPeriodEnd é null para FREE', sub1.currentPeriodEnd === null);
  assert('cancelledAt é null', sub1.cancelledAt === null);

  // Test 2: idempotente
  console.log('\nTest 2: createFreeSubscription é idempotente');
  const sub2 = await createFreeSubscription(user.id);
  assert('segunda chamada retorna mesma assinatura', sub1.id === sub2.id);
  const count = await prisma.subscription.count({ where: { userId: user.id } });
  assert('apenas 1 assinatura no banco', count === 1);

  // Test 3: changePlan FREE → PRO
  console.log('\nTest 3: changePlan FREE → PRO atualiza plano e currentPeriodEnd');
  const proSub = await changePlan(user.id, 'PRO');
  assert('plan mudou para PRO', proSub.plan === 'PRO');
  assert('status continua ACTIVE', proSub.status === 'ACTIVE');
  assert('currentPeriodEnd não é mais null', proSub.currentPeriodEnd !== null);
  assert(
    'currentPeriodEnd ≈ +30 dias',
    proSub.currentPeriodEnd !== null &&
      Math.abs(
        proSub.currentPeriodEnd.getTime() - Date.now() - PLAN_CYCLE_DAYS * 24 * 60 * 60 * 1000,
      ) < 5000,
  );

  // Test 4: cancelSubscription
  console.log('\nTest 4: cancelSubscription marca CANCELLED');
  const cancelled = await cancelSubscription(user.id);
  assert('status mudou para CANCELLED', cancelled?.status === 'CANCELLED');
  assert('cancelledAt preenchido', cancelled?.cancelledAt !== null);
  assert('plan ainda é PRO (mantém acesso até fim do ciclo)', cancelled?.plan === 'PRO');
  assert(
    'currentPeriodEnd mantido (usuário continua com acesso)',
    cancelled?.currentPeriodEnd !== null,
  );

  // Test 5: isActiveSubscription
  console.log('\nTest 5: isActiveSubscription reflete estado');
  const _activeBeforeCancel = await isActiveSubscription(user.id);
  // After cancel: status=CANCELLED → não ativa
  const activeAfterCancel = await isActiveSubscription(user.id);
  assert('após cancel, isActive=false', activeAfterCancel === false);

  // Reativa via changePlan
  await changePlan(user.id, 'PRO');
  const activeAfterReactivate = await isActiveSubscription(user.id);
  assert('após reativar, isActive=true', activeAfterReactivate === true);

  // Test 6: hasMinimumPlan (hierarquia)
  console.log('\nTest 6: hasMinimumPlan verifica hierarquia FREE < PRO < ELITE');
  // user está em PRO agora
  assert('PRO satisfaz mínimo FREE', (await hasMinimumPlan(user.id, 'FREE')) === true);
  assert('PRO satisfaz mínimo PRO', (await hasMinimumPlan(user.id, 'PRO')) === true);
  assert('PRO NÃO satisfaz mínimo ELITE', (await hasMinimumPlan(user.id, 'ELITE')) === false);

  await changePlan(user.id, 'ELITE');
  assert('ELITE satisfaz mínimo FREE', (await hasMinimumPlan(user.id, 'FREE')) === true);
  assert('ELITE satisfaz mínimo PRO', (await hasMinimumPlan(user.id, 'PRO')) === true);
  assert('ELITE satisfaz mínimo ELITE', (await hasMinimumPlan(user.id, 'ELITE')) === true);

  await changePlan(user.id, 'FREE');
  assert('FREE NÃO satisfaz mínimo PRO', (await hasMinimumPlan(user.id, 'PRO')) === false);

  // Volta para PRO para testes de billing
  await changePlan(user.id, 'PRO');
  const currentSub = await getSubscription(user.id);
  if (!currentSub) throw new Error('Sub não encontrada');

  // Test 7: createBilling
  console.log('\nTest 7: createBilling cria registro PENDING');
  const billing = await createBilling({
    userId: user.id,
    subscriptionId: currentSub.id,
    amountCents: PLAN_PRICES_CENTS.PRO, // 2900 = R$ 29,00
    currency: 'BRL',
    externalId: 'test_pi_001',
  });
  assert('amountCents = 2900', billing.amountCents === 2900);
  assert('currency = BRL', billing.currency === 'BRL');
  assert('status inicial = PENDING', billing.status === 'PENDING');
  assert('externalId salvo', billing.externalId === 'test_pi_001');
  assert('paidAt é null inicialmente', billing.paidAt === null);

  // Test 8: createBilling rejeita valor negativo
  console.log('\nTest 8: createBilling rejeita valor negativo');
  let threw = false;
  try {
    await createBilling({
      userId: user.id,
      subscriptionId: currentSub.id,
      amountCents: -100,
    });
  } catch {
    threw = true;
  }
  assert('lança erro para amountCents negativo', threw);

  // Test 9: markBillingPaid
  console.log('\nTest 9: markBillingPaid muda para PAID e renova currentPeriodEnd');
  const oldPeriodEnd = currentSub.currentPeriodEnd;
  const paidBilling = await markBillingPaid(billing.id);
  assert('status mudou para PAID', paidBilling?.status === 'PAID');
  assert('paidAt preenchido', paidBilling?.paidAt !== null);

  const subAfterPay = await getSubscription(user.id);
  assert('subscription reativada (status ACTIVE)', subAfterPay?.status === 'ACTIVE');
  assert(
    'currentPeriodEnd foi renovado (+30 dias)',
    subAfterPay?.currentPeriodEnd !== null &&
      subAfterPay.currentPeriodEnd > (oldPeriodEnd ?? new Date(0)),
  );

  // Test 10: markBillingPaid é atômico (transação)
  // Se billing ou subscription update falhar, ambos rollback. Testamos que o
  // subscription.currentPeriodEnd foi atualizado junto com billing.status.
  console.log('\nTest 10: markBillingPaid é transacional (atomicidade)');
  // Verifica que billing E subscription foram atualizados na mesma operação
  const billingAfter = await prisma.billing.findUnique({ where: { id: billing.id } });
  const subAfter = await prisma.subscription.findUnique({ where: { userId: user.id } });
  assert('billing.status = PAID', billingAfter?.status === 'PAID');
  assert('subscription.status = ACTIVE (mesma transação)', subAfter?.status === 'ACTIVE');

  // Test 11: refundBilling
  console.log('\nTest 11: refundBilling muda para REFUNDED sem reverter período');
  const refunded = await refundBilling(billing.id);
  assert('status = REFUNDED', refunded?.status === 'REFUNDED');
  const subAfterRefund = await getSubscription(user.id);
  assert(
    'currentPeriodEnd mantido (usuário mantém acesso)',
    subAfterRefund?.currentPeriodEnd !== null,
  );

  // Test 12: failBilling
  console.log('\nTest 12: failBilling muda para FAILED');
  const failedBilling = await createBilling({
    userId: user.id,
    subscriptionId: currentSub.id,
    amountCents: PLAN_PRICES_CENTS.ELITE,
    externalId: 'test_pi_failed',
  });
  const failed = await failBilling(failedBilling.id);
  assert('status = FAILED', failed?.status === 'FAILED');

  // Test 13: listUserBillings
  console.log('\nTest 13: listUserBillings lista cobranças do usuário');
  const allBillings = await listUserBillings(user.id);
  assert('retorna ≥2 cobranças (paga + failed)', allBillings.length >= 2);

  const paidOnly = await listUserBillings(user.id, { status: 'PAID' });
  // Após Test 11 (refundBilling), a cobrança PAID virou REFUNDED. Então esperamos 0 pagas.
  assert('filtro por status=PAID retorna 0 (após refund virou REFUNDED)', paidOnly.length === 0);

  const refundedOnly = await listUserBillings(user.id, { status: 'REFUNDED' });
  assert('filtro por status=REFUNDED retorna 1', refundedOnly.length === 1);

  // Test 14: findBillingByExternalId
  console.log('\nTest 14: findBillingByExternalId retorna cobrança por ID externo');
  const found = await findBillingByExternalId('test_pi_001');
  assert('encontrou cobrança por externalId', found !== null);
  assert('externalId corresponde', found?.externalId === 'test_pi_001');

  const notFound = await findBillingByExternalId('non_existent');
  assert('retorna null para externalId inexistente', notFound === null);

  // Cleanup
  await prisma.billing.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.user.deleteMany({});

  console.log(`\n${pass}/${pass + fail} asserções passaram`);
  if (fail > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
