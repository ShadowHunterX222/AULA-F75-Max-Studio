# v0.9.3 — Smoother app switching and background rendering

- Restore Chromium's normal background frame throttling so the Studio window does not keep drawing at foreground rates when another app is active.
- Remove the switch that forced the renderer to retain foreground scheduling priority.
- Add native Electron focus/blur notifications and an initial focus-state query.
- Pause the software-only effect preview while Studio is unfocused, then resume it automatically on focus.
- Skip the on-screen keyboard DOM repaint and status updates while unfocused.
- Preserve the hardware real-time HID frame stream while another app has focus.
- Add regression tests for focus signaling, background rendering settings, preview suspension, and continued hardware streaming.
- No keyboard protocol, LED map, effect renderer, or reactive-key mapping changes.

