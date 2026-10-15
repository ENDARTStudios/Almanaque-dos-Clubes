/**
 * T565 — GATE DE OPERADOR: só o dono do site acessa as superfícies internas.
 *
 * POR QUE ISTO EXISTE, ALÉM DO `requireRole('admin')`
 *   O `requireRole` responde "este usuário tem o PAPEL admin?". Isso é necessário e não é
 *   suficiente: qualquer conta que receba o papel `admin` — por engano, por escalada de
 *   privilégio, por um seed mal configurado, ou por uma rota de atribuição de papel mal
 *   protegida — passa a ver gestão de usuários, fila de ingestão, logs e dados operacionais.
 *
 *   Este gate responde uma pergunta diferente e mais restrita: "este usuário É o operador?".
 *   A identificação é por E-MAIL, e não por papel, porque o e-mail é a identidade que o
 *   Operador controla diretamente. Papel é autorização; e-mail é quem a pessoa é.
 *
 * AS DUAS PROPRIEDADES QUE IMPORTAM
 *
 * 1. **FALHA SEGURA (fail-closed).** Sem configuração de operador, ninguém passa — 403. O
 *    contrário (liberar quando falta configuração) é o erro clássico: a variável de ambiente não
 *    chega em produção, e a superfície interna fica aberta exatamente no ambiente que importa.
 *    Um gate que abre por omissão não é um gate.
 *
 * 2. **A COMPARAÇÃO É EXATA E INSENSÍVEL A CAIXA, e nunca por prefixo ou domínio.** Comparar
 *    domínio (`@gmail.com`) ou usar `includes` deixaria entrar `endart.studios@gmail.com.evil.io`
 *    ou `xendart.studios@gmail.com`. A normalização é `trim().toLowerCase()` dos DOIS lados, e a
 *    igualdade é estrita.
 *
 * O E-MAIL DO OPERADOR NÃO VAI NO CORPO DA RESPOSTA. A mensagem de recusa é genérica de
 * propósito: dizer "só X pode acessar" entrega a um atacante o alvo exato a tentar comprometer.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env.js';

/** Allowlist do operador, vinda do config central (`env.operatorEmails`). */
function operadores(): string[] {
  return env.operatorEmails;
}

/** Exportada para teste: a decisão de autorização, isolada do Fastify. */
export function ehOperador(email: string | null | undefined): boolean {
  if (!email) return false;
  const permitidos = operadores();
  if (permitidos.length === 0) return false; // fail-closed
  return permitidos.includes(email.trim().toLowerCase());
}

/**
 * PreHandler que exige OPERADOR (não apenas `admin`).
 *
 * Ordem de uso: `[authenticate, requireRole('admin'), requireOperator]`. O `authenticate` roda
 * primeiro e popula `request.user`; sem ele este gate não tem e-mail para olhar e recusa por falta
 * de identidade — o que é o comportamento correto, e não uma brecha.
 *
 * Os dois gates são complementares e nenhum substitui o outro: o papel responde "pode exercer a
 * função admin?", o operador responde "é o dono?". Exigir ambos é mais estrito que exigir um.
 */
export async function requireOperator(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = (request as { user?: { email?: string } }).user;

  if (!user?.email) {
    await reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Acesso não autorizado' },
    });
    return;
  }

  if (!ehOperador(user.email)) {
    // Genérica de propósito: não revela QUEM pode entrar.
    await reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Acesso restrito ao operador.' },
    });
  }
}
