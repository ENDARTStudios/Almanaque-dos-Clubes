# Executar docker exec via job
$job = Start-Job -ScriptBlock { docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf }
Wait-Job $job
Receive-Job $job
Remove-Job $job