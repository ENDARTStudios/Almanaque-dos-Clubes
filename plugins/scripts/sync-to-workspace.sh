#!/usr/bin/env bash
# Espelha skills/ e agents/ dos plugins do repositório para os escopos LOCAIS que cada
# runtime varre, para que fiquem ATIVOS sem depender de instalação pela UI:
#
#   plugins/almanaque-dev/     skills+agents -> .zcode/          (ZCode / Claude-like)
#   plugins/almanaque-design/  skills        -> .dsh/skills/     (DeepSeek Harness — descoberta nativa)
#                              agents        -> .dsh/agents/     (papéis; DSH usa via tool subagent)
#   ambos                      agents        -> .zcode/agents/   (papel em markdown, 1 arquivo por agente)
#
# A fonte canônica é SEMPRE o plugin. Edite lá e rode este script — não edite os arquivos
# espelhados à mão (serão sobrescritos).
#
#   bash plugins/scripts/sync-to-workspace.sh [--check]
#
# --check só relata divergência (para CI), sem escrever.
set -euo pipefail
shopt -s nullglob

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"   # raiz do repositório
CHECK=0
[[ "${1:-}" == "--check" ]] && CHECK=1
drift=0

# copy <origem> <destino> — copia/atualiza os itens de 1º nível; NÃO remove sobras.
copy() {
  local src="$1" dst="$2" item name
  [[ -d "$src" ]] || return 0
  mkdir -p "$dst"
  while IFS= read -r -d '' item; do
    name="$(basename "$item")"
    if [[ ! -e "$dst/$name" ]] || ! diff -qr "$item" "$dst/$name" >/dev/null 2>&1; then
      drift=1
      echo "atualizar ${dst#$ROOT/}/$name"
      [[ $CHECK -eq 0 ]] && { rm -rf "$dst/$name"; cp -r "$item" "$dst/$name"; }
    fi
  done < <(find "$src" -mindepth 1 -maxdepth 1 -print0)
}

# prune <destino> <origem...> — remove do destino o que não existe em NENHUMA origem.
# Use só em diretórios que recebem 1+ origens (senão o prune do 1º apaga o 2º).
prune() {
  local dst="$1"; shift
  local existing name src keep
  [[ -d "$dst" ]] || return 0
  for existing in "$dst"/*; do
    name="$(basename "$existing")"
    keep=0
    for src in "$@"; do
      [[ -e "$src/$name" ]] && keep=1
    done
    if [[ $keep -eq 0 ]]; then
      drift=1
      echo "remover   ${dst#$ROOT/}/$name"
      [[ $CHECK -eq 0 ]] && rm -rf "$existing"
    fi
  done
}

DEV="$ROOT/plugins/almanaque-dev"
DSN="$ROOT/plugins/almanaque-design"

# --- skills --------------------------------------------------------------------------------
# Os dois plugins espelham nos DOIS escopos: assim qualquer runtime que abra este
# workspace acha todo o conjunto (o DSH só varre `.dsh/skills`, o ZCode só `.zcode/skills`).
copy "$DEV/skills" "$ROOT/.zcode/skills"        # workflows operacionais do projeto
copy "$DEV/skills" "$ROOT/.dsh/skills"          # idem, para sessões DSH
copy "$DSN/skills" "$ROOT/.zcode/skills"        # UI/UX, para sessões ZCode
copy "$DSN/skills" "$ROOT/.dsh/skills"          # UI/UX: descoberta nativa do DSH

# --- agents (papéis) -----------------------------------------------------------------------
copy "$DEV/agents" "$ROOT/.zcode/agents"        # fonte-scout, gate-verifier, prod-runner
copy "$DSN/agents" "$ROOT/.zcode/agents"        # design-critic, a11y-auditor, ux-copywriter, visual-qa-auditor
copy "$DSN/agents" "$ROOT/.dsh/agents"          # mesma coisa, versionada no escopo do DSH

# --- remoção de sobras (depois de TODAS as cópias) -----------------------------------------
prune "$ROOT/.zcode/skills" "$DEV/skills" "$DSN/skills"
prune "$ROOT/.zcode/agents" "$DEV/agents" "$DSN/agents"
prune "$ROOT/.dsh/skills"   "$DEV/skills" "$DSN/skills"
prune "$ROOT/.dsh/agents"   "$DSN/agents"

if [[ $drift -eq 0 ]]; then
  echo "ok: escopos locais sincronizados com os plugins (nada a fazer)."
elif [[ $CHECK -eq 1 ]]; then
  echo "drift: rode 'bash plugins/scripts/sync-to-workspace.sh' e commite." >&2
  exit 1
else
  echo "ok: escopos locais atualizados a partir dos plugins."
fi
