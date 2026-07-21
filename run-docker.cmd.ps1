# Script simples
& docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf > pg_hba_out.txt
& docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt" > tables_out.txt

"Conteúdos salvos em pg_hba_out.txt e tables_out.txt"