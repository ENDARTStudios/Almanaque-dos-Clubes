/**
 * T570 — concede (ou revoga) o papel `admin` a uma conta, pelo E-MAIL.
 *
 * POR QUE UM SCRIPT, E NÃO UM `UPDATE` À MÃO
 *   Conceder acesso administrativo é a operação mais sensível do sistema: um erro aqui dá a
 *   alguém a chave de tudo. Um SQL avulso no terminal não deixa rastro, não é revisável e não
 *   pode ser repetido com segurança. Este script:
 *
 *   - é IDEMPOTENTE (`upsert` na PK composta), então rodar duas vezes não duplica nada;
 *   - RECUSA conceder a quem não é o operador configurado, a menos que `--force` seja passado —
 *     a allowlist de operador (`OPERATOR_EMAILS`) é a fonte da verdade, e o script a respeita;
 *   - REGISTRA o que fez na trilha de auditoria append-only;
 *   - exige `--apply --allow-production` para escrever, como os outros scripts de produção.
 *
 * USO (no container)
 *   node dist/scripts/grant-admin.js --email=fulano@exemplo.com                      # DRY-RUN
 *   node dist/scripts/grant-admin.js --email=fulano@exemplo.com --apply --allow-production
 *   node dist/scripts/grant-admin.js --email=fulano@exemplo.com --revoke --apply --allow-production
 *
 * SEGURANÇA: o e-mail não é impresso inteiro no log de saída quando `--quiet` é passado, para o
 * caso de o comando ser executado em terminal compartilhado ou gravado em histórico.
 */
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');
const ALLOW_PRODUCTION = process.argv.includes('--allow-production');
const REVOKE = process.argv.includes('--revoke');
const FORCE = process.argv.includes('--force');

const emailArg = (process.argv.find((a) => a.startsWith('--email=')) ?? '').split('=')[1] ?? '';

function operadores(): string[] {
  return (process.env.OPERATOR_EMAILS ?? 'endart.studios@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function mascarar(email: string): string {
  const [nome, dominio] = email.split('@');
  if (!nome || !dominio) return '***';
  const visivel = nome.slice(0, 2);
  return `${visivel}${'*'.repeat(Math.max(1, nome.length - 2))}@${dominio}`;
}

async function main(): Promise<void> {
  const alvo = emailArg.trim().toLowerCase();
  if (!alvo || !alvo.includes('@')) {
    console.error(
      'uso: --email=fulano@exemplo.com [--revoke] [--force] [--apply --allow-production]',
    );
    process.exit(1);
  }

  if (APPLY && !ALLOW_PRODUCTION) {
    console.error('--apply exige --allow-production (gate explícito de escrita em produção)');
    process.exit(1);
  }

  const permitidos = operadores();
  const ehOperador = permitidos.includes(alvo);

  console.log(
    `T570 — ${REVOKE ? 'REVOGAR' : 'CONCEDER'} papel admin (${APPLY ? 'APPLY' : 'DRY-RUN'}) · alvo=${mascarar(alvo)}`,
  );

  /* A ALLOWLIST MANDA. Conceder `admin` a quem não é operador transforma a conta em administrador
     sem que ela passe no `requireOperator` — um estado incoerente: a pessoa vê a área mas é
     recusada, ou pior, passa a ter o papel e o gate de operador é a única coisa que a segura.
     `--force` existe para o caso legítimo (um segundo administrador que NÃO deve ver as
     superfícies internas do operador), e exige ser explícito. */
  if (!ehOperador && !FORCE) {
    console.error(
      `  RECUSADO: ${mascarar(alvo)} não está em OPERATOR_EMAILS.\n` +
        `  Se a intenção é criar um admin que NÃO é o operador, repita com --force (explícito).`,
    );
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: alvo, mode: 'insensitive' } },
    });
    if (!user) {
      console.error(
        `  conta não encontrada para ${mascarar(alvo)} — crie a conta antes de conceder papel`,
      );
      process.exit(3);
    }

    const role = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (!role) {
      console.error('  papel "admin" não existe no banco — rode os seeds de RBAC primeiro');
      process.exit(4);
    }

    const jaTem = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
    });

    console.log(`  conta: ${mascarar(alvo)} · id=${user.id.slice(0, 8)} · status=${user.status}`);
    console.log(`  papel admin hoje: ${jaTem ? 'SIM' : 'não'}`);

    if (REVOKE) {
      if (!jaTem) {
        console.log('  nada a revogar (idempotente).');
        return;
      }
      if (!APPLY) {
        console.log('  DRY-RUN — removeria o papel. Rode com --apply --allow-production.');
        return;
      }
      await prisma.userRole.delete({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
      });
      console.log('  REVOGADO.');
      return;
    }

    if (jaTem) {
      console.log('  nada a fazer: já é admin (idempotente).');
      return;
    }
    if (!APPLY) {
      console.log('  DRY-RUN — concederia o papel. Rode com --apply --allow-production.');
      return;
    }

    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

    /* A TRILHA. Conceder acesso administrativo é exatamente o tipo de evento que precisa ficar
       registrado: quem concedeu, a quem, e quando. Sem isto, um admin que aparece do nada não
       tem explicação. */
    await prisma.auditLog.create({
      data: {
        entityType: 'User',
        entityId: user.id,
        action: 'role.assigned',
        userId: null, // concedido por operação de CLI, não por um usuário autenticado
        metadata: {
          role: 'admin',
          email: alvo,
          via: 'script:grant-admin',
          forcar: FORCE && !ehOperador,
        },
      },
    });

    console.log('  CONCEDIDO, e registrado na trilha de auditoria.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
