# v0.9.2 — Packaged global reactive input fix

- Explicitly include the complete `uiohook-napi` production package in Electron's file allowlist so the portable EXE cannot omit the runtime dependency.
- Unpack both `uiohook-napi` and its `node-gyp-build` loader, then load the hook using an absolute path from `resources/app.asar.unpacked` to avoid ASAR module-resolution failures.
- Pin npm install-script approvals for the native hook and Windows packaging helper, then rebuild Electron-native dependencies in both the local Windows build script and GitHub Actions before packaging.
- Extend the packaging regression test to verify the dependency, inclusion glob, ASAR unpack rules, and rebuild command.
- No keyboard mapping, HID protocol, lighting effect, or runtime behavior changes.

