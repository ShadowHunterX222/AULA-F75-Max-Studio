# Protocol and implementation status — AULA F75 Max Studio v0.9.0

## Hardware identity

- Wired device: `VID_0C45`, `PID_800A`.
- Main command interface: USB `MI_03`, HID usage page `0xFF13`, usage `0x0001`, feature report ID 0.
- `MI_02` is not the custom lighting command collection.
- 2.4 GHz receiver ID `05AC:024F` now has a separate native RGB/settings transport using `0xFF60` 32-byte output reports. PC-rendered streaming, per-key RGB tables, remapping and macros remain USB-C-only.

## Real-time lighting stream

The app uses the built-in AULA/SONiX real-time lighting channel rather than the keyboard's 20 native firmware effect IDs or the persistent per-key colour table.

One-time host-control entry sequence:

1. `04 18` begin.
2. `04 28` select host-control/RTC mode (byte 8 = `01`).
3. Send a 64-byte host clock block (`00 01 5A ... AA 55`).
4. `04 02` apply/enter.

Steady-state frame sequence:

1. `04 20` frame header (byte 8 = 8).
2. Eight raw 64-byte RGB blocks (512 bytes total) containing 128 `[LED index, R, G, B]` records.
3. `04 02` commit the frame.

The F75 Max's 82 physical-key indices are packed in visual reading order. The remaining slots are zero-filled. The stream does not send `04 18` / `04 F0` transaction wrappers per frame and does not write `04 23` persistent RGB storage.

Real-time readbacks are consumed without applying the standard configuration ACK validator, matching the reference real-time helper. Normal configuration commands retain their standard ACK validation.

## Timing and performance

- Captured cadence: median ~58.7 ms between frame headers (~17 FPS) for a related `0C45:800A` interface capture.
- App targets that measured interval with monotonic completion-based pacing and a 2 ms minimum inter-frame idle, avoiding catch-up bursts if a transfer runs long.
- Frame packet payload is reused to reduce allocations.
- Layout geometry and LED-index lookups are compiled once and reused by all effect frames.
- The UI preview is not repainted while the app is hidden to the tray.
- These are host-side performance improvements. They do not establish a faster keyboard firmware/USB throughput limit.

## Desktop architecture

- Electron desktop window, packaged static UI, no external browser or Python requirement.
- Local HTTP server binds only to `127.0.0.1:48675`. A fixed origin keeps localStorage profiles and WebHID permission stable across launches.
- Main window close hides to tray; it does not exit the process.
- Narrow preload bridge communicates only lighting status and tray stop requests.
- Tray quit asks the renderer to stop the stream and restore the selected native AULA lighting mode before exiting.
- Launch-at-sign-in starts hidden to tray.
- The app blocks navigation away from its local origin and applies a restrictive Content Security Policy.

## Mapping

User's latest XML is authoritative:

| Physical slot | key_index | light_index |
|---|---:|---:|
| Alt_R | 95 | 95 |
| Fn | 96 | 96 |
| Ctrl_R | 97 | 97 |
| LED98 | 98 | 98 |

The four LED indices must remain distinct. LED98 has keycode `0x00` and is lighting-only.

## Verification

Automated offline tests cover:

- Four bottom-row LED positions and unique layout indices.
- All 120 custom effect entries and Rainbow Wave availability.
- Representative effect rendering and typing-reactive rendering.
- Eight-block 512-byte frame packet construction and reusable-buffer behavior.
- Host-control entry sequence and steady-state command order using a mocked HID interface.
- Native RGB table, remap table, macro buffer and settings packet shapes.

Not verified in this environment:

- Physical keyboard response to the host-control handshake on this exact F75 Max revision.
- Per-key LED order on every hardware batch.
- Long-duration 2.4 GHz receiver testing on the user’s physical keyboard, Bluetooth configuration, or LCD/GIF writes.
- A signed installer; Windows EXEs are generated locally using `BUILD-WINDOWS-EXE.bat`.

## Protocol references

- https://github.com/gavindi/Aula_L99_Linux/blob/main/tools/aula_l99_hacky/re_notes/color_stream.md
- https://github.com/Punkster81/AULA-F108-Driver/blob/main/aula_f108_pro_final.py
- https://github.com/gavindi/Aula_L99_Linux/blob/main/tools/aula_l99_hacky/protocol.py
- https://github.com/thibaultmiclo/aula-driver


