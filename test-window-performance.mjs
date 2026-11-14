import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('./desktop/main.cjs', import.meta.url), 'utf8');
const preload = await readFile(new URL('./desktop/preload.cjs', import.meta.url), 'utf8');
const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

// Keep background HID timers running, but allow Chromium to reduce background
// rendering work and Windows to schedule the unfocused renderer normally.
assert.match(main, /appendSwitch\('disable-background-timer-throttling'\)/, 'Background timer throttling must stay disabled for the live HID stream.');
assert.doesNotMatch(main, /disable-renderer-backgrounding/, 'Do not force the renderer to retain foreground scheduling priority.');
assert.match(main, /backgroundThrottling:\s*true/, 'Normal background frame throttling must be enabled.');
assert.match(main, /mainWindow\.on\('blur',[\s\S]*?notifyWindowFocus\(false\)/, 'Main process must notify the renderer when Studio loses focus.');
assert.match(main, /mainWindow\.on\('focus',[\s\S]*?notifyWindowFocus\(true\)/, 'Main process must notify the renderer when Studio regains focus.');
assert.match(main, /windowFocused:\s*Boolean\(mainWindow[\s\S]*?isFocused\(\)/, 'Runtime info must report initial native focus state.');

assert.match(preload, /onWindowFocus\(callback\)/, 'Preload must expose a narrow focus subscription.');
assert.match(preload, /desktop:window-focus/, 'Preload must subscribe to the native focus IPC event.');

assert.match(app, /let desktopWindowFocused = true/, 'Renderer must track native window focus.');
assert.match(app, /function setDesktopWindowFocus\(focused\)/, 'Renderer must have a focus-state handler.');
assert.match(app, /cancelAnimationFrame\(effectRaf\);effectRaf=0/, 'Software preview RAF must stop when the window loses focus.');
assert.match(app, /requestAnimationFrame\(effectPreviewLoop\)/, 'Software preview RAF must resume when the window regains focus.');
assert.match(app, /!desktopWindowFocused \|\| document\.hidden/, 'Keyboard DOM repaint must be skipped while Studio is unfocused.');
assert.match(app, /frameStart-lastPreviewPaint>=100 && desktopWindowFocused/, 'Hardware preview painting must be skipped while Studio is unfocused.');
assert.match(app, /await driver\.streamRealtimeFrame\(frame,ledIndices\)/, 'Hardware LED streaming must continue while Studio is unfocused.');

console.log('PASS: unfocused Studio pauses nonessential preview painting while preserving the hardware frame stream.');
