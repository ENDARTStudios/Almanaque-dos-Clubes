// T471 onda 1 — cache cirúrgico: inventário via SCAN (match clubs:*), DEL por chave exata.
// Sem FLUSHALL/FLUSHDB. Nunca imprime valores, só contagens e chaves.
const Redis = require('ioredis');
const url = process.env.REDIS_URL;
if (!url) {
  console.error('REDIS_URL ausente');
  process.exit(1);
}
const r = new Redis(url);
(async () => {
  const keys = [];
  for (const pattern of ['clubs:*', 'geo:*']) {
    let cursor = '0';
    do {
      const [next, batch] = await r.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
  }
  const uniq = [...new Set(keys)];
  const geoStats = uniq.filter((k) => k === 'clubs:geo-stats').length;
  const geoById = uniq.filter((k) => k.startsWith('clubs:geo:')).length;
  const lists = uniq.filter((k) => k.startsWith('clubs:list')).length;
  let deleted = 0;
  for (const k of uniq) {
    const n = await r.del(k);
    deleted += n;
  }
  console.log(
    `CACHE_CLEAR inventario=${uniq.length} (geo-stats=${geoStats} geo-by-id=${geoById} list=${lists}) deletadas=${deleted}`,
  );
  r.disconnect();
})().catch((e) => {
  console.error('CACHE_CLEAR FALHOU:', (e && e.message) || String(e));
  r.disconnect();
  process.exit(1);
});
