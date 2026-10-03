$env:DATABASE_URL="postgresql://almanaque:almanaque_dev_2025@127.0.0.1:5432/almanaque?schema=public"
Set-Location "apps\api"
npx prisma db seed --schema=prisma\schema.prisma