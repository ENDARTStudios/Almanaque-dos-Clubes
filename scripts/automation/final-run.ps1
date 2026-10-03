# Executar todos os comandos e salvar saída

# Usar Start-Process para capturar saída
$process = Start-Process -FilePath "docker" -ArgumentList "exec","almanaque-postgres","cat","/var/lib/postgresql/data/pg_hba.conf" -NoNewWindow -Wait -RedirectStandardOutput "pg_hba_result.txt" -RedirectStandardError "pg_hba_error.txt" -PassThru

Get-Content "pg_hba_result.txt"
Get-Content "pg_hba_error.txt"