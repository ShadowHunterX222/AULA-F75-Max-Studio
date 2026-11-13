import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));

assert.equal(pkg.version, '0.9.1', 'packaging-only release version');
assert.equal(pkg.scripts['dist:win'], 'electron-builder --win portable --x64 --publish never');
assert.deepEqual(pkg.build.win.target, ['portable'], 'Windows build must produce only the portable target');
assert.equal(pkg.build.portable.artifactName, 'AULA-F75-Max-Studio-Portable-${version}.${ext}');
assert.equal(pkg.scripts['dist:win:installer'], undefined, 'installer build script must not be exposed');
assert.equal(pkg.build.nsis, undefined, 'NSIS installer configuration must not be present');

console.log('PASS: Windows packaging is portable-EXE-only; no NSIS installer target remains.');
