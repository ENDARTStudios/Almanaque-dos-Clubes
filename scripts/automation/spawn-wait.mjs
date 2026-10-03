import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

function execAndWait(cmd, args) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { shell: true, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', d => stdout += d.toString());
    proc.stderr?.on('data', d => stderr += d.toString());
    proc.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

async function main() {
  console.log('=== PASSO 1: Alterando método de autenticação ===');
  const r1 = await execAndWait('docker', ['exec', 'almanaque-postgres', 'sed', '-i', 's/scram-sha-256/md5/', '/var/lib/postgresql/data/pg_hba.conf']);
  console.log('Exit code:', r1.code);
  console.log('Output:', r1.stdout || '(vazio)');
  console.log('Error:', r1.stderr || '(vazio)');

  console.log('\n=== PASSO 2: Recarregando configuração ===');
  const r2 = await execAndWait('docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', 'SELECT pg_reload_conf();']);
  console.log('Exit code:', r2.code);
  console.log('Output:', r2.stdout || '(vazio)');

  console.log('\n=== PASSO 3: pg_hba.conf ===');
  const r3 = await execAndWait('docker', ['exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf']);
  console.log('Exit code:', r3.code);
  console.log('Output:', r3.stdout || '(vazio)');
  
  // Salvar conteúdo
  writeFileSync('STEP1-pg_hba.conf.txt', r3.stdout || '');
  
  console.log('\n=== PASSO 6: Tabelas ===');
  const r4 = await execAndWait('docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', '\\dt']);
  console.log('Exit code:', r4.code);
  console.log('Output:', r4.stdout || '(vazio)');
  
  // Salvar tabelas
  writeFileSync('STEP6-tables.txt', r4.stdout || '');
  
  console.log('\nArquivos salvos!');
}

main();