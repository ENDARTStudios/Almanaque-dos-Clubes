@echo off
echo ========================================
echo PASSO 1: Alterando método de autenticação
echo ========================================
docker exec almanaque-postgres sed -i 's/scram-sha-256/md5/' /var/lib/postgresql/data/pg_hba.conf
echo Exit code: %ERRORLEVEL%

echo.
echo ========================================
echo PASSO 2: Recarregando configuração
echo ========================================
docker exec almanaque-postgres psql -U almanaque -d almanaque -c "SELECT pg_reload_conf();"
echo Exit code: %ERRORLEVEL%

echo.
echo ========================================
echo PASSO 3: Verificando pg_hba.conf
echo ========================================
docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf

echo.
echo ========================================
echo PASSO 4: Listando tabelas
echo ========================================
docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt"