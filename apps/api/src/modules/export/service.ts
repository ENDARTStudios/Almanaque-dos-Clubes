import { prisma } from '../../config/prisma.js';

export interface ExportOptions {
  format: 'csv' | 'json';
  entityType: 'clubs' | 'players' | 'competitions' | 'rankings';
  filters?: Record<string, string>;
}

export async function exportData(_userId: string, options: ExportOptions): Promise<{ filename: string; data: unknown }> {
  const { format, entityType } = options;
  let data: unknown[];

  switch (entityType) {
    case 'clubs':
      data = await prisma.club.findMany({ orderBy: { name: 'asc' } });
      break;
    case 'players':
      data = await prisma.player.findMany({ orderBy: { fullName: 'asc' } });
      break;
    case 'competitions':
      data = await prisma.competition.findMany({ orderBy: { name: 'asc' } });
      break;
    case 'rankings':
      data = await prisma.ranking.findMany({
        include: { entries: { orderBy: { position: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      });
      break;
    default:
      throw new Error(`Tipo de entidade inválido: ${entityType}`);
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${entityType}-${timestamp}.${format}`;

  if (format === 'json') {
    return { filename, data };
  }

  // CSV — converte primeira linha para headers
  const items = data as Record<string, unknown>[];
  if (items.length === 0) return { filename, data: '' };
  const headers = Object.keys(items[0]!).filter((k) => !k.startsWith('_') && k !== 'passwordHash');
  const csvRows = [headers.join(',')];
  for (const item of items) {
    csvRows.push(headers.map((h) => {
      const v = item[h];
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') ? `"${s}"` : s;
    }).join(','));
  }
  return { filename, data: csvRows.join('\n') };
}
