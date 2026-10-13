#!/usr/bin/env bash
# Espelha skills/ e agents/ dos plugins do repositório para os escopos locais ativos
# (.zcode/ e .dsh/). O script unificado mora em plugins/scripts/sync-to-workspace.sh —
# este wrapper existe para não quebrar quem já chama o caminho antigo.
#
#   bash plugins/almanaque-dev/scripts/sync-to-workspace.sh [--check]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec bash "$ROOT/plugins/scripts/sync-to-workspace.sh" "$@"
