#!/usr/bin/env bash
# Smoke test para a API do Almanaque dos Clubes (bash/curl).
# Rode este arquivo com o servidor ouvindo em http://localhost:3000.
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
pass=0
fail=0

test_endpoint() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  local body="$4"

  echo ""
  echo "===================================================="
  echo "TESTE: $name"
  echo "===================================================="
  echo "Status: $actual (esperado: $expected)"
  echo "Body: $body"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS"
    pass=$((pass+1))
  else
    echo "FAIL"
    fail=$((fail+1))
  fi
}

# 1. Health
resp=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | head -n -1)
test_endpoint "GET /health" "200" "$code" "$body"

# 2. Lista inicial
resp=$(curl -s -w "\n%{http_code}" "$BASE_URL/clubs")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | head -n -1)
test_endpoint "GET /clubs" "200" "$code" "$body"

# 3. Criar clube
resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/clubs" \
  -H "Content-Type: application/json" \
  -d '{"name":"Gremio","fullName":"Gremio Foot-Ball Porto Alegrense","shortName":"GRE","city":"Porto Alegre","state":"RS","country":"BR","foundedYear":1903,"primaryColor":"#0E61A4"}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | head -n -1)
test_endpoint "POST /clubs (criar Gremio)" "201" "$code" "$body"

# 4. Validação falha
resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/clubs" \
  -H "Content-Type: application/json" \
  -d '{"name":"X"}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | head -n -1)
test_endpoint "POST /clubs (nome curto)" "422" "$code" "$body"

# 5. Conflito
resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/clubs" \
  -H "Content-Type: application/json" \
  -d '{"name":"Flamengo","country":"BR"}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | head -n -1)
test_endpoint "POST /clubs (conflito)" "409" "$code" "$body"

# 6. Busca
resp=$(curl -s -w "\n%{http_code}" "$BASE_URL/clubs?search=Pal")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | head -n -1)
test_endpoint "GET /clubs?search=Pal" "200" "$code" "$body"

# 7. 404
resp=$(curl -s -w "\n%{http_code}" "$BASE_URL/clubs/uuid-inexistente")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | head -n -1)
test_endpoint "GET /clubs/:id (404)" "404" "$code" "$body"

echo ""
echo "===================================================="
echo "RESUMO: $pass passaram, $fail falharam"
echo "===================================================="
[[ "$fail" -eq 0 ]]
