#!/usr/bin/env bash
# Espelha skills/ e agents/ do plugin para o escopo do REPOSITÓRIO (<repo>/.zcode/),
# para que fiquem ATIVOS neste projeto sem depender da instalação pela UI do ZCode.
#
# A fonte canônica é o plugin (plugins/almanaque-dev/). Edite lá e rode este script —
# não edite os arquivos em .zcode/ à mão (serão sobrescritos).
#
#   bash plugins/almanaque-dev/scripts/sync-to-workspace.sh [--check]
#
# --check só relata divergência (para CI), sem escrever.
set -euo pipefail
shopt -s nullglob   # glob sem match vira lista vazia (não o literal '*')

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"   # raiz do repositório
SRC="$ROOT/plugins/almanaque-dev"
DST="$ROOT/.zcode"
CHECK=0
[[ "${1:-}" == "--check" ]] && CHECK=1

if [[ ! -d "$SRC/skills" || ! -d "$SRC/agents" ]]; then
  echo "erro: esperava skills/ e agents/ em $SRC" >&2
  exit 1
fi

drift=0
for kind in skills agents; do
  mkdir -p "$DST/$kind"
  # remove o que sumiu da origem
  for existing in "$DST/$kind"/*; do
    name="$(basename "$existing")"
    if [[ ! -e "$SRC/$kind/$name" ]]; then
      drift=1
      echo "remover   .zcode/$kind/$name"
      [[ $CHECK -eq 0 ]] && rm -rf "$existing"
    fi
  done
  # copia/atualiza
  while IFS= read -r -d '' item; do
    name="$(basename "$item")"
    if [[ ! -e "$DST/$kind/$name" ]] || ! diff -qr "$item" "$DST/$kind/$name" >/dev/null 2>&1; then
      drift=1
      echo "atualizar .zcode/$kind/$name"
      [[ $CHECK -eq 0 ]] && { rm -rf "$DST/$kind/$name"; cp -r "$item" "$DST/$kind/$name"; }
    fi
  done < <(find "$SRC/$kind" -mindepth 1 -maxdepth 1 -print0)
done

if [[ $drift -eq 0 ]]; then
  echo "ok: .zcode/ sincronizado com o plugin (nada a fazer)."
elif [[ $CHECK -eq 1 ]]; then
  echo "drift: rode 'bash plugins/almanaque-dev/scripts/sync-to-workspace.sh' e commite." >&2
  exit 1
else
  echo "ok: .zcode/ atualizado a partir do plugin."
fi
