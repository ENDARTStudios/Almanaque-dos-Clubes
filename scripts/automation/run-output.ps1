# Executar comandos e salvar saída

# pg_hba.conf
$output1 = docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf
$output1 | Out-File -FilePath "pg_hba_result.txt" -Encoding utf8
Write-Host "pg_hba.conf salvo em pg_hba_result.txt"

# tabelas
$output2 = docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt"
$output2 | Out-File -FilePath "tables_result.txt" -Encoding utf8
Write-Host "Tabelas salvas em tables_result.txt"