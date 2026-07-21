# Executar comandos Docker e salvar saída

# Alterar método de autenticação
docker exec almanaque-postgres sed -i 's/scram-sha-256/md5/' /var/lib/postgresql/data/pg_hba.conf

# Recarregar configuração
docker exec almanaque-postgres psql -U almanaque -d almanaque -c "SELECT pg_reload_conf();"

# pg_hba.conf (para confirmar md5)
$pgHbaOutput = docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf

# Listar tabelas
$tablesOutput = docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt"

# Salvar resultados
$pgHbaOutput | Out-File -FilePath "pg_hba_result.txt" -Encoding utf8
$tablesOutput | Out-File -FilePath "tables_result.txt" -Encoding utf8

"Passos concluídos"