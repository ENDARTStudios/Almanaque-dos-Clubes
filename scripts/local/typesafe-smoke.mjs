// Smoke test da integração TypeSafe (Jev / System One).
// Carrega TYPESAFE_API_KEY do .env e faz UMA chamada mínima de julgamento.
// Nunca imprime a chave nem o conteúdo do .env.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    console.error('ERRO: .env não encontrado em', path);
    process.exit(1);
  }
}
loadEnv(join(root, '.env'));

const key = process.env.TYPESAFE_API_KEY;
if (!key) {
  console.error('TYPESAFE_API_KEY: NAO DEFINIDA no .env');
  process.exit(1);
}
console.log(`TYPESAFE_API_KEY: definida (${key.length} chars)`);

const body = {
  state:
    'Clube "Athletic Club" cadastrado com cidade Bilbao, país ES, fundação 1898. ' +
    'Clube "Atlético de Madrid" cadastrado com cidade Madrid, país ES, fundação 1903.',
  model: 'jev-latest',
  questions: {
    sao_mesmo_clube: {
      type: 'noul',
      instructions:
        'Os dois registros listados em `state` descrevem o mesmo clube de futebol? ' +
        'Considere nome, cidade e fundação.',
      criteria: {
        true: 'Registros distintos que apontam para clubes diferentes.',
        false: 'Registros que apontam para o mesmo clube (duplicidade).',
      },
    },
  },
};

const res = await fetch('https://api.typesafe.ai/v1/systemone', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

console.log('HTTP status:', res.status);
if (!res.ok) {
  const text = await res.text();
  console.error('Falha na chamada:', text.slice(0, 500));
  process.exit(1);
}
const data = await res.json();
console.log('model:', data.model);
console.log('answers:', JSON.stringify(data.answers, null, 2));
console.log('usage:', JSON.stringify(data.usage));
console.log('SMOKE OK');
