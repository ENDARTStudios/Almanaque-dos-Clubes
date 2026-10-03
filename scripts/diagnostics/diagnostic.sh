#!/bin/bash
set -e

echo "=== PASSO 1: Alterando método de autenticação para md5 ===" 
docker exec almanaque-postgres sed -i 's/scram-sha-256/md5/' /var/lib/postgresql/data/pg_hba.conf || echo "ERRO no passo 1"

echo ""
echo "=== PASSO 2: Recarregando configuração do PostgreSQL ==="
docker exec almanaque-postgres psql -U almanaque -d almanaque -c "SELECT pg_reload_conf();" || echo "ERRO no passo 2"

echo ""
echo "=== PASSO 3: Conteúdo do pg_hba.conf (grep md5) ==="
docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf | grep md5 || echo "grep não encontrou md5"

echo ""
echo "=== PASSO 4: Executando migration ==="
cd apps/api
DATABASE_URL="postgresql://almanaque:almanaque_dev_2025@127.0.0.1:5432/almanaque?schema=public" npx prisma migrate dev --schema=prisma/schema.prisma --name init --skip-seed || echo "ERRO no passo 4"

echo ""
echo "=== PASSO 5: Executando seed ==="
DATABASE_URL="postgresql://almanaque:almanaque_dev_2025@127.0.0.1:5432/almanaque?schema=public" npx prisma db seed --schema=prisma/schema.prisma || echo "ERRO no passo 5"

echo ""
echo "=== PASSO 6: Listando tabelas ==="
docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt" || echo "ERRO no passo 6"