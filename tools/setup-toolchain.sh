#!/usr/bin/env bash
# Installs everything needed to compile and flash Kira firmware into .toolchain/.
# Nothing is installed system-wide. Safe to re-run: finished steps are skipped.
# To start over, delete .toolchain/ and run this again.
set -euo pipefail

GCC_VERSION="15.2.1-1.1"
KLL_VERSION="0.5.7.16"
CMAKE_VERSION="4.4.4"
NINJA_VERSION="1.13.2"
FIRMWARE_COMMIT="015a15deffef97e14713dea231072ce40531f00b"
DFU_URL="https://github.com/kiibohd/dfu-util/releases/download/v0.9-kiibohd/dfu-util-v0.9-kiibohd.zip"
DFU_SHA256="880a7ff3477f4b79eb666f6dbcf33f070acbf310f9397afeecf9b1d94fe7a8cc"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLCHAIN="$ROOT/.toolchain"

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

[ "$(uname -s)" = "Darwin" ] || fail "only macOS is supported"
case "$(uname -m)" in
  x86_64) GCC_ARCH="darwin-x64" ;;
  arm64) GCC_ARCH="darwin-arm64" ;;
  *) fail "unsupported CPU: $(uname -m)" ;;
esac
for tool in curl git shasum tar unzip; do
  command -v "$tool" > /dev/null || fail "$tool is required"
done

sha256() {
  shasum -a 256 "$1" | awk '{print $1}'
}

find_python() {
  local version candidate
  # 3.13 is the tested version. kll needs at least 3.8.
  for version in 3.13 3.14 3.12 3.11 3.10; do
    for candidate in "python$version" "/usr/local/opt/python@$version/bin/python$version" "/opt/homebrew/opt/python@$version/bin/python$version"; do
      if command -v "$candidate" > /dev/null; then
        echo "$candidate"
        return
      fi
    done
  done
  return 1
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$TOOLCHAIN"

if [ -z "$(find "$TOOLCHAIN/gcc" -type f -name arm-none-eabi-gcc 2> /dev/null)" ]; then
  echo "==> Installing gcc $GCC_VERSION"
  file="xpack-arm-none-eabi-gcc-$GCC_VERSION-$GCC_ARCH.tar.gz"
  url="https://github.com/xpack-dev-tools/arm-none-eabi-gcc-xpack/releases/download/v$GCC_VERSION/$file"
  curl -fsSL -o "$WORK/gcc.tgz" "$url"
  curl -fsSL -o "$WORK/gcc.sha" "$url.sha"
  [ "$(awk '{print $1}' "$WORK/gcc.sha")" = "$(sha256 "$WORK/gcc.tgz")" ] || fail "gcc checksum mismatch"
  mkdir -p "$WORK/gcc"
  tar xzf "$WORK/gcc.tgz" -C "$WORK/gcc"
  rm -rf "$TOOLCHAIN/gcc"
  mv "$WORK/gcc" "$TOOLCHAIN/gcc"
else
  echo "==> gcc already installed"
fi

if [ ! -x "$TOOLCHAIN/venv/bin/kll" ] || [ ! -x "$TOOLCHAIN/venv/bin/cmake" ] || [ ! -x "$TOOLCHAIN/venv/bin/ninja" ]; then
  python="$(find_python)" || fail "Python 3.10 or newer is required. Try: brew install python@3.13"
  echo "==> Installing kll $KLL_VERSION, CMake, and ninja with $("$python" --version)"
  rm -rf "$TOOLCHAIN/venv"
  "$python" -m venv "$TOOLCHAIN/venv"
  "$TOOLCHAIN/venv/bin/pip" install --quiet --upgrade pip
  "$TOOLCHAIN/venv/bin/pip" install --quiet "kll==$KLL_VERSION" "cmake==$CMAKE_VERSION" "ninja==$NINJA_VERSION"
else
  echo "==> kll, CMake, and ninja already installed"
fi

if [ ! -x "$TOOLCHAIN/bin/dfu-util" ] || [ ! -x "$TOOLCHAIN/bin/dfu-suffix" ]; then
  echo "==> Installing dfu-util"
  curl -fsSL -o "$WORK/dfu.zip" "$DFU_URL"
  [ "$DFU_SHA256" = "$(sha256 "$WORK/dfu.zip")" ] || fail "dfu-util checksum mismatch"
  mkdir -p "$WORK/dfu" "$TOOLCHAIN/bin"
  unzip -q -j -o "$WORK/dfu.zip" -d "$WORK/dfu"
  for name in dfu-util dfu-suffix dfu-prefix libusb-1.0.0.dylib; do
    [ -f "$WORK/dfu/$name" ] || fail "$name is missing from the dfu-util download"
    cp "$WORK/dfu/$name" "$TOOLCHAIN/bin/$name"
  done
  chmod +x "$TOOLCHAIN/bin/dfu-util" "$TOOLCHAIN/bin/dfu-suffix" "$TOOLCHAIN/bin/dfu-prefix"
else
  echo "==> dfu-util already installed"
fi

if [ "$(git -C "$TOOLCHAIN/controller" rev-parse HEAD 2> /dev/null || true)" != "$FIRMWARE_COMMIT" ]; then
  echo "==> Downloading firmware source"
  rm -rf "$TOOLCHAIN/controller"
  git clone --quiet https://github.com/kiibohd/controller.git "$TOOLCHAIN/controller"
  git -C "$TOOLCHAIN/controller" -c advice.detachedHead=false checkout --quiet "$FIRMWARE_COMMIT"
else
  echo "==> Firmware source already installed"
fi

echo
echo "Toolchain ready in $TOOLCHAIN"
"$(dirname "$(find "$TOOLCHAIN/gcc" -type f -name arm-none-eabi-gcc | head -1)")/arm-none-eabi-gcc" --version | head -1
"$TOOLCHAIN/venv/bin/kll" --version | tail -1
"$TOOLCHAIN/venv/bin/cmake" --version | head -1
