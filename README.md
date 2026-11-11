# AULA F75 Max Studio — Windows Desktop Driver v0.8.1

An unofficial desktop configurator and real-time lighting controller for the wired AULA F75 Max (`VID_0C45`, `PID_800A`). The desktop app packages the Studio interface in Electron, uses WebHID for the keyboard's vendor-defined configuration collection (`MI_03`, usage page `0xFF13`, usage `0x0001`), and continues its effect loop when the main window is hidden to the Windows system tray.

## Recommended: build/install the Windows app

This source package includes scripts to produce both a Windows installer and a portable EXE. A precompiled EXE is not included in this ZIP because the build environment used to prepare it had no access to the npm registry; the Windows build script downloads the pinned Electron and electron-builder packages on your PC.

1. Install **Node.js 22 or newer** from <https://nodejs.org/>.
2. Extract the ZIP to a normal folder, such as `C:\AULA-F75-Max-Studio`.
3. Double-click `BUILD-WINDOWS-EXE.bat`.
4. When it finishes, open `release` and run `AULA-F75-Max-Studio-0.8.1-x64.exe` to install. The portable EXE is also placed there.
5. Before launching the new build, quit any older AULA Studio version from its system-tray menu (older versions use the same single-instance ID and local port). Connect the keyboard using USB-C and set the physical switch to wired mode. Close the official AULA application and its background process before connecting.
6. Launch **AULA F75 Max Studio** from the Start menu or desktop shortcut and click **Connect keyboard**. The desktop runtime now reuses an existing authorized HID grant where available; otherwise its Electron HID selector automatically chooses the AULA `0C45:800A` interface. The renderer then verifies that the selected interface contains `0xFF13 / 0x0001` before sending any commands.

The installer/portable app is self-contained; Node.js is required only to run the source project or build the EXEs. On first source launch, `RUN-DESKTOP.bat` installs the exact dependencies, then starts the desktop app.

## Desktop behavior

- This is a native Windows window packaged with Electron, not a browser tab. No Python or external local web server is required.
- Pressing the window **X** hides Studio to the system tray; it does not close the process. The real-time lighting renderer and WebHID connection stay alive while the tray app is running.
- Double-click the AULA tray icon to reopen Studio.
- Right-click the tray icon to see the current effect, stop real-time lighting, enable launch at Windows sign-in, or quit and restore the keyboard's selected native lighting mode.
- Selecting **Run at Windows sign-in** launches Studio hidden to the tray. Double-click the tray icon to open the interface.
- Quit from the tray menu to stop the stream cleanly. Ending the process from Task Manager or shutting down Windows cannot guarantee that the last frame is replaced; use the tray's quit command instead.
- The app uses a fixed loopback origin (`127.0.0.1:48675`) so local profiles and WebHID permission remain associated with the same origin after each restart. The server binds only to loopback and serves the packaged app files. The desktop runtime disables Chromium's generic HID blocklist because the keyboard is a composite USB HID device; the Electron permission handlers still grant HID access only to this app's loopback origin and VID/PID `0C45:800A`, and the renderer refuses to open an interface unless it exposes the exact `0xFF13 / 0x0001` configuration collection.
- If startup reports that port `48675` is in use, close an older Studio process and retry. Do not launch multiple copies from different extracted folders.

Custom effects are host-rendered. The stock keyboard firmware does not permanently store Studio's new animations. They continue while Studio runs (including hidden in the tray), but they stop when the desktop process exits, the USB cable is removed, or the computer sleeps/shuts down. Making a custom effect continue with the computer and Studio fully off would require compatible custom keyboard firmware; this app does not flash firmware.

## Smoothness and frame-rate expectations

The `0C45:800A` real-time capture used by this project has a median interval of about 58.7 ms between `04 20` frame headers, approximately 17 FPS. Studio follows that measured cadence instead of assuming the faster rate from a different AULA USB chipset/protocol. Frame scheduling is phase-locked to a monotonic clock, the 512-byte RGB buffer is reused, keyboard geometry is compiled once for the effect renderers, reactive effects use a precomputed LED lookup, and the 82-key DOM preview is not repainted while the window is hidden. These reduce host-side work and timing jitter; they do not increase the keyboard's proven USB frame rate.

## Real-time Lighting and 120 custom effects

The 120 Studio effects are computed on the PC and use the keyboard's built-in **Real-time Lighting** stream. They are not sent as QMK effect IDs.

On the first start, Studio enters host-control/Real-time Lighting mode once using the reference AULA sequence: `04 18` → `04 28` (byte 8 = `01`) → a 64-byte host clock block (`00 01 5A ... AA 55`) → `04 02`.

