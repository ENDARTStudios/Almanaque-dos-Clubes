#!/usr/bin/env pwsh
# Smoke test para a API do Almanaque dos Clubes.
# Rode este arquivo após `pnpm dev` estar com o servidor ouvindo em http://localhost:3000.
#
# Uso (PowerShell):
#   pwsh ./scripts/test_api.ps1
#   # ou
#   powershell -File ./scripts/test_api.ps1

$ErrorActionPreference = "Continue"
$BaseUrl = "http://localhost:3000/api/v1"
$pass = 0
$fail = 0

function Invoke-Test {
    param(
        [string]$Name,
        [scriptblock]$Action,
        [int]$ExpectedStatus
    )
    Write-Host ""
    Write-Host "===================================================="
    Write-Host "TESTE: $Name"
    Write-Host "===================================================="
    try {
        $result = & $Action
        $status = $result.StatusCode
        $body = $result.Body
        Write-Host "Status: $status (esperado: $ExpectedStatus)"
        Write-Host "Body: $body"
        if ($status -eq $ExpectedStatus) {
            Write-Host "PASS" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "FAIL" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        Write-Host "FAIL (erro): $_" -ForegroundColor Red
        $script:fail++
    }
}

function Get-Json {
    param([string]$Url)
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -ErrorAction Stop
    return @{ StatusCode = $response.StatusCode; Body = $response.Content }
}

function Post-Json {
    param([string]$Url, [string]$Json)
    $response = Invoke-WebRequest -Uri $Url -Method POST -ContentType "application/json" -Body $Json -UseBasicParsing -ErrorAction Stop
    return @{ StatusCode = $response.StatusCode; Body = $response.Content }
}

# Testes
Invoke-Test "GET /health" { Get-Json "$BaseUrl/health" } 200
Invoke-Test "GET /clubs (lista inicial)" { Get-Json "$BaseUrl/clubs" } 200
Invoke-Test "POST /clubs (criar Corinthians)" {
    Post-Json "$BaseUrl/clubs" '{
        "name": "Corinthians",
        "fullName": "Sport Club Corinthians Paulista",
        "shortName": "COR",
        "city": "Sao Paulo",
        "state": "SP",
        "country": "BR",
        "foundedYear": 1910,
        "primaryColor": "#000000"
    }'
} 201
Invoke-Test "POST /clubs (validacao falha)" {
    try {
        Post-Json "$BaseUrl/clubs" '{ "name": "X" }'
    } catch {
        $r = $_.Exception.Response
        if ($r) {
            $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
            $body = $reader.ReadToEnd()
            return @{ StatusCode = [int]$r.StatusCode; Body = $body }
        }
        throw
    }
} 422
Invoke-Test "GET /clubs?search=Pal" { Get-Json "$BaseUrl/clubs?search=Pal" } 200
Invoke-Test "GET /clubs/:id inexistente (404)" {
    try {
        Get-Json "$BaseUrl/clubs/uuid-inexistente"
    } catch {
        $r = $_.Exception.Response
        if ($r) {
            $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
            $body = $reader.ReadToEnd()
            return @{ StatusCode = [int]$r.StatusCode; Body = $body }
        }
        throw
    }
} 404

Write-Host ""
Write-Host "===================================================="
Write-Host "RESUMO: $pass passaram, $fail falharam"
Write-Host "===================================================="
if ($fail -gt 0) { exit 1 } else { exit 0 }
