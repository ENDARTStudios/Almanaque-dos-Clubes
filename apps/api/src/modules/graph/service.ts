import { prisma } from '../../config/prisma.js';
import type { GraphEdge } from '@almanaque/domain';

export const graphService = {
  async addEdge(data: { sourceId: string; sourceType: string; targetId: string; targetType: string; relation: string; metadata?: Record<string, unknown> }): Promise<GraphEdge> {
    return prisma.knowledgeGraph.create({
      data: { ...data, metadata: data.metadata ?? undefined },
    }) as Promise<GraphEdge>;
  },
  async getEdgesForEntity(entityId: string, entityType: string): Promise<GraphEdge[]> {
    return prisma.knowledgeGraph.findMany({
      where: { OR: [{ sourceId: entityId, sourceType: entityType }, { targetId: entityId, targetType: entityType }] },
    }) as Promise<GraphEdge[]>;
  },
  async getGraph(): Promise<GraphEdge[]> {
    return prisma.knowledgeGraph.findMany({ take: 500, orderBy: { createdAt: 'desc' } }) as Promise<GraphEdge[]>;
  },
};