Each subsequent animation frame uses `04 20` (byte 8 = `08`) → eight 64-byte RGB blocks → `04 02`. The eight blocks contain one 512-byte array of 128 `[LED index, R, G, B]` records. The 82 F75 Max physical-key indices are packed in visual reading order; remaining records are zero padding. This is a volatile real-time stream, not the persistent `04 23` per-key colour table.

The stream's frame cadence is approximately 58.7 ms (~17 FPS). Readbacks on the real-time path are consumed without applying the normal configuration ACK-byte check, matching the reference helper's behavior. The exact F75 Max host-control compatibility and every LED's physical order should still be confirmed on the user's device. Stop the stream before unplugging the keyboard.

## Reactive effects and global key input (v0.7.0)

Reactive Studio effects now use a native Windows global keydown listener in the desktop app, rather than relying only on `window.addEventListener('keydown')`. This lets reactive effects continue to trigger when Studio is minimized to the tray or another application has focus.

The listener is loaded only after the user starts a hardware effect in the Reactive category and confirms the explanation in the safety dialog. It maps global key identifiers to USB HID usage IDs, then to this F75 Max layout's `light_index`. It forwards only supported numeric usage IDs to the renderer; it does not read text, record typed content, or keep a keystroke history. It is stopped when the hardware effect stops, when a non-reactive effect is selected, or when Studio exits.

**Privacy / device scope:** the global hook receives keyboard events from any keyboard attached to this PC; the current library does not identify which physical keyboard generated an event. Therefore typing on another connected keyboard can also trigger the F75 Max effect. The app filters events to keys present in the 82-position F75 Max layout. Fn is normally consumed by keyboard firmware and does not generate a regular Windows key event; LED98 is a lighting-only placeholder with no keycode.

The desktop build uses `uiohook-napi` (N-API native global input hook). The in-app browser preview uses the same USB HID usage mapping through `KeyboardEvent.code`; it only reacts while its preview window has focus.

## Features

- 20 native AULA hardware lighting modes.
- 120 PC-rendered custom animations, including Rainbow Wave, with search, categories, preview, speed and brightness controls.
- Real-time per-key RGB stream using the built-in AULA frame channel.
- Per-key colour editor and local profiles.
- Base and Fn-layer keymap editor.
- Macro editor and profile export.
- Function/settings editor.
- Alt_R, Fn, Ctrl_R and LED98 kept as four independent lighting slots.

Persistent per-key colour, key remapping, macro upload and settings writes are less well verified than native lighting; they remain marked experimental in the UI. LCD/GIF flashing is omitted.

## Corrected bottom-row LED layout

The latest user-provided AULA XML is authoritative:

| Physical key/slot | `key_index` | `light_index` | X | Width |
|---|---:|---:|---:|---:|
| Alt_R | 95 | 95 | 481 | 20 |
| Fn | 96 | 96 | 501 | 20 |
| Ctrl_R | 97 | 97 | 521 | 20 |
| LED98 (lighting-only) | 98 | 98 | 541 | 20 |

All four LED indices are unique. LED98 has keycode `0x00`, so it is a lighting-only slot and is not remappable.

## Compatibility and safety

- Wired keyboard: `VID_0C45`, `PID_800A`.
- Configuration collection: `MI_03`, usage page `0xFF13`, usage `0x0001`.
- `MI_02` / `0xFF68` is a separate display interface; it is not the lighting command collection.
- The 2.4 GHz receiver `05AC:024F` is not enabled in this build.
- Studio is not QMK/Vial firmware. It cannot enable firmware-only behavior such as tap dance or native QMK keycodes through the UI alone.
- The `04 20` frame stream is intended to be volatile; it does not write the persistent `04 23` colour table.
- Export profiles before attempting experimental remap, macro or settings writes.

## Project files

- `index.html`, `styles.css` — desktop user interface.
- `app.js` — UI state, profile persistence and real-time effect loop.
- `effects.js` — 120 Studio animation renderers with cached layout geometry.
- `protocol.js` — HID transport, AULA lighting commands and reusable real-time frame builder.
- `keymap.json` — 82-key F75 Max layout and LED indices.
- `desktop/main.cjs` — Electron main process, loopback server, tray lifecycle, HID blocklist override (scoped by permission handlers), and HID chooser/permission diagnostics.
- `desktop/preload.cjs` — narrow IPC bridge for tray, status and reactive input commands.
- `reactive-key-map.json` — browser and global-hook key-to-USB-usage lookup used to address all 80 host-visible keys.
- `test-reactive-input.mjs` — verifies key-event mapping coverage and global-hook lifecycle wiring.
- `RUN-DESKTOP.bat` — run desktop app from source.
- `BUILD-WINDOWS-EXE.bat` — run tests and produce Setup + Portable Windows EXEs.
- `START-WINDOWS.bat` — legacy browser/local-server launcher.
- `test-protocol.mjs` — offline protocol, LED mapping, and effect checks.

