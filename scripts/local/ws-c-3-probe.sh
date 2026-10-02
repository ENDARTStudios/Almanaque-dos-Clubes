#!/usr/bin/env bash
# WS-C-3 (T454) — probe sintético LEVE (local-only). Somente GET público, ≤20 req, 1s de intervalo.
# SEM segredos, SEM .env, SEM escrita, SEM deploy, SEM orquestração, SEM paralelismo agressivo.
# Uso: bash scripts/local/ws-c-3-probe.sh
set -u
WEB="https://almanaquedosclubes.com"
API="https://api.almanaquedosclubes.com/api/v1"
UA="AlmanaqueDosClubes-ObservationBot/1.0 (+https://almanaquedosclubes.com; endart.studios@gmail.com)"
n=0
get() {
  [ "$n" -ge 20 ] && { echo "orçamento do ciclo esgotado (20)"; return; }
  n=$((n+1))
  code=$(curl -sS -o /dev/null -w '%{http_code} %{time_total}s' -A "$UA" -H 'Cache-Control: no-cache' "$1" || echo "ERR")
  echo "$code  $1"
  sleep 1
}
echo "== WS-C-3 probe (<=20 GET) $(date -u +%Y-%m-%dT%H:%M:%SZ) =="
get "$WEB/"; get "$WEB/map"; get "$WEB/preview/mapa"; get "$WEB/rankings"; get "$WEB/metodologia"
get "$WEB/search?q=Flamengo"; get "$WEB/sitemap.xml"
get "$API/health"; get "$API/rankings"; get "$API/champions/carousel"; get "$API/search/global?q=Flamengo"
get "$API/geo/points?country=BR&limit=3"; get "$API/geo/points?country=PT&limit=3"; get "$API/geo/points?country=GB&limit=3"
get "$API/geo/points?minLat=-24.0&maxLat=-23.0&minLng=-47.0&maxLng=-46.0&limit=3"
get "$API/geo/points?minLat=-23.0&maxLat=-24.0&minLng=-47.0&maxLng=-46.0&limit=3"
get "$API/geo/points?country=BRA&limit=3"
echo "== fim ($n requisições) =="
