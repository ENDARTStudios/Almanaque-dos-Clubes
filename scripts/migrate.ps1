# =============================================================================
# Almanaque dos Clubes — Script de Migration (Windows / PowerShell)
# =============================================================================
# Aplica, em ordem:
#   1. Extensões PostgreSQL (uuid-ossp, pgcrypto, pg_trgm)
#   2. Migration Prisma consolidada (10 tabelas + 12 índices)
#   3. Seed expandido (10 clubes BR, 3 competições, 2 rankings, 3 roles, 18 perms)
#   4. Índices full-text (GIN + trigram + triggers)
#
# Uso:
#   pwsh ./scripts/migrate.ps1
#
# Verificação pós-migration:
#   pwsh ./scripts/verify-migration.ps1
# =============================================================================

#Requires -Version 7.0
[CmdletBinding()]
param(
    [string]$SchemaPath = "apps/api/prisma/schema.prisma",
    [switch]$SkipSeed = $false,
    [switch]$SkipFulltext = $false,
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
Set-Location -Path (Split-Path -Parent -Path $PSScriptRoot)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Almanaque dos Clubes — Migration Script" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------------------------
# 0. Verificações prévias
# -----------------------------------------------------------------------------

Write-Host "[0/5] Verificações prévias..." -ForegroundColor Yellow

# 0.1 DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Error "DATABASE_URL não definida. Defina antes de rodar:"
    Write-Host "  `$env:DATABASE_URL = 'postgresql://almanaque:almanaque_dev_2025@localhost:5432/almanaque?schema=public'"
    exit 1
}
Write-Host "  ✓ DATABASE_URL definida" -ForegroundColor Green

# 0.2 Docker Postgres rodando (se DATABASE_URL aponta para localhost)
if ($env:DATABASE_URL -match "localhost|127\.0\.0\.1") {
    $dockerRunning = docker ps --filter "name=almanaque-postgres" --format "{{.Names}}" 2>$null
    if (-not $dockerRunning) {
        Write-Warning "Container Docker 'almanaque-postgres' não encontrado."
        Write-Host "  Inicie com: docker compose up -d postgres"
        Write-Host "  Ou ajuste DATABASE_URL para apontar para outro servidor."
        if (-not $DryRun) {
            exit 1
        }
    } else {
        Write-Host "  ✓ Container Docker almanaque-postgres rodando" -ForegroundColor Green
    }
}

# 0.3 pnpm instalado
$pnpmVersion = (pnpm --version) 2>$null
if (-not $pnpmVersion) {
    Write-Error "pnpm não encontrado. Instale com: npm install -g pnpm"
    exit 1
}
Write-Host "  ✓ pnpm $pnpmVersion" -ForegroundColor Green

# 0.4 Dependências instaladas
if (-not (Test-Path "node_modules/@prisma/client")) {
    Write-Host "  Instalando dependências..." -ForegroundColor Yellow
    if (-not $DryRun) {
        pnpm install --frozen-lockfile
    }
}
Write-Host "  ✓ node_modules presente" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 1. Extensões PostgreSQL
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "[1/5] Aplicando extensões PostgreSQL (uuid-ossp, pgcrypto, pg_trgm)..." -ForegroundColor Yellow
$extensionsFile = "apps/api/prisma/extensions.sql"
if (-not (Test-Path $extensionsFile)) {
    Write-Error "Arquivo não encontrado: $extensionsFile"
    exit 1
}
if (-not $DryRun) {
    # Tenta aplicar via psql; se não estiver disponível, mostra o SQL para aplicar manualmente
    $psqlAvailable = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlAvailable) {
        psql $env:DATABASE_URL -f $extensionsFile
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Falha ao aplicar extensions.sql"
            exit 1
        }
        Write-Host "  ✓ Extensões aplicadas via psql" -ForegroundColor Green
    } else {
        # Aplica via prisma db execute (requer arquivo .sql)
        Get-Content $extensionsFile -Raw | pnpm --filter @almanaque/api exec prisma db execute --schema=$SchemaPath --stdin
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Falha ao aplicar extensions.sql via prisma db execute"
            exit 1
        }
        Write-Host "  ✓ Extensões aplicadas via prisma db execute" -ForegroundColor Green
    }
} else {
    Write-Host "  [DRY-RUN] Pulando aplicação" -ForegroundColor DarkGray
}

