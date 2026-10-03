# Script completo de diagnóstico

# Cria arquivo de log
$logFile = "diagnostic-log.txt"
"" | Out-File $logFile

# Função para logar
function Log-Output {
    param($Label, $Command)
    Add-Content $logFile "=========================================="
    Add-Content $logFile $Label
    Add-Content $logFile "=========================================="
    $result = Invoke-Expression $Command 2>&1
    Add-Content $logFile $result
    Add-Content $logFile ""
}

# Passo 1: Alterar método de autenticação
Log-Output "PASSO 1: Alterando método de autenticação para md5" "docker exec almanaque-postgres sed -i 's/scram-sha-256/md5/' /var/lib/postgresql/data/pg_hba.conf"

# Passo 2: Recarregar configuração
Log-Output "PASSO 2: Recarregando configuração do PostgreSQL" "docker exec almanaque-postgres psql -U almanaque -d almanaque -c 'SELECT pg_reload_conf();'"

# Passo 3: Confirmar alteração
Log-Output "PASSO 3: Conteúdo do pg_hba.conf" "docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf"

# Passo 4: Verificar Prisma
Log-Output "PASSO 4: Verificando Prisma" "Get-ChildItem -Recurse -Path node_modules\.bin -Filter prisma.cmd 2>`$null"

# Passo 5: Executar migration
$env:DATABASE_URL="postgresql://almanaque:almanaque_dev_2025@127.0.0.1:5432/almanaque?schema=public"
Set-Location "apps\api"
Log-Output "PASSO 5: Executando migration" "npx prisma migrate dev --schema=prisma\schema.prisma --name init --skip-seed"

# Passo 6: Executar seed
Log-Output "PASSO 6: Executando seed" "npx prisma db seed --schema=prisma\schema.prisma"

# Passo 7: Listar tabelas
Log-Output "PASSO 7: Listando tabelas" "docker exec almanaque-postgres psql -U almanaque -d almanaque -c '\dt'"

# Mostrar log
Write-Host "Exibindo log:"
Get-Content $logFile