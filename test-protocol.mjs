import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AulaHID, buildRgbTable, buildRemapTable, buildMacroBuffer, functionPacket, buildRealtimeFramePackets, buildRealtimeHostClockPacket, REALTIME_FRAME_MS } from './protocol.js';
import { QMK_EFFECTS, renderQmkEffectFrame } from './effects.js';

const keys = JSON.parse(fs.readFileSync(new URL('./keymap.json', import.meta.url), 'utf8'));
const alt = keys.find(k => k.name === 'Alt_R');
const fn = keys.find(k => k.name === 'Fn');
assert.equal(alt.key_index, 95); assert.equal(alt.light_index, 95);
assert.equal(fn.key_index, 96); assert.equal(fn.light_index, 96);
assert.equal(alt.x, 481); assert.equal(alt.w, 20);
assert.equal(fn.x, 501); assert.equal(fn.w, 20);
const rightCtrl=keys.find(k=>k.name==='Ctrl_R'); assert.equal(rightCtrl.key_index,97); assert.equal(rightCtrl.light_index,97); assert.equal(rightCtrl.visible,true); assert.equal(rightCtrl.x,521); assert.equal(rightCtrl.w,20);
const led98=keys.find(k=>k.name==='LED98'); assert.equal(led98.key_index,98); assert.equal(led98.light_index,98); assert.equal(led98.visible,true); assert.equal(led98.x,541); assert.equal(led98.w,20);
assert.equal(new Set(keys.map(k => k.light_index)).size, keys.length, 'LED indices should be unique');
assert.equal(QMK_EFFECTS.length, 120, 'The expanded Studio effect library should contain 120 effects.');
assert.ok(QMK_EFFECTS.some(e => e.id === 'rainbow_wave' && e.name === 'Rainbow Wave'), 'Rainbow Wave must appear in the effect picker.');
const rainbowWaveFrame=renderQmkEffectFrame({effectId:'rainbow_wave',keys,timeMs:1250,color:'#9B82FF',speed:3,brightness:5,activity:new Map()});
assert.equal(Object.keys(rainbowWaveFrame).length, keys.length, 'Rainbow Wave must render a colour for every LED.');
const frame=renderQmkEffectFrame({effectId:'cycle_left_right',keys,timeMs:1000,color:'#9B82FF',speed:3,brightness:5,activity:new Map()});
const typingFrame=renderQmkEffectFrame({effectId:'typing_heatmap',keys,timeMs:1500,color:'#9B82FF',speed:3,brightness:5,activity:new Map([[95,1000],[96,1300]])});
assert.equal(Object.keys(typingFrame).length,keys.length,'Reactive effects must render every key from cached LED geometry.');
assert.deepEqual(typingFrame,renderQmkEffectFrame({effectId:'typing_heatmap',keys,timeMs:1500,color:'#9B82FF',speed:3,brightness:5,activity:new Map([[95,1000],[96,1300]])}),'Cached geometry must render deterministic output.');
assert.equal(Object.keys(frame).length, keys.length, 'Each keyboard LED should receive a preview colour.');
assert.ok(Object.values(frame).every(c=>/^rgb\(\d+, \d+, \d+\)$/.test(c)), 'Preview should output RGB colours.');

const visualOrder=keys.slice().sort((a,b)=>a.y-b.y||a.x-b.x).map(k=>k.light_index);
const realtimeColors={95:[255,0,0],96:[0,255,0],97:[0,0,255],98:[40,50,60]};
const realtimePackets=buildRealtimeFramePackets(realtimeColors,visualOrder);
const reusableFrameBuffer=new Uint8Array(512);
const reusableViews=Array.from({length:8},(_,block)=>reusableFrameBuffer.subarray(block*64,(block+1)*64));
const reusedPackets=buildRealtimeFramePackets(realtimeColors,visualOrder,reusableFrameBuffer,reusableViews);
assert.equal(reusedPackets[0].buffer,reusableFrameBuffer.buffer,'Real-time HID should support a reusable frame buffer.');
assert.equal(reusedPackets[7].byteOffset,448,'Reusable packet blocks must be correctly offset views.');
assert.equal(reusedPackets,reusableViews,'Steady-state frame builder should reuse pre-created HID packet views.');
assert.equal(realtimePackets.length,8,'AULA real-time frames must contain exactly eight raw data blocks.');
assert.ok(realtimePackets.every(p=>p.length===64));
assert.equal(REALTIME_FRAME_MS,58.7,'Captured vendor stream cadence is about 17 FPS.');
const hostClock = buildRealtimeHostClockPacket(new Date(2026,2,9,0,1,2));
assert.equal(hostClock.length,64);
assert.deepEqual(Array.from(hostClock.slice(0,11)),[0x00,0x01,0x5a,0x1a,0x03,0x09,0x00,0x01,0x02,0x00,0x01]);
assert.deepEqual(Array.from(hostClock.slice(62)),[0xaa,0x55]);

