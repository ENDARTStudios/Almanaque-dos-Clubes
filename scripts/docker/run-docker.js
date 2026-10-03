const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('=== PASSO 1: Alterando método de autenticação ===');
  const result1 = execSync('docker exec almanaque-postgres sed -i "s/scram-sha-256/md5/" /var/lib/postgresql/data/pg_hba.conf', { encoding: 'utf8' });
  console.log(result1 || 'Comando executado');
  
  console.log('\n=== PASSO 2: Recarregando configuração ===');
  const result2 = execSync('docker exec almanaque-postgres psql -U almanaque -d almanaque -c "SELECT pg_reload_conf();"', { encoding: 'utf8' });
  console.log(result2);
  
  console.log('\n=== PASSO 3: pg_hba.conf (grep md5) ===');
  const result3 = execSync('docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf', { encoding: 'utf8' });
  console.log(result3);
  console.log('\n--- Linhas com md5: ---');
  result3.split('\n').filter(l => l.includes('md5')).forEach(l => console.log(l));
  
  console.log('\n=== PASSO 6: Listando tabelas ===');
  const result6 = execSync('docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\\dt"', { encoding: 'utf8' });
  console.log(result6);
  
} catch (err) {
  console.error('Erro:', err.message);
}