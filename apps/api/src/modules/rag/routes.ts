import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const ragRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/ai/ask', async (request, reply) => {
    const { question } = request.body as { question?: string };
    if (!question) return reply.status(422).send({ error: { code: 'VALIDATION_ERROR', message: 'Pergunta é obrigatória' } });
    return reply.send({
      data: { answer: `[RAG pendente] Sua pergunta: "${question}"`, citations: [], model: 'ollama/bge-m3' },
    });
  });
};