// Mock the HID transport to pin the one-time host-control handshake and the
// steady-state frame sequence without requiring the physical keyboard.
const fakeDriver = new AulaHID(()=>{});
const sentReports=[];
fakeDriver.device={opened:true,sendFeatureReport:async(_id,data)=>sentReports.push(new Uint8Array(data)),receiveFeatureReport:async()=>{const ack=new Uint8Array(64);ack[3]=1;return ack;}};
fakeDriver.controlCollection={};
fakeDriver.transport='wired';
await fakeDriver.enterRealtimePreview();
assert.equal(fakeDriver.realtimeReady,true);
assert.deepEqual(Array.from(sentReports[0].slice(0,2)),[0x04,0x18]);
assert.deepEqual(Array.from(sentReports[1].slice(0,2)),[0x04,0x28]);
assert.equal(sentReports[1][8],1);
assert.deepEqual(Array.from(sentReports[2].slice(0,3)),[0x00,0x01,0x5a]);
assert.deepEqual(Array.from(sentReports[2].slice(62)),[0xaa,0x55]);
assert.deepEqual(Array.from(sentReports[3].slice(0,2)),[0x04,0x02]);
await fakeDriver.streamRealtimeFrame({95:[255,0,0],96:[0,255,0],97:[0,0,255],98:[40,50,60]},visualOrder);
assert.equal(sentReports.length,14,'4 setup reports + 04 20 + 8 blocks + 04 02');
assert.deepEqual(Array.from(sentReports[4].slice(0,2)),[0x04,0x20]);
assert.equal(sentReports[4][8],8);
assert.deepEqual(Array.from(sentReports[13].slice(0,2)),[0x04,0x02]);

const realtimePayload=Buffer.concat(realtimePackets.map(p=>Buffer.from(p)));
for(const [index,rgb] of [[95,[255,0,0]],[96,[0,255,0]],[97,[0,0,255]],[98,[40,50,60]]]){
  const slot=visualOrder.indexOf(index), offset=slot*4;
  assert.deepEqual(Array.from(realtimePayload.slice(offset,offset+4)),[index,...rgb],`LED ${index} must retain its own RGB slot.`);
}
assert.ok(realtimePayload.slice(visualOrder.length*4).every(v=>v===0),'Unused 128-slot stream space must be zero padding.');
assert.equal(realtimePayload.length,512,'Each real-time frame is exactly 512 bytes (8 x 64-byte reports).');


const rgb = buildRgbTable({95:'#FF0000',96:'#00FF00',98:'#0000FF'});
assert.equal(rgb.length, 576);
assert.deepEqual(Array.from(rgb.slice(95*4,95*4+4)), [95,255,0,0]);
assert.deepEqual(Array.from(rgb.slice(96*4,96*4+4)), [96,0,255,0]);
assert.deepEqual(Array.from(rgb.slice(98*4,98*4+4)), [98,0,0,255]);
assert.deepEqual(Array.from(rgb.slice(-2)), [0xaa,0x55]);

const remap = buildRemapTable({95:{kind:'key',key:0x04,mods:1},96:{kind:'disable'}});
assert.equal(remap.length,576);
assert.deepEqual(Array.from(remap.slice(95*4,95*4+4)),[0x02,0x01,0x04,0]);
assert.deepEqual(Array.from(remap.slice(96*4,96*4+4)),[0x05,0x03,0,0]);
assert.deepEqual(Array.from(remap.slice(-2)),[0xaa,0x55]);

const macro = buildMacroBuffer([{name:'Test',events:[{kind:'key_down',code:0x04,delay:30},{kind:'key_up',code:0x04,delay:30}]}]);
assert.equal(macro.length % 64,0);
assert.deepEqual(Array.from(macro.slice(-2)),[0xaa,0x55]);
const settings = functionPacket({disableWin:true,disableAltF4:false,disableAltTab:true,fnToggle:false,sleep:2,response:1});
assert.equal(settings.length,64);assert.equal(settings[2],1);assert.equal(settings[4],1);assert.deepEqual(Array.from(settings.slice(-2)),[0xaa,0x55]);
console.log('PASS: four bottom-row LED slots, unique 82-LED map, 120 effects including Rainbow Wave, cached/reactive effect rendering, reusable 512-byte frame buffer, AULA Real-time Lighting handshake and live frame packets and sender sequence, RGB table, remap table, macro buffer, settings packet.');