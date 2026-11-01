#!/usr/bin/env bash
# Compiles Kira firmware from generated .kll layer files, following KiiConf's build_layout.bash.
# Usage: tools/compile-firmware.sh <dir-with-kll-files> <layer-0-name> <layer-1-name> [more layers]
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "usage: $0 <dir-with-kll-files> <layer-0-name> <layer-1-name> [more layers]" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLCHAIN="$ROOT/.toolchain"
SOURCE="$TOOLCHAIN/controller"
# Avoid naming a variable GCC_ROOT here: gcc reads it and then can't find cc1.
VENV="$TOOLCHAIN/venv"
DFU_BIN="$TOOLCHAIN/bin"
GCC="$(find "$TOOLCHAIN/gcc" -type f -name arm-none-eabi-gcc 2> /dev/null | head -1)"

if [ -z "$GCC" ] || [ ! -x "$VENV/bin/kll" ] || [ ! -d "$SOURCE" ]; then
  echo "ERROR: the toolchain is not installed. Run tools/setup-toolchain.sh first." >&2
  exit 1
fi

GCC_BIN="$(dirname "$GCC")"

OUT="$(cd "$1" && pwd)"
shift
export PATH="$GCC_BIN:$VENV/bin:$DFU_BIN:$PATH"

# The firmware predates CMake 4, which rejects its old minimum-version line.
export CMAKE_POLICY_VERSION_MINIMUM="${CMAKE_POLICY_VERSION_MINIMUM:-3.5}"
# gcc 14+ turned these old C patterns from warnings into errors.
export CFLAGS="${CFLAGS:--Wno-error=implicit-function-declaration -Wno-error=int-conversion -Wno-error=incompatible-pointer-types -Wno-error=implicit-int -fcommon}"

layers=("$@")

default_map="stdFuncMap ${layers[0]}"
partial_maps="stdFuncMap ${layers[1]}"
for layer in "${layers[@]:2}"; do
  partial_maps="$partial_maps;stdFuncMap $layer"
done

DefaultMapOverride="$default_map" \
PartialMapsExpandedOverride="$partial_maps" \
Layout="standard" \
CMakeExtraArgs="-DCONFIGURATOR=1" \
PIPENV_ACTIVE=1 \
"$SOURCE/Keyboards/kira.bash" -c "$SOURCE" -o "$OUT"
