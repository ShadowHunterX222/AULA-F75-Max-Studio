# v0.9.0 — 2.4 GHz receiver support

- Added Auto detect, USB-C wired, and 2.4 GHz receiver selection.
- Added receiver endpoint validation for VID/PID `05AC:024F`, output usage page `0xFF60`, and report ID 0.
- Added checksum-protected 32-byte native RGB and receiver settings reports.
- Added separate wired/wireless dispatch so wired 64-byte feature commands are never sent to the receiver.
- Kept PC-rendered 120-effect streaming, per-key RGB, remapping, and macros explicitly USB-C-only.
- Updated the diagnostics UI, README, protocol notes, Windows build output names, and proprietary license file.
- Preserved the v0.8.1 Light Chase fix, all 120 effects, 19 palette choices, reactive input, and 82-slot LED map.

The wireless packet builders and mock transport are covered by offline tests. The dongle and keyboard still need a physical 2.4 GHz hardware test on the target machine; no physical-device validation is claimed for this release.