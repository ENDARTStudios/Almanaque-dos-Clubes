# Verificar se Docker está disponível
$dockerPath = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerPath) {
    "ERRO: Docker não encontrado" | Out-File -FilePath "docker_status.txt"
    exit 1
}

$dockerPath.Source | Out-File -FilePath "docker_status.txt"
"Docker encontrado em: $($dockerPath.Source)" | Out-File -FilePath "docker_status.txt" -Append

# Verificar containers
try {
    $psOutput = & docker ps 2>&1
    $psOutput | Out-File -FilePath "docker_status.txt" -Append
} catch {
    "Erro ao executar docker ps: $_" | Out-File -FilePath "docker_status.txt" -Append
}