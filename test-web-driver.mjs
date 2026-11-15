import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./web/index.html', import.meta.url), 'utf8');
const mode = fs.readFileSync(new URL('./web/web-mode.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./web/web-mode.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const protocol = fs.readFileSync(new URL('./protocol.js', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('./.github/workflows/deploy-web.yml', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

assert.match(html, /AULA F75 Max Studio — Web Driver/);
assert.match(html, /id="webDriverBanner"/);
assert.match(html, /web-mode\.js/);
assert.match(html, /type="module" src="app\.js"/);
assert.match(html, /href="styles\.css"/);
assert.match(mode, /window\.isSecureContext/);
assert.match(mode, /"hid" in navigator/);
assert.match(mode, /cannot capture global keystrokes/i);
assert.match(css, /\.web-driver-banner/);
assert.match(app, /Browser reactive input/);
assert.match(app, /visibilitychange/);
assert.match(protocol, /browser may be blocking its vendor HID interface/i);
assert.match(workflow, /actions\/deploy-pages@v4/);
assert.match(workflow, /keymap\.json/);
assert.ok(pkg.scripts.test.includes('test-web-driver.mjs'));

console.log('Browser Web Driver checks passed.');
