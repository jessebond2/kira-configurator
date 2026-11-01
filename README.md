# kira-configurator

Layout, lighting, and firmware tool for the Input Club Kira keyboard. It runs entirely on your Mac.

The original Kiibohd Configurator compiled firmware on `vash.input.club`, which no longer exists, so the app could no longer load layouts or compile. This project keeps its GUI editor and compiles locally instead, using Electron, Vite, and current Node LTS.

**Status:** it works for my keyboard, on an Intel Mac. See [What needs testing](#what-needs-testing).

## Quick start

You need macOS, Node 24 or newer, git, and Python 3.10 or newer (tested with 3.13).

```sh
npm install
tools/setup-toolchain.sh
npm start
```

Pick **Kira**, edit your layout, and click **Compile Firmware**. Then flash it:

1. Press the reset button on the bottom of the keyboard once. It always enters flash mode.
2. Click **Flash** in the app.
3. If the keyboard doesn't restart by itself, unplug and replug it. In my testing it has stayed in flash mode until replugged at least once.

The Kira can't type while it's in flash mode, so keep another keyboard handy. Layouts built by the original app are imported automatically and appear under **Layouts**.

## Toolchain

`tools/setup-toolchain.sh` installs everything into the git-ignored `.toolchain/` folder, about 1.2 GB, with nothing installed system-wide. It's safe to re-run, and finished steps are skipped. To start over, delete `.toolchain/` and run it again.

### If the script fails

Install these by hand into the same locations. The build looks for them there.

| Requirement | Tested version | Location | Source |
|---|---|---|---|
| Arm gcc | 15.2.1-1.1 | Anywhere under `.toolchain/gcc/` | [xPack releases](https://github.com/xpack-dev-tools/arm-none-eabi-gcc-xpack/releases) |
| Python virtual environment | Python 3.13 | `.toolchain/venv/` | `python3 -m venv .toolchain/venv` |
| `kll` | 0.5.7.16 | In the virtual environment | PyPI |
| CMake | 4.4.4 | In the virtual environment | PyPI |
| ninja | 1.13.2 | In the virtual environment | PyPI |
| `dfu-util`, `dfu-suffix` | 0.9 | `.toolchain/bin/`, marked executable | [Kiibohd build](https://github.com/kiibohd/dfu-util/releases/tag/v0.9-kiibohd) |
| Firmware source | `015a15de` | `.toolchain/controller/`, as a git clone | [kiibohd/controller](https://github.com/kiibohd/controller) |

```sh
.toolchain/venv/bin/pip install kll==0.5.7.16 cmake==4.4.4 ninja==1.13.2
```

Good to know:

- **`kll` downloads layout files from GitHub** the first time it builds, so that build needs internet access.
- **The firmware source needs its full git history.** The build uses git for version information, so don't make a shallow clone.
- **The Kiibohd `dfu-util` package includes `libusb-1.0.0.dylib`.** Keep it next to `dfu-util`.
- **The old firmware needs compatibility settings for modern tools.** `tools/compile-firmware.sh` already sets these:
  - `CMAKE_POLICY_VERSION_MINIMUM=3.5` for CMake 4
  - Legacy C flags for gcc 14 and newer: `-Wno-error=implicit-function-declaration -Wno-error=int-conversion -Wno-error=incompatible-pointer-types -Wno-error=implicit-int -fcommon`
- **Don't set a `GCC_ROOT` environment variable.** With it set, gcc failed with `cannot execute 'cc1'`.

To test the toolchain without the app:

```sh
tools/build-firmware.sh <layout.json> layouts/Kira-Standard.default.json build/kira
```

## What needs testing

Confirmed working:

- Compiling and flashing an unedited layout from the app
- Booting, typing, and lights on the resulting firmware

Not tested yet:

- [ ] Flashing a layout edited in the app
- [ ] Editing lights and animations
- [ ] Editing macros
- [ ] Layer combos and media keys on the new firmware
- [ ] Light controls and the Caps Lock indicator
- [ ] Sleep and wake
- [ ] Rolling back to older firmware
- [ ] Apple Silicon Macs (`dfu-util` is Intel-only, so it would need Rosetta)
- [ ] Keyboards other than the Kira Standard. Others are hidden from the app.

## Development

```sh
npm run dev        # launch with hot reload
npm run typecheck
npm run build
```

- `src/main`: system access, including USB, compiling, flashing, and importing old layouts
- `src/preload`: the bridge between the UI and `src/main`, typed by `src/common/host.ts`
- `src/renderer`: the React UI, which has no direct Node access
- `src/common`: shared code, including KLL generation in `kll.ts`
- `tools`: toolchain setup and firmware build scripts

React 17 and Material-UI 4 are old, and there's no packaged `.app`, so the app runs from this repo. Both are deliberate for now.

## Credits and license

Built on Input Club's open source projects:

- [kiibohd/configurator](https://github.com/kiibohd/configurator): the GUI editor, imported at `2e12869`
- [kiibohd/KiiConf](https://github.com/kiibohd/KiiConf): layout conversion and default layouts. `src/common/kll.ts` is a TypeScript port of the KLL generation in its `download.php`.
- [kiibohd/controller](https://github.com/kiibohd/controller): the keyboard firmware

Licensed under GPL-3.0, the same as the original configurator. See `LICENSE.md`.
