import { prisma } from '../../config/prisma.js';
import type { GraphEdge } from '@almanaque/domain';

const isSQLite = process.env.PRISMA_SCHEMA_PROVIDER === 'sqlite';

export const graphService = {
  async addEdge(data: {
    sourceId: string;
    sourceType: string;
    targetId: string;
    targetType: string;
    relation: string;
    metadata?: Record<string, unknown>;
  }): Promise<GraphEdge> {
    const metaValue = data.metadata
      ? isSQLite
        ? JSON.stringify(data.metadata)
        : data.metadata
      : null;
    return prisma.knowledgeGraph.create({
      data: {
        sourceId: data.sourceId,
        sourceType: data.sourceType,
        targetId: data.targetId,
        targetType: data.targetType,
        relation: data.relation,
        metadata: metaValue as never,
      },
    }) as Promise<GraphEdge>;
  },
  async getEdgesForEntity(entityId: string, entityType: string): Promise<GraphEdge[]> {
    return prisma.knowledgeGraph.findMany({
      where: {
        OR: [
          { sourceId: entityId, sourceType: entityType },
          { targetId: entityId, targetType: entityType },
        ],
      },
    }) as Promise<GraphEdge[]>;
  },
  async getGraph(): Promise<GraphEdge[]> {
    return prisma.knowledgeGraph.findMany({ take: 500, orderBy: { createdAt: 'desc' } }) as Promise<
      GraphEdge[]
    >;
  },
};
