import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

function execInherit(cmd, args) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { 
      shell: true, 
      stdio: 'inherit',
      env: process.env
    });
    proc.on('close', (code) => resolve(code));
  });
}

async function main() {
  console.log('\n=========================================');
  console.log('PASSO 1: Alterando método de autenticação');
  console.log('=========================================\n');
  await execInherit('docker', ['exec', 'almanaque-postgres', 'sed', '-i', 's/scram-sha-256/md5/', '/var/lib/postgresql/data/pg_hba.conf']);

  console.log('\n=========================================');
  console.log('PASSO 2: Recarregando configuração');
  console.log('=========================================\n');
  await execInherit('docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', 'SELECT pg_reload_conf();']);

  console.log('\n=========================================');
  console.log('PASSO 3: Conteúdo pg_hba.conf');
  console.log('=========================================\n');
  await execInherit('docker', ['exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf']);

  console.log('\n=========================================');
  console.log('PASSO 6: Listando tabelas');
  console.log('=========================================\n');
  await execInherit('docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', '\\dt']);
  
  console.log('\n=========================================');
  console.log('Concluído!');
  console.log('=========================================');
}

main().catch(e => console.error(e));