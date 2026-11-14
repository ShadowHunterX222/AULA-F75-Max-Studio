import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const installedHook = JSON.parse(await readFile(new URL('./node_modules/uiohook-napi/package.json', import.meta.url), 'utf8'));
const installedLoader = JSON.parse(await readFile(new URL('./node_modules/node-gyp-build/package.json', import.meta.url), 'utf8'));

assert.equal(pkg.version, '0.9.2', 'native reactive-input packaging release version');
assert.equal(pkg.scripts['dist:win'], 'electron-builder --win portable --x64 --publish never');
assert.deepEqual(pkg.build.win.target, ['portable'], 'Windows build must produce only the portable target');
assert.equal(pkg.build.portable.artifactName, 'AULA-F75-Max-Studio-Portable-${version}.${ext}');
assert.equal(pkg.scripts['dist:win:installer'], undefined, 'installer build script must not be exposed');
assert.equal(pkg.build.nsis, undefined, 'NSIS installer configuration must not be present');
assert.equal(pkg.dependencies['uiohook-napi'], '1.5.5', 'global reactive input must remain a pinned production dependency');
assert.equal(installedHook.name, 'uiohook-napi', 'native reactive-input package must actually be installed before packaging');
assert.equal(installedHook.version, pkg.dependencies['uiohook-napi'], 'installed native hook version must match the pinned production dependency');
assert.equal(installedLoader.name, 'node-gyp-build', 'native addon loader must actually be installed before packaging');
assert.equal(pkg.allowScripts['uiohook-napi@1.5.5'], true, 'npm must be allowed to run the pinned native hook installer');
assert.equal(pkg.allowScripts['electron-winstaller@5.4.0'], true, 'npm must be allowed to run the pinned Windows packaging dependency installer');
assert.ok(pkg.build.files.includes('node_modules/uiohook-napi/**/*'), 'portable package must explicitly include the native input dependency');
assert.ok(pkg.build.files.includes('node_modules/node-gyp-build/**/*'), 'portable package must include uiohook-napi native loader dependency');
assert.ok(pkg.build.asarUnpack.includes('node_modules/uiohook-napi/**/*'), 'the native input package must be unpacked from ASAR');
assert.ok(pkg.build.asarUnpack.includes('node_modules/node-gyp-build/**/*'), 'the native module loader must be unpacked beside the hook');
assert.ok(pkg.build.asarUnpack.includes('**/*.node'), 'native addon binaries must be unpacked from ASAR');
assert.equal(pkg.scripts['rebuild:native'], 'electron-builder install-app-deps', 'native input must be rebuilt for the pinned Electron runtime');

console.log('PASS: Windows packaging is portable-EXE-only; no NSIS installer target remains.');
