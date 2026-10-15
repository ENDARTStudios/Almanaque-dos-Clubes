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
import { logger } from '../../config/logger.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';

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
 *
 * T569 — TODA RECUSA É AUDITADA. Antes, uma tentativa de entrar na área restrita com a conta
 * errada devolvia 403 e não deixava rastro nenhum: o Operador não tinha como saber que alguém
 * estava tentando. "Mecanismos de segurança contra ação maliciosa" sem registro de tentativa é
 * meia defesa — a porta está fechada, mas ninguém sabe se alguém está empurrando.
 *
 * O que é gravado é o FATO e o ALVO (rota, IP, motivo), não o conteúdo da requisição. O
 * `audit-log.service` mascara campos sensíveis antes de persistir, e a trilha é append-only.
 */
export async function requireOperator(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = (request as { user?: { id?: string; email?: string } }).user;

  if (!user?.email) {
    registrarRecusa(request, { motivo: 'sem_identidade', email: null });
    await reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Acesso não autorizado' },
    });
    return;
  }

  if (!ehOperador(user.email)) {
    registrarRecusa(request, { motivo: 'nao_e_operador', email: user.email });
    // Genérica de propósito: não revela QUEM pode entrar.
    await reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Acesso restrito ao operador.' },
    });
  }
}

/**
 * Grava a tentativa negada. NUNCA bloqueia nem altera a resposta.
 *
 * Duas razões para ser fire-and-forget com `catch`:
 *   1. **Auditoria não pode derrubar a defesa.** Se o banco estiver fora, a recusa ainda tem de
 *      acontecer — e acontece, porque o `send` não espera por isto.
 *   2. **Latência não é um vetor.** Uma escrita a mais no caminho de recusa não ajuda um atacante;
 *      mas se ela falhar e a requisição cair, o 500 no lugar do 403 já diz a ele que acertou um
 *      caminho interessante.
 *
 * O e-mail entra no `metadata` porque é o que identifica QUEM tentou — sem ele a trilha não serve
 * para nada. Não é dado sensível no sentido de credencial, e o serviço de auditoria mascara
 * qualquer campo de senha/token que apareça.
 */
function registrarRecusa(
  request: FastifyRequest,
  dados: { motivo: string; email: string | null },
): void {
  const rota = String((request as { url?: string }).url ?? '').split('?')[0];
  const ip = String((request as { ip?: string }).ip ?? '');

  void auditLog
    .record({
      entityType: EntityType.PERMISSION,
      // O ALVO é a rota que se tentou acessar — é o que responde "o que ele queria?".
      entityId: rota || 'rota-desconhecida',
      action: AuditAction.PERMISSION_DENIED,
      /* `userId: null` DELIBERADAMENTE, e não o `sub` do token.
       *
       * `audit_logs.userId` é chave estrangeira para `User`. O `sub` vem do JWT e pode apontar para
       * um usuário que NÃO EXISTE (token de teste, conta apagada) — e nesse caso a FK REJEITA a
       * escrita, a trilha fica sem o registro, e a auditoria some justamente na tentativa suspeita.
       *
       * Descoberto no CI: os dois testes de auditoria falhavam porque a gravação estourava e o
       * `catch` engolia em silêncio.
       *
       * Um registro de segurança não pode depender de o atacante ter conta válida. Quem identifica
       * é o `metadata.email`, que vem do token e não tem FK nenhuma. */
      userId: null,
      metadata: {
        motivo: dados.motivo,
        rota,
        ip,
        email: dados.email,
      },
    })
    .catch((err: unknown) => {
      /* Falha de auditoria não pode virar erro visível: a recusa já foi enviada. O log estruturado
         do processo registra a falha para investigação. */
      /* O `err.message` entrou depois de um episodio em que a auditoria falhava em silencio e o
         log so dizia "falhou" — sem a causa, a investigacao comecava do zero. Um log de falha
         que nao diz POR QUE falhou e meio log. */
      logger.error(
        { rota, motivo: dados.motivo, err: (err as Error)?.message },
        'falha ao auditar recusa de acesso ao operador',
      );
    });
}
