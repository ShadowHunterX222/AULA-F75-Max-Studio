# v0.9.2 — Packaged global reactive input fix

- Explicitly include the complete `uiohook-napi` production package in Electron's file allowlist so the portable EXE cannot omit the runtime dependency.
- Unpack the `uiohook-napi` package and native `.node` binaries from ASAR for reliable native module loading.
- Pin npm install-script approvals for the native hook and Windows packaging helper, then rebuild Electron-native dependencies in both the local Windows build script and GitHub Actions before packaging.
- Extend the packaging regression test to verify the dependency, inclusion glob, ASAR unpack rules, and rebuild command.
- No keyboard mapping, HID protocol, lighting effect, or runtime behavior changes.

