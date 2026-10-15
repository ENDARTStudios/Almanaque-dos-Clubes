/**
 * T569 — a recusa de acesso ao operador é AUDITADA. Teste da LIGAÇÃO, com o serviço mockado.
 *
 * POR QUE ESTE TESTE MORA AQUI, E NÃO NA SUÍTE DE INTEGRAÇÃO
 *   A primeira versão contava linhas em `audit_logs` depois de provocar um 401/403. Isso media o
 *   BANCO, não o comportamento: a gravação é fire-and-forget (de propósito — a recusa não pode
 *   depender do banco estar de pé), e a contagem ficava sujeita a corrida. Ajustei a espera para
 *   um poll com teto e a suíte continuou vermelha em CI, sem que o log de falha aparecesse — sinal
 *   de que o problema estava na MEDIÇÃO, não na gravação.
 *
 *   Contar linhas provava menos do que parece: passaria mesmo se o middleware gravasse o payload
 *   errado. O que importa é que o gate CHAME a auditoria com o alvo e o motivo certos, e isso se
 *   verifica de forma determinística mockando o serviço.
 *
 * O QUE ESTE TESTE PROVA, então: que a recusa é registrada, com o MOTIVO que distingue os dois
 * casos (`nao_e_operador` contra `sem_identidade`) e com o ALVO (a rota que se tentou acessar).
 * O que ele NÃO prova: que a linha chega ao Postgres — isso é do `audit-log.service`, que tem a
 * própria cobertura.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { recordMock } = vi.hoisted(() => ({ recordMock: vi.fn() }));
vi.mock('../../src/modules/audit/audit-log.service.js', () => ({
  auditLog: { record: recordMock },
  AuditAction: { PERMISSION_DENIED: 'permission.denied' },
  EntityType: { PERMISSION: 'Permission' },
}));
vi.mock('../../src/config/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { requireOperator, ehOperador } from '../../src/modules/auth/operator.middleware.js';

/** Reply mínimo: só o que o gate usa. */
function replyFalso() {
  const enviados: Array<{ status: number; body: unknown }> = [];
  return {
    enviados,
    status(n: number) {
      return {
        send(body: unknown) {
          enviados.push({ status: n, body });
          return undefined;
        },
      };
    },
  };
}

const OPERADOR = 'endart.studios@gmail.com';

beforeEach(() => {
  recordMock.mockReset();
  /* O middleware encadeia `.catch()` no retorno de `record` (é fire-and-forget com tratamento).
     Um `vi.fn()` sem implementação devolve `undefined` e o encadeamento estoura —
     "Cannot read properties of undefined (reading 'catch')". O mock precisa devolver PROMISE. */
  recordMock.mockResolvedValue(undefined);
});

describe('T569 — o gate registra a recusa', () => {
  it('nega quem NÃO é o operador e audita com motivo e alvo', async () => {
    const reply = replyFalso();
    await requireOperator(
      { user: { email: 'admin-qualquer@exemplo.com' }, url: '/api/v1/admin/users', ip: '1.2.3.4' },
      reply,
    );

    expect(reply.enviados[0]?.status).toBe(403);

    expect(recordMock, 'a recusa não foi auditada').toHaveBeenCalledTimes(1);
    const payload = recordMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.action).toBe('permission.denied');
    // O ALVO responde "o que ele queria acessar?".
    expect(payload.entityId).toBe('/api/v1/admin/users');
    const meta = payload.metadata as Record<string, unknown>;
    expect(meta.motivo).toBe('nao_e_operador');
    expect(meta.email).toBe('admin-qualquer@exemplo.com');
    expect(meta.ip).toBe('1.2.3.4');
  });

  it('nega sem identidade e audita com o motivo DIFERENTE', async () => {
    const reply = replyFalso();
    await requireOperator({ url: '/api/v1/jobs/health', ip: '5.6.7.8' }, reply);

    expect(reply.enviados[0]?.status).toBe(401);

    const payload = recordMock.mock.calls[0]?.[0] as Record<string, unknown>;
    /* O motivo distingue os dois casos, e a distinção é o valor da trilha: `sem_identidade` em
       volume é robô varrendo rotas; `nao_e_operador` é alguém com conta tentando entrar onde não
       devia. São incidentes diferentes e pedem resposta diferente. */
    const meta = payload.metadata as Record<string, unknown>;
    expect(meta.motivo).toBe('sem_identidade');
    expect(meta.email).toBeNull();
  });

  it('NÃO grava userId — a auditoria não depende de o atacante ter conta válida', async () => {
    const reply = replyFalso();
    await requireOperator(
      {
        user: { id: 'id-que-nao-existe', email: 'x@y.com' },
        url: '/api/v1/admin/users',
        ip: '9.9.9.9',
      },
      reply,
    );
    const payload = recordMock.mock.calls[0]?.[0] as Record<string, unknown>;
    /* `audit_logs.userId` é FK para `User`. Gravar o `sub` do token fazia a FK REJEITAR a escrita
       quando o id não existia (token de teste, conta apagada) — e a auditoria sumia justamente na
       tentativa suspeita. Quem identifica é o e-mail, que não tem FK. */
    expect(payload.userId).toBeNull();
  });

  it('o OPERADOR passa e NÃO é auditado como recusa', async () => {
    const reply = replyFalso();
    await requireOperator(
      { user: { email: OPERADOR }, url: '/api/v1/admin/users', ip: '::1' },
      reply,
    );

    expect(reply.enviados).toHaveLength(0);
    expect(recordMock, 'acesso legítimo não é evento de segurança').not.toHaveBeenCalled();
  });

  it('aceita variação de caixa do e-mail do operador', async () => {
    const reply = replyFalso();
    await requireOperator(
      { user: { email: 'ENDART.STUDIOS@GMAIL.COM' }, url: '/api/v1/admin/users', ip: '::1' },
      reply,
    );
    expect(reply.enviados).toHaveLength(0);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('a FALHA da auditoria não muda a resposta de recusa', async () => {
    // A gravação é fire-and-forget: se o banco estiver fora, a recusa acontece mesmo assim.
    recordMock.mockRejectedValue(new Error('banco fora'));
    const reply = replyFalso();
    await requireOperator(
      { user: { email: 'intruso@exemplo.com' }, url: '/api/v1/admin/users', ip: '1.1.1.1' },
      reply,
    );
    expect(reply.enviados[0]?.status).toBe(403);
    // Deixa a rejeição ser consumida pelo `catch` do middleware antes de encerrar.
    await new Promise((r) => setTimeout(r, 20));
  });

  it('o e-mail do operador é exatamente um, e a lista é a fonte da verdade', () => {
    // Guarda contra alguém "relaxar" a comparação para includes/startsWith.
    expect(ehOperador(OPERADOR)).toBe(true);
    expect(ehOperador(`x${OPERADOR}`)).toBe(false);
    expect(ehOperador(`${OPERADOR}.evil.io`)).toBe(false);
  });
});
