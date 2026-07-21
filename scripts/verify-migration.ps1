# =============================================================================
# Almanaque dos Clubes — Verificação pós-Migration (Windows / PowerShell)
# =============================================================================
# Verifica que a migration aplicada por migrate.ps1 criou tudo esperado:
#   - 3 extensões PostgreSQL ativas
#   - 14 tabelas (Club, Player, Competition, Ranking, RankingEntry, User,
#     Session, Role, Permission, UserRole, RolePermission, Subscription,
#     Billing, AuditLog)
#   - 3 índices GIN em search_vector (clubs, players, competitions)
#   - 3 triggers de search_vector
#   - 3 índices trigram (gin_trgm_ops)
#   - Dados de seed: 10 clubes, 3 competições, 2 rankings, 3 roles, 18 perms
#
# Uso:
#   pwsh ./scripts/verify-migration.ps1
# =============================================================================

#Requires -Version 7.0
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-Location -Path (Split-Path -Parent -Path $PSScriptRoot)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Verificação pós-Migration" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 0. Verificações prévias
# -----------------------------------------------------------------------------

if (-not $env:DATABASE_URL) {
    Write-Error "DATABASE_URL não definida"
    exit 1
}

$psqlAvailable = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlAvailable) {
    Write-Warning "psql não disponível — usando prisma db execute para queries"
}

function Invoke-Sql {
    param([string]$Query)
    if ($psqlAvailable) {
        $result = psql $env:DATABASE_URL -t -A -c $Query
        return $result
    } else {
        $tempFile = [System.IO.Path]::GetTempFileName()
        try {
            "SELECT ($Query) AS result;" | Set-Content $tempFile
            $result = pnpm --filter @almanaque/api exec prisma db execute --schema=apps/api/prisma/schema.prisma --stdin < $tempFile
            return $result
        } finally {
            Remove-Item $tempFile -ErrorAction SilentlyContinue
        }
    }
}

# -----------------------------------------------------------------------------
# 1. Extensões
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "[1/6] Extensões PostgreSQL:" -ForegroundColor Yellow
$expectedExtensions = @('uuid-ossp', 'pgcrypto', 'pg_trgm')
$extQuery = "SELECT extname FROM pg_extension WHERE extname = ANY('{$($expectedExtensions -join ',')}')"
$extensions = Invoke-Sql $extQuery
foreach ($ext in $expectedExtensions) {
    if ($extensions -match $ext) {
        Write-Host "  ✓ $ext" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $ext (FALTANDO)" -ForegroundColor Red
    }
}

# -----------------------------------------------------------------------------
# 2. Tabelas
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "[2/6] Tabelas:" -ForegroundColor Yellow
$expectedTables = @(
    'clubs', 'players', 'competitions',
    'rankings', 'ranking_entries',
    'users', 'sessions',
    'roles', 'permissions', 'user_roles', 'role_permissions',
    'subscriptions', 'billings',
    'audit_logs'
)
$tableQuery = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
$tables = Invoke-Sql $tableQuery
foreach ($t in $expectedTables) {
    if ($tables -match $t) {
        Write-Host "  ✓ $t" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $t (FALTANDO)" -ForegroundColor Red
    }
}

# -----------------------------------------------------------------------------
# 3. Índices GIN em search_vector
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "[3/6] Índices GIN (search_vector):" -ForegroundColor Yellow
$expectedGinIndexes = @('clubs_search_vector_idx', 'players_search_vector_idx', 'competitions_search_vector_idx')
$ginQuery = "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%_search_vector_idx'"
$ginIndexes = Invoke-Sql $ginQuery
foreach ($idx in $expectedGinIndexes) {
    if ($ginIndexes -match $idx) {
        Write-Host "  ✓ $idx" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $idx (FALTANDO)" -ForegroundColor Red
    }
}

# -----------------------------------------------------------------------------
# 4. Triggers de search_vector
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "[4/6] Triggers search_vector:" -ForegroundColor Yellow
$expectedTriggers = @('clubs_search_vector_trigger', 'players_search_vector_trigger', 'competitions_search_vector_trigger')
$triggerQuery = "SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public'"
$triggers = Invoke-Sql $triggerQuery
foreach ($trig in $expectedTriggers) {
    if ($triggers -match $trig) {
        Write-Host "  ✓ $trig" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $trig (FALTANDO)" -ForegroundColor Red
    }
}

# -----------------------------------------------------------------------------
# 5. Índices trigram
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "[5/6] Índices trigram (pg_trgm):" -ForegroundColor Yellow
$expectedTrgmIndexes = @(
    'clubs_name_trgm_idx', 'clubs_full_name_trgm_idx',
    'players_full_name_trgm_idx',
    'competitions_name_trgm_idx'
)
$trgmQuery = "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%_trgm_idx'"
$trgmIndexes = Invoke-Sql $trgmQuery
foreach ($idx in $expectedTrgmIndexes) {
    if ($trgmIndexes -match $idx) {
        Write-Host "  ✓ $idx" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $idx (FALTANDO)" -ForegroundColor Red
    }
}

# -----------------------------------------------------------------------------
# 6. Dados de seed (counts)
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "[6/6] Dados de seed:" -ForegroundColor Yellow
$expectedCounts = @{
    'clubs' = 10
    'competitions' = 3
    'rankings' = 2
    'ranking_entries' = 20
    'roles' = 3
    'permissions' = 18
    'role_permissions' = 31
}
foreach ($kv in $expectedCounts.GetEnumerator()) {
    $table = $kv.Key
    $expected = $kv.Value
    $countResult = Invoke-Sql "SELECT count(*) FROM $table"
    if ($countResult -match "^\s*(\d+)") {
        $actual = $matches[1]
        if ([int]$actual -ge $expected) {
            Write-Host "  ✓ $table: $actual (esperado ≥$expected)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $table: $actual (esperado ≥$expected)" -ForegroundColor Red
        }
    } else {
        Write-Host "  ? $table: não foi possível contar" -ForegroundColor Yellow
    }
}

# -----------------------------------------------------------------------------
# Resumo
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Verificação concluída" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se TODOS os itens acima estão ✓, a migration foi aplicada com sucesso." -ForegroundColor White
Write-Host "Se algum item está ✗, revise o log acima e o arquivo migrate.ps1." -ForegroundColor White
Write-Host ""
