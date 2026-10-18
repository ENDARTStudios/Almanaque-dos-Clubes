/**
 * WS-C-9 Modo Clube — gates C1–C4 (critériios do Operador, 18-10-2026).
 *
 * Matriz coberta (sem rede/DB — mocks do prisma/RLS, padrão T442):
 *  1. FREE claim                → PLAN_REQUIRED (422)
 *  2. Elite sem evidência       → EVIDENCE_REQUIRED (422)
 *  3. Elite + evidência         → nasce 'pending' (NUNCA 'active')
 *  4. Aprovação                 → 'active' + approvedBy/reviewedBy registrados
 *  5. propose() com posse pending → OWNERSHIP_PENDING_REVIEW
 *  6. propose() com posse active  → auto-aprova (editor que passou por C1–C3)
 *  7. 4ª posse no clube         → CLUB_EDITORS_FULL (1 editor + 3 curadores)
 *  8. Elite perdido             → posse 'suspended' + OWNERSHIP_SUSPENDED
 *  + seleção nacional → MANUAL_CURATION_REQUIRED; renovou Elite → reativa;
 *    revogada → OWNERSHIP_REVOKED; revogar 2× → OWNERSHIP_ALREADY_REVOKED.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Harness de estado em memória + mocks (prisma, RLS, auditoria, cache).
// ---------------------------------------------------------------------------
type OwnershipRow = {
  id: string;
  userId: string;
  clubId: string;
  role: string;
  status: string;
  requestedAt: Date;
  approvedAt: Date | null;
  approvedBy: string | null;
  reviewedBy: string | null;
  evidenceUrl: string | null;
  evidenceNote: string | null;
};

const state = vi.hoisted(() => ({
  club: { id: 'club-1', name: 'Almanaque FC', kind: 'club' } as {
    id: string;
    name: string;
    kind: string;
  },
  ownership: null as OwnershipRow | null,
  occupyingCount: 0, // posses de TERCEIROS (pending/active/suspended) no clube
  subscription: null as {
    plan: string;
    status: string;
    currentPeriodEnd: Date | null;
  } | null,
  description: null as string | null,
  proposalCreated: null as Record<string, unknown> | null,
}));

const eliteActive = (): { plan: string; status: string; currentPeriodEnd: Date } => ({
  plan: 'ELITE',
  status: 'ACTIVE',
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});
const eliteExpired = (): { plan: string; status: string; currentPeriodEnd: Date } => ({
  plan: 'ELITE',
  status: 'ACTIVE',
  currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
});

const mocks = vi.hoisted(() => ({
  auditRecord: vi.fn().mockResolvedValue(undefined),
  cacheInvalidate: vi.fn().mockResolvedValue(undefined),
  notify: vi.fn().mockResolvedValue({ id: 'n-1' }),
}));

vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    club: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.club.id === where.id ? state.club : null,
      ),
      update: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(async () => state.subscription),
    },
    clubOwnership: {
      count: vi.fn(async () => state.occupyingCount),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

// withRlsContext → repassa a transação mockada (o set_config de RLS é no-op aqui).
const tx = vi.hoisted(() => ({
  clubOwnership: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
  club: { update: vi.fn() },
  clubDescriptionProposal: {
    findFirst: vi.fn(async () => null),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      stateHoist.proposalCreated = data;
      return { id: 'prop-1' };
    }),
  },
  $executeRawUnsafe: vi.fn().mockResolvedValue(0),
}));

// Ponte entre o hoisted tx e o estado mutável (vi.hoisted roda antes de `state`).
const stateHoist = vi.hoisted(() => ({ proposalCreated: null as Record<string, unknown> | null }));

vi.mock('../../../src/config/rls-context.js', () => ({
  withRlsContext: vi.fn(async (_opts: unknown, fn: (t: unknown) => Promise<unknown>) => fn(tx)),
}));

vi.mock('../../../src/modules/audit/audit-log.service.js', () => ({
  auditLog: { record: mocks.auditRecord },
  AuditAction: {
    ENTITY_CREATE: 'entity.create',
    ENTITY_UPDATE: 'entity.update',
    ENTITY_DELETE: 'entity.delete',
  },
  EntityType: { CLUB: 'club', USER: 'user' },
}));

vi.mock('../../../src/services/cache.js', () => ({
  cache: { invalidate: mocks.cacheInvalidate },
}));

vi.mock('../../../src/modules/notifications/notification.service.js', () => ({
  createNotification: mocks.notify,
}));

import {
  ownClub,
  updateDescription,
  MAX_OWNERSHIPS_PER_CLUB,
} from '../../../src/modules/clubs/club-ownership.service.js';
import { propose } from '../../../src/modules/clubs/proposals.service.js';
import {
  approveOwnership,
  revokeOwnership,
} from '../../../src/modules/clubs/ownership-moderation.service.js';

function resetOwnership(partial: Partial<OwnershipRow>): void {
  state.ownership = {
    id: 'own-1',
    userId: 'user-1',
    clubId: 'club-1',
    role: 'editor',
    status: 'pending',
    requestedAt: new Date(),
    approvedAt: null,
    approvedBy: null,
    reviewedBy: null,
    evidenceUrl: null,
    evidenceNote: null,
    ...partial,
  };
  tx.clubOwnership.findUnique.mockImplementation(
    async (args: {
      where: { id?: string; userId_clubId?: { userId: string; clubId: string } };
    }) => {
      const o = state.ownership;
      if (!o) return null;
      const key = args?.where ?? {};
      if (key.id) return o.id === key.id ? o : null;
      const k = key.userId_clubId;
      return k && o.userId === k.userId && o.clubId === k.clubId ? o : null;
    },
  );
  tx.clubOwnership.update.mockImplementation(
    async ({ where, data }: { where: { id: string }; data: Partial<OwnershipRow> }) => {
      if (!state.ownership || state.ownership.id !== where.id) throw new Error('ownership ausente');
      Object.assign(state.ownership, data);
      return state.ownership;
    },
  );
  tx.clubOwnership.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      const row: OwnershipRow = {
        id: 'own-new',
        userId: String(data.userId),
        clubId: String(data.clubId),
        role: String(data.role ?? 'editor'),
        status: String(data.status ?? 'pending'),
        requestedAt: new Date(),
        approvedAt: (data.approvedAt as Date | null) ?? null,
        approvedBy: (data.approvedBy as string | null) ?? null,
        reviewedBy: null,
        evidenceUrl: (data.evidenceUrl as string | null) ?? null,
        evidenceNote: (data.evidenceNote as string | null) ?? null,
      };
      state.ownership = row;
      return row;
    },
  );
  tx.clubOwnership.count.mockResolvedValue(state.occupyingCount);
  tx.club.update.mockImplementation(async ({ data }: { data: { userDescription: string } }) => {
    state.description = data.userDescription;
    return { id: 'club-1' };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.club = { id: 'club-1', name: 'Almanaque FC', kind: 'club' };
  state.ownership = null;
  state.occupyingCount = 0;
  state.subscription = null;
  state.description = null;
  stateHoist.proposalCreated = null;
  tx.clubOwnership.count.mockResolvedValue(0);
  tx.clubOwnership.findUnique.mockResolvedValue(null);
  tx.clubOwnership.update.mockResolvedValue({});
  tx.clubOwnership.create.mockResolvedValue({});
  tx.club.update.mockResolvedValue({});
});

describe('WS-C-9 C1 — plano (Elite ativo)', () => {
  it('FREE claim → PLAN_REQUIRED (422)', async () => {
    state.subscription = { plan: 'FREE', status: 'ACTIVE', currentPeriodEnd: null };
    await expect(
      ownClub('user-1', 'club-1', { evidenceNote: 'sou diretor' }),
    ).rejects.toMatchObject({
      code: 'PLAN_REQUIRED',
      statusCode: 422,
    });
  });

  it('Elite expirado (currentPeriodEnd no passado) → PLAN_REQUIRED', async () => {
    state.subscription = eliteExpired();
    await expect(
      ownClub('user-1', 'club-1', { evidenceUrl: 'https://clube.com/diretoria' }),
    ).rejects.toMatchObject({ code: 'PLAN_REQUIRED', statusCode: 422 });
  });

  it('Elite concedido (mesmo changePlan ELITE ativo) vale → nasce pending', async () => {
    state.subscription = eliteActive();
    const result = await ownClub('user-1', 'club-1', { evidenceNote: 'diretor eleito em ata' });
    expect(result).toEqual({ created: true, status: 'pending' });
    // C3: sem aprovação gravada no claim — aprovar é trabalho da moderação.
    const data = (tx.clubOwnership.create.mock.calls[0][0] as { data: Record<string, unknown> })
      .data;
    expect(data.status).toBe('pending');
    expect(data.approvedAt).toBeUndefined();
    expect(data.approvedBy).toBeUndefined();
  });
});

describe('WS-C-9 C2 — evidência de vínculo', () => {
  it('Elite sem evidência → EVIDENCE_REQUIRED (422)', async () => {
    state.subscription = eliteActive();
    await expect(ownClub('user-1', 'club-1', {})).rejects.toMatchObject({
      code: 'EVIDENCE_REQUIRED',
      statusCode: 422,
    });
  });

  it('evidência só com espaços não conta → EVIDENCE_REQUIRED', async () => {
    state.subscription = eliteActive();
    await expect(
      ownClub('user-1', 'club-1', { evidenceUrl: '   ', evidenceNote: '  ' }),
    ).rejects.toMatchObject({ code: 'EVIDENCE_REQUIRED', statusCode: 422 });
  });

  it('Elite + evidência grava evidence* e nasce pending (NUNCA active)', async () => {
    state.subscription = eliteActive();
    const result = await ownClub('user-1', 'club-1', {
      evidenceUrl: 'https://clube.com.br/diretoria',
      evidenceNote: 'sou diretor de comunicação',
    });
    expect(result.status).toBe('pending');
    expect(tx.clubOwnership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'pending',
          evidenceUrl: 'https://clube.com.br/diretoria',
          evidenceNote: 'sou diretor de comunicação',
        }),
      }),
    );
  });
});

describe('WS-C-9 C3 — revisão humana', () => {
  it('aprovação → active + approvedBy/approvedAt/reviewedBy registrados', async () => {
    resetOwnership({ status: 'pending' });
    const updated = await approveOwnership('operador-1', 'own-1');
    expect(updated.status).toBe('active');
    expect(state.ownership?.approvedBy).toBe('operador-1');
    expect(state.ownership?.reviewedBy).toBe('operador-1');
    expect(state.ownership?.approvedAt).toBeInstanceOf(Date);
    expect(mocks.auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'operador-1' }),
    );
    expect(mocks.notify).toHaveBeenCalledWith(
      'user-1',
      'proposal_reviewed',
      expect.objectContaining({ status: 'approved', kind: 'club_ownership' }),
    );
  });

  it('aprovar posse não-pendente → OWNERSHIP_NOT_PENDING (409)', async () => {
    resetOwnership({ status: 'active', approvedBy: 'operador-0', approvedAt: new Date() });
    await expect(approveOwnership('operador-1', 'own-1')).rejects.toMatchObject({
      code: 'OWNERSHIP_NOT_PENDING',
      statusCode: 409,
    });
  });

  it('propose() com posse pending → OWNERSHIP_PENDING_REVIEW (409) e nada publica', async () => {
    state.subscription = eliteActive();
    resetOwnership({ status: 'pending' });
    await expect(propose('user-1', 'club-1', 'texto novo do clube')).rejects.toMatchObject({
      code: 'OWNERSHIP_PENDING_REVIEW',
      statusCode: 409,
    });
    expect(tx.club.update).not.toHaveBeenCalled();
    expect(stateHoist.proposalCreated).toBeNull();
  });
});

describe('WS-C-9 — publicação do editor aprovado (auto-aprovação)', () => {
  it('propose() com posse active + Elite → aplica direto e registra approved', async () => {
    state.subscription = eliteActive();
    resetOwnership({ status: 'active', approvedBy: 'operador-1', approvedAt: new Date() });
    const result = await propose('user-1', 'club-1', '  História viva do clube.  ');
    expect(result).toEqual({ status: 'approved' });
    expect(state.description).toBe('História viva do clube.');
    expect(mocks.cacheInvalidate).toHaveBeenCalledWith('clubs:byId:club-1');
    expect(stateHoist.proposalCreated).toEqual(
      expect.objectContaining({ status: 'approved', proposedBy: 'user-1' }),
    );
  });

  it('updateDescription (PATCH direto) com posse active + Elite → publica', async () => {
    state.subscription = eliteActive();
    resetOwnership({ status: 'active', approvedBy: 'operador-1', approvedAt: new Date() });
    const res = await updateDescription('user-1', 'club-1', 'Texto <b>limpo</b>.');
    expect(res.userDescription).toBe('Texto limpo.');
  });
});

describe('WS-C-9 C1 na publicação — Elite perdido', () => {
  it('propose() com active e Elite expirado → suspende + OWNERSHIP_SUSPENDED, sem apagar histórico', async () => {
    state.subscription = eliteExpired();
    resetOwnership({
      status: 'active',
      approvedBy: 'operador-1',
      approvedAt: new Date(),
      evidenceNote: 'ata da diretoria',
    });
    await expect(propose('user-1', 'club-1', 'texto')).rejects.toMatchObject({
      code: 'OWNERSHIP_SUSPENDED',
      statusCode: 403,
    });
    expect(state.ownership?.status).toBe('suspended');
    // histórico preservado: evidência e aprovação continuam lá
    expect(state.ownership?.evidenceNote).toBe('ata da diretoria');
    expect(state.ownership?.approvedBy).toBe('operador-1');
    expect(tx.club.update).not.toHaveBeenCalled();
  });

  it('Elite renovado: propose() em posse suspensa reativa e publica ("até renovar")', async () => {
    state.subscription = eliteActive();
    resetOwnership({ status: 'suspended', approvedBy: 'operador-1', approvedAt: new Date() });
    const result = await propose('user-1', 'club-1', 'texto após renovar');
    expect(result).toEqual({ status: 'approved' });
    expect(state.ownership?.status).toBe('active');
    // reativação registrada em auditoria
    expect(mocks.auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ resumed: true }),
      }),
    );
  });
});

describe('WS-C-9 C4 — conduta', () => {
  it('4ª posse no clube (1 editor + 3 curadores) → CLUB_EDITORS_FULL (409)', async () => {
    state.subscription = eliteActive();
    state.occupyingCount = MAX_OWNERSHIPS_PER_CLUB;
    tx.clubOwnership.count.mockResolvedValue(state.occupyingCount);
    await expect(
      ownClub('user-1', 'club-1', { evidenceUrl: 'https://clube.com.br/eu' }),
    ).rejects.toMatchObject({ code: 'CLUB_EDITORS_FULL', statusCode: 409 });
  });

  it('revogação com motivo → revoked + stamped em evidenceNote + reviewedBy', async () => {
    resetOwnership({ status: 'active', evidenceNote: 'ata da diretoria' });
    const updated = await revokeOwnership('operador-1', 'own-1', 'conduta abusiva');
    expect(updated.status).toBe('revoked');
    expect(state.ownership?.reviewedBy).toBe('operador-1');
    expect(state.ownership?.evidenceNote).toContain('ata da diretoria'); // preservada
    expect(state.ownership?.evidenceNote).toContain('[revogado');
    expect(state.ownership?.evidenceNote).toContain('conduta abusiva');
    expect(mocks.auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'operador-1',
        metadata: expect.objectContaining({ action: 'revoke', reason: 'conduta abusiva' }),
      }),
    );
  });

  it('revogar posse já revogada → OWNERSHIP_ALREADY_REVOKED (409)', async () => {
    resetOwnership({ status: 'revoked', reviewedBy: 'operador-0' });
    await expect(revokeOwnership('operador-1', 'own-1', 'de novo')).rejects.toMatchObject({
      code: 'OWNERSHIP_ALREADY_REVOKED',
      statusCode: 409,
    });
  });

  it('claim em posse revogada → OWNERSHIP_REVOKED (403)', async () => {
    state.subscription = eliteActive();
    resetOwnership({ status: 'revoked', reviewedBy: 'operador-0' });
    await expect(
      ownClub('user-1', 'club-1', { evidenceNote: 'tentando de volta' }),
    ).rejects.toMatchObject({ code: 'OWNERSHIP_REVOKED', statusCode: 403 });
  });

  it('claim em posse suspensa sem Elite → OWNERSHIP_SUSPENDED (403)', async () => {
    state.subscription = eliteExpired();
    resetOwnership({ status: 'suspended', approvedBy: 'operador-1' });
    await expect(ownClub('user-1', 'club-1')).rejects.toMatchObject({
      code: 'OWNERSHIP_SUSPENDED',
      statusCode: 403,
    });
  });

  it('claim em posse suspensa com Elite renovado → reativa (created: false)', async () => {
    state.subscription = eliteActive();
    resetOwnership({ status: 'suspended', approvedBy: 'operador-1' });
    const result = await ownClub('user-1', 'club-1');
    expect(result).toEqual({ created: false, status: 'active' });
    expect(state.ownership?.status).toBe('active');
  });
});

describe('WS-C-9 — seleção nacional (decisão 4: sem auto-serviço)', () => {
  it('claim em clube kind=national_team → MANUAL_CURATION_REQUIRED (403), mesmo com Elite+evidência', async () => {
    state.club = { id: 'club-1', name: 'Brasil', kind: 'national_team' };
    state.subscription = eliteActive();
    await expect(
      ownClub('user-1', 'club-1', {
        evidenceUrl: 'https://cbf.com.br/comissao',
        evidenceNote: 'membro da comissão',
      }),
    ).rejects.toMatchObject({ code: 'MANUAL_CURATION_REQUIRED', statusCode: 403 });
    expect(tx.clubOwnership.create).not.toHaveBeenCalled();
  });
});
