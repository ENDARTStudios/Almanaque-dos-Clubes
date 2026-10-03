@echo on
echo ========================================
echo Executando docker container ls -a
echo ========================================
docker container ls -a
echo.
echo ========================================
echo Executando pg_hba.conf
echo ========================================
docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf
echo.
echo ========================================
echo Executando listar tabelas
echo ========================================
docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\dt"
echo.
echo ========================================
echo FIM
echo ========================================