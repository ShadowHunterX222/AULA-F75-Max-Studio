# v0.9.1 — Single portable Windows executable

- Changed the default Windows distribution to one x64 portable EXE.
- Removed the NSIS installer target and installer build script.
- Updated the Windows build batch file to approve the pinned native build scripts, run the full offline test suite, and produce the portable EXE only.
- Documented the Visual Studio C++ Build Tools prerequisite for compiling `uiohook-napi`.
- No keyboard protocol, lighting effect, or runtime feature changes.
