/**
 * T470 — Repositório do módulo legal. Todas as operações recebem um
 * `Prisma.TransactionClient` (tx) para rodar dentro de `withRlsContext`.
 */
import type { Prisma } from '@prisma/client';
import type { CreateRightsRequestInput } from './schema.js';

export type Tx = Prisma.TransactionClient;

export const legalRepository = {
  // ----- Direitos do titular -----
  createDsr(
    tx: Tx,
    data: {
      protocol: string;
      userId: string;
      type: CreateRightsRequestInput['type'];
      jurisdiction: CreateRightsRequestInput['jurisdiction'];
      description: string | null;
      requestedFields: string[] | null;
      deadlineAt: Date;
    },
  ) {
    return tx.dataSubjectRequest.create({
      data: {
        protocol: data.protocol,
        userId: data.userId,
        type: data.type,
        jurisdiction: data.jurisdiction,
        description: data.description,
        requestedFields: data.requestedFields ?? undefined,
        deadlineAt: data.deadlineAt,
      },
    });
  },

  findDsrByProtocol(tx: Tx, protocol: string) {
    return tx.dataSubjectRequest.findUnique({ where: { protocol } });
  },

  listDsrByUser(tx: Tx, userId: string) {
    return tx.dataSubjectRequest.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },

  updateDsr(tx: Tx, id: string, data: Prisma.DataSubjectRequestUpdateInput) {
    return tx.dataSubjectRequest.update({ where: { id }, data });
  },

  listDsrAdmin(
    tx: Tx,
    filter: {
      status?: string;
      type?: string;
      jurisdiction?: string;
      limit: number;
      offset: number;
    },
  ) {
    return tx.dataSubjectRequest.findMany({
      where: {
        status: filter.status as never,
        type: filter.type as never,
        jurisdiction: filter.jurisdiction as never,
      },
      orderBy: { createdAt: 'desc' },
      take: filter.limit,
      skip: filter.offset,
    });
  },

  // ----- Notificação autoral -----
  createNotice(
    tx: Tx,
    data: {
      protocol: string;
      userId: string;
      type: 'infringement_notice' | 'counter_notice';
      originalNoticeId?: string | null;
      workTitle: string;
      workUrl?: string | null;
      materialUrl: string;
      description: string;
      goodFaithDeclaration: boolean;
      accuracyDeclaration: boolean;
      signatureText: string;
      jurisdiction: 'BR' | 'EEA_UK' | 'OTHER';
    },
  ) {
    return tx.copyrightNotice.create({ data });
  },

  findNoticeByProtocol(tx: Tx, protocol: string) {
    return tx.copyrightNotice.findUnique({ where: { protocol } });
  },

  listNoticesByUser(tx: Tx, userId: string) {
    return tx.copyrightNotice.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },

  updateNotice(tx: Tx, id: string, data: Prisma.CopyrightNoticeUpdateInput) {
    return tx.copyrightNotice.update({ where: { id }, data });
  },

  listNoticesAdmin(
    tx: Tx,
    filter: { status?: string; type?: string; limit: number; offset: number },
  ) {
    return tx.copyrightNotice.findMany({
      where: { status: filter.status as never, type: filter.type as never },
      orderBy: { createdAt: 'desc' },
      take: filter.limit,
      skip: filter.offset,
    });
  },

  // ----- Exportação pessoal (somente do próprio titular) -----
  async gatherPersonalData(tx: Tx, userId: string) {
    const [account, subscription, billings, favorites, sessions, requests, notices] =
      await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
          },
        }),
        tx.subscription.findUnique({
          where: { userId },
          select: {
            plan: true,
            status: true,
            startedAt: true,
            cancelledAt: true,
            currentPeriodEnd: true,
          },
        }),
        tx.billing.findMany({
          where: { userId },
          select: {
            amountCents: true,
            currency: true,
            status: true,
            paidAt: true,
            externalId: true,
            createdAt: true,
          },
        }),
        tx.favorite.findMany({
          where: { userId },
          select: { clubId: true, notificationsActive: true, createdAt: true, deletedAt: true },
        }),
        // Metadata de sessão SEGURA (sem tokenHash/ipAddress).
        tx.session.findMany({
          where: { userId },
          select: { id: true, userAgent: true, createdAt: true, expiresAt: true, revokedAt: true },
        }),
        tx.dataSubjectRequest.findMany({
          where: { userId },
          select: { protocol: true, type: true, status: true, createdAt: true, deadlineAt: true },
        }),
        tx.copyrightNotice.findMany({
          where: { userId },
          select: { protocol: true, type: true, status: true, createdAt: true },
        }),
      ]);
    return { account, subscription, billings, favorites, sessions, requests, notices };
  },
};