# -----------------------------------------------------------------------------
# 2. Migration Prisma
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "[2/5] Aplicando migrations Prisma..." -ForegroundColor Yellow
if (-not $DryRun) {
    # deploy (não dev) — falha se houver drift em produção
    pnpm --filter @almanaque/api exec prisma migrate deploy --schema=$SchemaPath
    if ($LASTEXITCODE -ne 0) {
        Write-Error "prisma migrate deploy falhou"
        exit 1
    }
    Write-Host "  ✓ Migrations aplicadas" -ForegroundColor Green
} else {
    Write-Host "  [DRY-RUN] Pulando migrate deploy" -ForegroundColor DarkGray
}

# -----------------------------------------------------------------------------
# 3. Prisma Client generate (garante que cliente está sincronizado)
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "[3/5] Gerando Prisma Client..." -ForegroundColor Yellow
if (-not $DryRun) {
    pnpm --filter @almanaque/api exec prisma generate --schema=$SchemaPath
    if ($LASTEXITCODE -ne 0) {
        Write-Error "prisma generate falhou"
        exit 1
    }
    Write-Host "  ✓ Prisma Client gerado" -ForegroundColor Green
} else {
    Write-Host "  [DRY-RUN] Pulando generate" -ForegroundColor DarkGray
}

# -----------------------------------------------------------------------------
# 4. Seed expandido
# -----------------------------------------------------------------------------

if (-not $SkipSeed) {
    Write-Host ""
    Write-Host "[4/5] Executando seed expandido..." -ForegroundColor Yellow
    if (-not $DryRun) {
        pnpm --filter @almanaque/api exec tsx prisma/seed.ts
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Seed falhou"
            exit 1
        }
        Write-Host "  ✓ Seed concluído" -ForegroundColor Green
    } else {
        Write-Host "  [DRY-RUN] Pulando seed" -ForegroundColor DarkGray
    }
} else {
    Write-Host ""
    Write-Host "[4/5] Seed pulado (--SkipSeed)" -ForegroundColor DarkGray
}

# -----------------------------------------------------------------------------
# 5. Índices full-text (PostgreSQL only)
# -----------------------------------------------------------------------------

if (-not $SkipFulltext) {
    Write-Host ""
    Write-Host "[5/5] Aplicando índices full-text (GIN + trigram + triggers)..." -ForegroundColor Yellow
    $fulltextFile = "apps/api/prisma/fulltext-indexes.sql"
    if (-not (Test-Path $fulltextFile)) {
        Write-Error "Arquivo não encontrado: $fulltextFile"
        exit 1
    }
    if (-not $DryRun) {
        $psqlAvailable = Get-Command psql -ErrorAction SilentlyContinue
        if ($psqlAvailable) {
            psql $env:DATABASE_URL -f $fulltextFile
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Falha ao aplicar fulltext-indexes.sql"
                exit 1
            }
            Write-Host "  ✓ Índices full-text aplicados via psql" -ForegroundColor Green
        } else {
            Get-Content $fulltextFile -Raw | pnpm --filter @almanaque/api exec prisma db execute --schema=$SchemaPath --stdin
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Falha ao aplicar fulltext-indexes.sql via prisma db execute"
                exit 1
            }
            Write-Host "  ✓ Índices full-text aplicados via prisma db execute" -ForegroundColor Green
        }
    } else {
        Write-Host "  [DRY-RUN] Pulando full-text" -ForegroundColor DarkGray
    }
} else {
    Write-Host ""
    Write-Host "[5/5] Full-text pulado (--SkipFulltext)" -ForegroundColor DarkGray
}

# -----------------------------------------------------------------------------
# Resumo final
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Migration concluída com sucesso!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Verificar integridade:"
Write-Host "       pwsh ./scripts/verify-migration.ps1" -ForegroundColor White
Write-Host "  2. Iniciar a API em desenvolvimento:"
Write-Host "       pnpm dev" -ForegroundColor White
Write-Host ""
