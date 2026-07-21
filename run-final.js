const { spawn } = require('child_process');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: true });
    let out = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => out += d);
    proc.on('close', code => {
      console.log(`[${cmd}] Exit:`, code);
      console.log(out);
      resolve({ code, out });
    });
  });
}

async function main() {
  // 1. pg_hba.conf
  console.log('\n=== PASSO 1: pg_hba.conf ===');
  await run('docker', ['exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf']);
  
  // 2. Alterar para md5
  console.log('\n=== PASSO 2: Alterando para md5 ===');
  await run('docker', ['exec', 'almanaque-postgres', 'sed', '-i', 's/scram-sha-256/md5/', '/var/lib/postgresql/data/pg_hba.conf']);
  
  // 3. Recarregar
  console.log('\n=== PASSO 3: Recarregando ===');
  await run('docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', 'SELECT pg_reload_conf();']);
  
  // 4. Verificar md5
  console.log('\n=== PASSO 3 (confirmação): pg_hba.conf com md5 ===');
  await run('docker', ['exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf']);
  
  // 5. Listar tabelas
  console.log('\n=== PASSO 6: Listando tabelas ===');
  await run('docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', '\\dt']);
}

main().catch(console.error);