## Desktop HID connection fix (v0.6.1)

- Enable Chromium's `disable-hid-blocklist` switch because the device is composite and exposes a vendor-defined command collection alongside keyboard collections.
- Restrict HID permission checks to the stable loopback Studio origin and VID/PID `0C45:800A`.
- The Electron permission/chooser layer matches the USB identity only because Electron can provide reduced HID descriptors without collection trees.
- The renderer remains the final authority: it searches nested collections and will only send commands after finding usage page `0xFF13`, usage `0x0001`, and feature report ID 0.
- Prefer `navigator.hid.getDevices()` for previously granted devices before issuing a fresh request; log available interface collections to make failures diagnosable.


## v0.6.2 reactive input update

Reactive effects now receive global Windows keydown activity through `uiohook-napi` while a reactive hardware effect is active. Only the numeric HID usage ID is forwarded; the application does not persist typed text or key history. The shared `reactive-key-map.json` maps the 80 host-visible keys in the F75 Max 82-slot layout to their true `light_index`. Fn is firmware-internal (not a normal host key event), and LED98 is an unassigned lighting-only position. The global hook is stopped whenever reactive hardware mode stops or Studio exits. The current hook is system-wide and does not identify the physical source keyboard.


## v0.7.0 app initialization fix

The v0.6.2 desktop regression came from two undeclared ES module variables (`reactiveInputMap` and `lightIndexByHidUsage`). Because modules execute in strict mode, `init()` stopped when it assigned the first one. This prevented `syncLightingUI()` and `renderQmkEffectCards()` from running. Both maps are now declared before initialization; the existing 120-effect catalogue and renderer are unchanged.


## v0.7.0 effect library

The UI includes 120 Studio-rendered effect definitions and 19 palette choices (18 curated multi-colour palettes plus Custom colour). They use the existing real-time frame renderer and are not flashed to firmware.


## Version 0.7.0 expansion

The effect library contains 120 software-generated animation patterns. 68 new algorithms were added across nature, cinematic, geometric, rhythm, party, ambient, motion and reactive categories. The 19 palette options comprise 18 curated multi-stop colour themes and a custom-colour mode. Palette gradients are sampled during frame generation and use the same volatile real-time RGB transport as existing effects. No firmware IDs are written.


## v0.8.0 renderer and tuning update

The custom-effect renderer can emit numeric RGB arrays directly for the hardware stream, eliminating the prior CSS `rgb()` string-to-byte regular-expression conversion for each LED on every frame. Palette stops are cached, and the HID transport reuses its 512-byte frame buffer plus eight pre-created 64-byte report views. The preview repaint is capped at 10 FPS while hardware streaming to reduce UI overhead. Frame pacing waits based on actual frame-send duration and keeps at least a 2 ms inter-frame idle, with the captured 58.7 ms frame target retained. Custom effect speed and brightness are independent of native AULA settings, adjustable from 25% to 200%, stored per selected effect, and included in local state/profile exports. Auto-brightness suggestions compensate for effects whose patterns are intentionally sparse or low-luminance.


## v0.9.0 — 2.4 GHz receiver transport

- USB-C path remains `0C45:800A`, command usage `FF13:0001`, 64-byte feature reports.
- 2.4 GHz receiver path is `05AC:024F`, raw output usage page `FF60`, output report ID 0, 32-byte reports.
- Wireless checksum is the low byte of the sum of report bytes 0–30, stored at byte 31.
- Native RGB update sends a 32-byte `0F` commit report, waits 50 ms, then sends a `05 10` RGB-mode report.
- Receiver performance/settings use a `07 10` report. The app converts the Settings panel’s zero-based response selector to firmware levels 1–5.
- The renderer rejects 05AC:024F devices without the FF60 output collection so Bluetooth HID is not mistakenly accepted as the receiver transport.
- Wired and wireless packets are kept in separate code paths. Wired 04 20 real-time frame streaming, persistent per-key RGB tables, keymap writes and macro writes are not sent over the 2.4 GHz transport.
- The 2.4 GHz packet builders and dispatch sequence have offline unit tests. Physical dongle testing is still required before treating this transport as hardware-verified on every F75 Max firmware revision.