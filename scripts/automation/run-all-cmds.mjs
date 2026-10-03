import { exec } from 'child_process/promises';

const cwd = 'd:\\PROJETOS\\Almanaque dos Clubes\\Almanaque dos Clubes';

async function runCommands() {
  const results = {};
  
  // 1. Alterar método de autenticação
  try {
    results.step1 = await exec('docker exec almanaque-postgres sed -i "s/scram-sha-256/md5/" /var/lib/postgresql/data/pg_hba.conf', { cwd });
  } catch (e) {
    results.step1 = { stdout: '', stderr: e.message };
  }
  
  // 2. Recarregar configuração
  try {
    results.step2 = await exec('docker exec almanaque-postgres psql -U almanaque -d almanaque -c "SELECT pg_reload_conf();"', { cwd });
  } catch (e) {
    results.step2 = { stdout: '', stderr: e.message };
  }
  
  // 3. pg_hba.conf
  try {
    results.step3 = await exec('docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf', { cwd });
  } catch (e) {
    results.step3 = { stdout: '', stderr: e.message };
  }
  
  // 4. Listar tabelas
  try {
    results.step4 = await exec('docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\\\\dt"', { cwd });
  } catch (e) {
    results.step4 = { stdout: '', stderr: e.message };
  }
  
  console.log('=== PASSO 1: Alterar método de autenticação ===');
  console.log(results.step1.stdout || '(sem output)');
  console.log(results.step1.stderr || '');
  
  console.log('\\n=== PASSO 2: Recarregar configuração ===');
  console.log(results.step2.stdout || '(sem output)');
  console.log(results.step2.stderr || '');
  
  console.log('\\n=== PASSO 3: pg_hba.conf ===');
  console.log(results.step3.stdout || '(sem output)');
  console.log(results.step3.stderr || '');
  
  console.log('\\n=== PASSO 6: Listar tabelas ===');
  console.log(results.step4.stdout || '(sem output)');
  console.log(results.step4.stderr || '');
}

runCommands();