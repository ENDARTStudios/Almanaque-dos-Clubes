const { execSync } = require('child_process');

process.env.DATABASE_URL = 'postgresql://almanaque:almanaque_dev_2025@127.0.0.1:5432/almanaque?schema=public';

try {
  console.log('=== Executando Prisma migration ===');
  const result = execSync('npx prisma migrate dev --schema=apps/api/prisma/schema.prisma --name init --skip-seed', { 
    encoding: 'utf8',
    cwd: 'd:\\PROJETOS\\Almanaque dos Clubes\\Almanaque dos Clubes',
    stdio: 'pipe'
  });
  console.log(result);
} catch (err) {
  console.error('Erro:', err.message);
  if (err.stdout) console.log('STDOUT:', err.stdout);
  if (err.stderr) console.log('STDERR:', err.stderr);
}