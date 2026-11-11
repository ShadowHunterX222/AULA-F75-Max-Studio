# AULA F75 Max Studio v0.8.0

## Smoother custom effects
- Direct RGB byte frames for hardware streaming; removes CSS-string to byte parsing per key per frame.
- Pre-parsed and cached palette stops.
- Reused the 512-byte realtime payload and eight HID report views instead of allocating new packet views for each frame.
- Reduced preview DOM repaints to up to 10 FPS while hardware output maintains its captured frame cadence.
- Completion-based frame pacing avoids bursty catch-up behavior on slower USB transactions.

## Custom effect tuning
- Independent per-effect speed slider: 25–200%.
- Independent per-effect brightness slider: 25–200%.
- Effect-aware auto brightness suggestions for dimmer effect families.
- Manual settings and automatic/manual mode persist in Studio state and exported profiles.

## Preserved
- All 120 Studio effects and 19 palettes.
- Native AULA effect controls and existing per-key editor.
- Global reactive input and desktop tray behavior.
- Exact 82 LED slot map, including Alt_R 95, Fn 96, Ctrl_R 97 and LED98 98.

The HID packet timing remains based on the captured AULA F75 Max stream (58.7 ms target); this release optimizes host-side rendering and allocation rather than assuming an unverified faster device cadence.