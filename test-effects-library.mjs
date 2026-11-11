import assert from 'node:assert/strict';
import { QMK_EFFECTS, COLOR_PALETTES, renderQmkEffectFrame } from './effects.js';
import { readFile } from 'node:fs/promises';

const keys = JSON.parse(await readFile(new URL('./keymap.json', import.meta.url), 'utf8'));
assert.equal(QMK_EFFECTS.length, 120, `expected 120 effects, got ${QMK_EFFECTS.length}`);
assert.equal(new Set(QMK_EFFECTS.map(e => e.id)).size, QMK_EFFECTS.length, 'effect IDs must be unique');
assert.equal(COLOR_PALETTES.length, 19, '18 curated palettes plus custom colour');
assert.equal(new Set(COLOR_PALETTES.map(p => p.id)).size, COLOR_PALETTES.length, 'palette IDs must be unique');
assert(keys.length >= 80, 'expected complete F75 Max layout');
const indexes = keys.map(k => Number(k.light_index));
assert.equal(new Set(indexes).size, indexes.length, 'LED indices must be unique');
for (const effect of QMK_EFFECTS) {
  const frame = renderQmkEffectFrame({ effectId: effect.id, keys, timeMs: 12345, color: '#9B82FF', speed: 3, brightness: 5, activity: new Map() });
  assert.equal(Object.keys(frame).length, keys.length, `${effect.id} must render every LED`);
  for (const idx of indexes) assert.match(frame[idx], /^rgb\(\d+, \d+, \d+\)$/i, `${effect.id} must render LED ${idx}`);
}
const aurora = renderQmkEffectFrame({ effectId: 'rainbow_wave', keys, timeMs: 1000, paletteColors: COLOR_PALETTES.find(p=>p.id==='aurora').colors });
const sakura = renderQmkEffectFrame({ effectId: 'rainbow_wave', keys, timeMs: 1000, paletteColors: COLOR_PALETTES.find(p=>p.id==='sakura').colors });
assert.notDeepEqual(aurora, sakura, 'palette changes should alter rendered frame');
// Exercise every effect with every curated multi-stop palette so palette-aware
// branches cannot silently return malformed LED colours.
for (const palette of COLOR_PALETTES.filter(p=>p.colors.length)) {
  for (const effect of QMK_EFFECTS) {
    const frame = renderQmkEffectFrame({ effectId: effect.id, keys, timeMs: 8765, color: '#9B82FF', speed: 4, brightness: 5, activity: new Map([[95, 8400],[12,8600]]), paletteColors: palette.colors });
    assert.equal(Object.keys(frame).length, keys.length, `${effect.id}/${palette.id} should render every LED`);
    assert.ok(Object.values(frame).every(c=>/^rgb\(\d+, \d+, \d+\)$/i.test(c)), `${effect.id}/${palette.id} should return valid RGB colours`);
  }
}

const baseBrightness = renderQmkEffectFrame({ effectId:'solid_color', keys, timeMs:2000, color:'#9B82FF', brightness:5, brightnessScale:0.5, activity:new Map(), outputFormat:'rgb' });
const boostedBrightness = renderQmkEffectFrame({ effectId:'solid_color', keys, timeMs:2000, color:'#9B82FF', brightness:5, brightnessScale:1.5, activity:new Map(), outputFormat:'rgb' });
assert.ok(boostedBrightness[1].reduce((a,b)=>a+b,0) > baseBrightness[1].reduce((a,b)=>a+b,0), 'brightnessScale must brighten the actual RGB output');
const slowRainbow = renderQmkEffectFrame({ effectId:'rainbow_wave', keys, timeMs:4200, speed:0.75, activity:new Map(), outputFormat:'rgb' });
const fastRainbow = renderQmkEffectFrame({ effectId:'rainbow_wave', keys, timeMs:4200, speed:6, activity:new Map(), outputFormat:'rgb' });
assert.notDeepEqual(slowRainbow, fastRainbow, 'speed must change the actual rendered frame');
for (const effect of QMK_EFFECTS) {
  const rgbFrame=renderQmkEffectFrame({effectId:effect.id,keys,timeMs:9876,speed:4.5,brightness:5,brightnessScale:1.6,activity:new Map([[10,9000]]),paletteColors:COLOR_PALETTES[0].colors,outputFormat:'rgb'});
  assert.equal(Object.keys(rgbFrame).length,keys.length,`${effect.id} RGB frame must cover every LED`);
  for (const idx of indexes) assert.ok(Array.isArray(rgbFrame[idx]) && rgbFrame[idx].length===3 && rgbFrame[idx].every(v=>Number.isInteger(v)&&v>=0&&v<=255),`${effect.id} must produce valid integer RGB bytes for LED ${idx}`);
}

console.log(`Effects library OK: ${QMK_EFFECTS.length} effects x ${COLOR_PALETTES.filter(p=>p.colors.length).length} palettes, ${COLOR_PALETTES.length} palette choices, ${keys.length} LED slots.`);