## Protocol references

- AULA/SONiX captured real-time colour stream (`0x20`): https://github.com/gavindi/Aula_L99_Linux/blob/main/tools/aula_l99_hacky/re_notes/color_stream.md
- Reference Real-time Lighting host-control handshake: https://github.com/Punkster81/AULA-F108-Driver/blob/main/aula_f108_pro_final.py
- Captured AULA wired HID protocol (`0C45:800A`, interface 3): https://github.com/gavindi/Aula_L99_Linux/blob/main/tools/aula_l99_hacky/protocol.py
- AULA F75 Max packet catalogue: https://github.com/thibaultmiclo/aula-driver
- Electron WebHID permission and device-selection APIs: https://www.electronjs.org/docs/latest/tutorial/devices
- QMK RGB Matrix effects catalogue (inspiration for Studio renderers): https://docs.qmk.fm/features/rgb_matrix

This project is unofficial and is not affiliated with AULA or EPOMAKER.


## v0.7.0 startup regression fix

Declared the two reactive HID lookup variables before `init()` runs. In v0.6.2, assignment to the undeclared `reactiveInputMap` in the strict ES module threw a `ReferenceError` before the UI rendered, hiding both native and custom effect lists. The reactive-input test now asserts both declarations exist. The effect definitions from v0.6.3 were retained unchanged in that fix; v0.7.0 later expanded the library to 120.


## Version 0.7.0 — expanded effect and palette library

The Studio effect catalogue now contains 120 software-rendered animations. New families include nature, cinematic, geometric, party, rhythm and extended reactive patterns. The Curated Colour Palettes panel offers 18 multi-stop themes plus Custom colour; the original individual colour picker remains available. Palette and selected effect are stored with the local profile. These are PC-rendered frames sent through the existing AULA Real-time Lighting stream; they do not add firmware-native effect IDs.


### Curated palettes

The palette chooser provides Aurora, Arctic Ice, Sakura, Sunset, Deep Ocean, Ember, Cyberpunk, Lavender Dream, Enchanted Forest, Royal Amethyst, Cotton Candy, Toxic Neon, Champagne Gold, Dracula, Nord, Moonlight, Redline, Citrus Pop, and Custom colour. Selecting a preset palette interpolates across its colour stops when generating each LED frame. Choosing a colour in the original colour picker or quick swatches selects Custom colour, so the picker remains useful and is not overridden by a preset. Palette selection is saved in local app state and profile export.


## v0.8.0 — smoother live effects and per-effect tuning

- Added independent Studio-effect speed (25–200%) and brightness (25–200%) controls. They use their own 3/5 speed and full-brightness reference levels, so native AULA speed/brightness settings do not alter custom Studio effects.
- Added effect-aware automatic brightness suggestions for dimmer patterns such as pixel rain, digital rain, starlight, reactive effects and snow effects. Manual brightness remains available at all times.
- Added direct numeric RGB rendering for the USB stream. Hardware frames no longer pass through CSS `rgb()` strings and regular-expression parsing before packet construction.
- Added cached palette parsing and reusable HID report views/backing frame buffer to reduce steady-state allocations.
- Throttled the decorative on-screen keycap repaint to 10 FPS while the hardware stream continues at the keyboard's captured cadence, reducing UI rendering jitter.
- Changed the frame scheduler to completion-based pacing with a 2 ms minimum inter-frame idle, preventing catch-up bursts if a USB transfer runs long.
- Kept the captured 58.7 ms target cadence; the actual physical rate depends on HID transfer timing and firmware response. No unverified high-speed protocol timings were introduced.
- Preserved all 120 effects, 19 palettes, global reactive capture, existing profiles, and LED mapping 95–98.

## Publish to GitHub

On Windows, install [Git](https://git-scm.com/download/win) and [GitHub CLI](https://cli.github.com/), then run `PUBLISH-TO-GITHUB.bat`. The script signs in through GitHub CLI if needed, creates a local `main` commit, asks for the repository name and public/private visibility, creates the GitHub repository when it does not already exist, and pushes the branch. It does not embed or save a personal access token in the project.