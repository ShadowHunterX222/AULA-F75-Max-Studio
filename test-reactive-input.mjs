import assert from 'node:assert/strict';
import fs from 'node:fs';

const keys = JSON.parse(fs.readFileSync(new URL('./keymap.json', import.meta.url), 'utf8'));
const map = JSON.parse(fs.readFileSync(new URL('./reactive-key-map.json', import.meta.url), 'utf8'));
const supported = keys.filter(key => !['Fn', 'LED98'].includes(key.name));
const browserUsages = new Set(Object.values(map.browserCodeToHidUsage));
const nativeUsages = new Set(Object.values(map.uiohookNameToHidUsage));

assert.equal(keys.length, 82, 'F75 Max layout must contain 82 key/LED positions.');
assert.equal(supported.length, 80, 'Only Fn and the unassigned LED98 slot lack normal host key events.');
for (const key of supported) {
  assert.ok(browserUsages.has(Number(key.code)), `Browser event map must cover ${key.name} / usage 0x${Number(key.code).toString(16)}.`);
  assert.ok(nativeUsages.has(Number(key.code)), `Global hook map must cover ${key.name} / usage 0x${Number(key.code).toString(16)}.`);
}
assert.equal(new Set(keys.map(key => Number(key.light_index))).size, 82, 'Every physical LED slot must be unique.');
assert.equal(keys.find(key => key.name === 'Alt_R').light_index, 95);
assert.equal(keys.find(key => key.name === 'Fn').light_index, 96);
assert.equal(keys.find(key => key.name === 'Ctrl_R').light_index, 97);
assert.equal(keys.find(key => key.name === 'LED98').light_index, 98);
assert.equal(map.browserCodeToHidUsage.KeyA, 0x04);
assert.equal(map.browserCodeToHidUsage.Digit1, 0x1e);
assert.equal(map.browserCodeToHidUsage.ShiftRight, 0xe5);
assert.equal(map.browserCodeToHidUsage.ArrowUp, 0x52);
assert.equal(map.browserCodeToHidUsage.PageDown, 0x4e);
assert.equal(map.uiohookNameToHidUsage.AltRight, 0xe6);
assert.equal(map.uiohookNameToHidUsage.CtrlRight, 0xe4);

const main = fs.readFileSync(new URL('./desktop/main.cjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('./desktop/preload.cjs', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
assert.match(main, /require\('uiohook-napi'\)/, 'Desktop global keyboard hook must be used for reactive hardware effects.');
assert.match(main, /desktop:global-keydown/, 'Main process must forward supported HID usages to the renderer.');
assert.match(main, /desktop:set-reactive-capture/, 'Renderer must control when the global hook is active.');
assert.match(main, /reactiveHook\.stop\(\)/, 'Global hook must stop when reactive effects stop.');
assert.match(preload, /onGlobalKeydown/, 'Preload must expose a narrow global-keydown subscription.');
assert.match(app, /let\s+reactiveInputMap\s*=/, 'Reactive HID map must be declared before app initialization.');
assert.match(app, /let\s+lightIndexByHidUsage\s*=\s*new Map\(/, 'LED lookup map must be declared before app initialization.');
assert.match(app, /lightIndexByHidUsage=new Map\(keys\.filter\(k=>Number\(k\.code\)>0\)/, 'Renderer must translate USB HID usages to actual LED indices.');
assert.match(app, /window\.aulaDesktop\?\.setReactiveCapture/, 'Renderer must enable global capture only for reactive hardware effects.');
console.log('PASS: browser and global key maps cover all 80 host-visible F75 Max keys; Fn is firmware-internal and LED98 is a light-only placeholder; all 82 LED indices stay unique; global input is reactive-only and stop-controlled.');