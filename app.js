import { AulaHID, buildRemapTable, buildMacroBuffer, REALTIME_FRAME_MS } from './protocol.js';
import { QMK_EFFECTS, COLOR_PALETTES, renderQmkEffectFrame } from './effects.js';

const $ = id => document.getElementById(id);
const MODES = [
  ['Off','●','No lighting'],['Static','●','Solid colour'],['Single On','✦','Single key glow'],['Single Off','○','Single key fade'],
  ['Glittering','✧','Sparkle'],['Falling','⋱','Falling light'],['Colourful','◌','Multi colour'],['Breathing','◒','Pulse'],
  ['Spectrum','🌈','Spectrum cycle'],['Outward','◎','From centre'],['Scrolling','≋','Horizontal scroll'],['Rolling','▥','Wave roll'],
  ['Rotating','◉','Rotation'],['Explode','✣','Burst'],['Launch','↗','Launch'],['Ripples','◍','Ripple'],
  ['Flowing','≈','Flow'],['Pulsating','◌','Pulse cycle'],['Tilt','⌁','Tilt'],['Shuttle','⇆','Shuttle']
];
const KEY_CHOICES = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((n,i)=>[n,0x04+i]),
  ...'1234567890'.split('').map((n,i)=>[n,i===9?0x27:0x1e+i]),
  ['Enter',0x28],['Escape',0x29],['Backspace',0x2a],['Tab',0x2b],['Space',0x2c],['-',0x2d],['=',0x2e],['[',0x2f],[']',0x30],['\\',0x31],[';',0x33],["'",0x34],['`',0x35],[',',0x36],['.',0x37],['/',0x38],['Caps Lock',0x39],
  ...Array.from({length:12},(_,i)=>[`F${i+1}`,0x3a+i]),['Print Screen',0x46],['Scroll Lock',0x47],['Pause',0x48],['Insert',0x49],['Home',0x4a],['Page Up',0x4b],['Delete',0x4c],['End',0x4d],['Page Down',0x4e],['Right',0x4f],['Left',0x50],['Down',0x51],['Up',0x52],
  ['Left Ctrl',0xe0],['Left Shift',0xe1],['Left Alt',0xe2],['Left Win',0xe3],['Right Ctrl',0xe4],['Right Shift',0xe5],['Right Alt',0xe6]
];
const $KEYNAME = new Map(KEY_CHOICES.map(([name,code])=>[code,name]));
const DEFAULT_LIGHT = { mode:11, color:'#9B82FF', rainbow:true, brightness:5, speed:3, direction:0 };
const DEFAULT_SETTINGS = { disableWin:false, disableAltF4:false, disableAltTab:false, fnToggle:false, sleep:0, response:0 };
let keys = [];
let customEditing = false;
let toastTimer = null;
let pendingRiskAction = null;
let selectedLayer = 'base';
let selectedKeyIndex = null;
let selectedMacroIndex = null;
let driver;
let effectRaf = 0;
let effectActivity = new Map();
let hardwareEffectRunning = false;
let hardwareEffectTask = null;
let lightingKeyNodes = new Map();
// Reactive-input lookup tables are populated during init() from the bundled
// layout and key-map JSON. Declare them before init so startup cannot throw.
let reactiveInputMap = { browserCodeToHidUsage: {}, uiohookNameToHidUsage: {} };
let lightIndexByHidUsage = new Map();

const state = {
  lighting: {...DEFAULT_LIGHT}, perKeyColors:{}, lightingSelection:[],
  keymaps:{base:{}, fn:{}}, macros:[], settings:{...DEFAULT_SETTINGS}, profiles:[], effectLab:{selected:'cycle_all', palette:'aurora', speedPercent:100, brightnessPercent:115, brightnessAuto:true, controlsByEffect:{}, preview:false}
};

function log(message, kind='info') {
  const box = $('activityLog');
  if (!box) return;
  const empty = box.querySelector('.log-empty'); if (empty) empty.remove();
  const row = document.createElement('div'); row.className='log-line';
  const t = document.createElement('span'); t.className='time'; t.textContent = `[${new Date().toLocaleTimeString()}] `;
  const m = document.createElement('span'); m.className = kind==='ok'?'ok':kind==='error'?'err':''; m.textContent=message;
  row.append(t,m); box.prepend(row);
  while(box.children.length>35) box.lastElementChild.remove();
}
function toast(message, kind='info') {
  const t=$('toast'); t.textContent=message; t.className='toast show';
  if(kind==='error') t.style.borderColor='#9f5059'; else t.style.borderColor='';
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
}
function swapLegacyAltFnLedColors(colors) {
  if(!colors || typeof colors!=='object') return;
  const alt=colors['95'], fn=colors['96'];
  if(fn===undefined) delete colors['95']; else colors['95']=fn;
  if(alt===undefined) delete colors['96']; else colors['96']=alt;
}
function saveState() {
  try { localStorage.setItem('aula-f75-studio-state', JSON.stringify({ledMapVersion:2,lighting:state.lighting,perKeyColors:state.perKeyColors,keymaps:state.keymaps,macros:state.macros,settings:state.settings,profiles:state.profiles,effectLab:{...state.effectLab,preview:false}})); }
  catch(e){ console.warn('Could not persist app state',e); }
}
function loadState() {
  try {
    const saved=JSON.parse(localStorage.getItem('aula-f75-studio-state')||'null');
    if(saved && typeof saved==='object') {
      Object.assign(state.lighting, saved.lighting||{});
      state.perKeyColors=saved.perKeyColors||{};
      state.profiles=Array.isArray(saved.profiles)?saved.profiles:[];
      if(saved.ledMapVersion!==2){
        swapLegacyAltFnLedColors(state.perKeyColors);
        state.profiles.forEach(profile=>{if(profile?.data?.perKeyColors)swapLegacyAltFnLedColors(profile.data.perKeyColors);});
      }
      state.keymaps={base:{},fn:{},...(saved.keymaps||{})};
      state.keymaps.base=state.keymaps.base||{}; state.keymaps.fn=state.keymaps.fn||{};
      state.macros=Array.isArray(saved.macros)?saved.macros:[];
      state.settings={...DEFAULT_SETTINGS,...(saved.settings||{})};
      state.effectLab={selected:'cycle_all',palette:'aurora',speedPercent:100,brightnessPercent:115,brightnessAuto:true,controlsByEffect:{},...(saved.effectLab||{}),preview:false};
      state.effectLab.controlsByEffect=state.effectLab.controlsByEffect||{};
    }
  } catch(e){ console.warn('Saved state could not be read',e); }
}

function setConnected(connected, name='AULA F75 Max') {
  const status=$('connectionStatus'), button=$('connectBtn'), dot=$('sidebarDot');
  status.classList.toggle('connected',connected); dot.classList.toggle('connected',connected);
  status.querySelector('span').textContent=connected?`Connected · ${name}`:'Not connected';
  button.innerHTML=connected?'<span>×</span> Disconnect':'<span>↯</span> Connect keyboard';
  $('diagConnection').textContent=connected?'Connected':'Disconnected';
}

function showRisk(message, action) {
  pendingRiskAction=action;
  $('riskText').textContent=message;
  $('riskConfirm').checked=false; $('riskContinue').disabled=true;
  $('riskDialog').showModal();
}

function populateKeyOptions() {
  const select=$('targetKey');
  KEY_CHOICES.forEach(([name,code])=>{
    const o=document.createElement('option'); o.value=String(code); o.textContent=name; select.append(o);
  });
}
function shortLabel(k) {
  const aliases={'Escape':'Esc','Backspace':'⌫','CapsLock':'Caps','Shift_L':'Shift','Shift_R':'Shift','Ctrl_L':'Ctrl','Ctrl_R':'Ctrl','Win_L':'Win','Alt_L':'Alt','Alt_R':'Alt','page up':'PgUp','page down':'PgDn','end':'End','←':'←','↓':'↓','↑':'↑','→':'→'};
  if(k.name==='LED98') return '98';
  if(aliases[k.name]) return aliases[k.name];
  if(k.name==='Fn') return 'Fn';
  if(k.name==='Space') return 'Space';
  if(k.w<=24) return k.name.replace(/[^A-Za-z0-9]/g,'').slice(0,1)||'•';
  return k.label || k.name;
}
function renderKeyboard(targetId, type) {
  const host=$(targetId); if(!host || !keys.length) return;
  host.replaceChildren();
  if(targetId==='lightingKeyboard') lightingKeyNodes=new Map();
  keys.filter(k=>k.visible!==false).forEach(k=>{
    const button=document.createElement('button');
    button.type='button'; button.className='keycap';
    button.style.left=`${k.x}px`; button.style.top=`${k.y}px`; button.style.width=`${k.w}px`; button.style.height=`${k.h}px`;
    button.style.fontSize=k.w<28?'7px':(k.w>55?'8px':'9px');
    button.textContent=shortLabel(k);
    button.title=`${k.name} · remap index ${k.key_index} · LED index ${k.light_index}`;
    button.dataset.keyIndex=String(k.key_index); button.dataset.lightIndex=String(k.light_index);
    if(k.name==='LED98') button.classList.add('blank');
    if(type==='lighting') {
      const color=state.perKeyColors[String(k.light_index)];
      lightingKeyNodes.set(Number(k.light_index),button);
      if(color) { button.style.background=`linear-gradient(145deg,${color},${shade(color,-45)})`; button.style.borderColor=color; button.classList.add('modified'); }
      if(state.lightingSelection.includes(k.light_index)) button.classList.add('selected');
      button.addEventListener('click',ev=>{
        if(ev.ctrlKey||ev.metaKey||ev.shiftKey) {
          const s=new Set(state.lightingSelection); s.has(k.light_index)?s.delete(k.light_index):s.add(k.light_index); state.lightingSelection=[...s];
        } else state.lightingSelection=[k.light_index];
        renderKeyboard('lightingKeyboard','lighting');
        updateCustomToolsSelection();
      });
    } else {
      const action=state.keymaps[selectedLayer]?.[String(k.key_index)];
      if(action && action.kind && action.kind!=='default') button.classList.add('modified');
      if(selectedKeyIndex===k.key_index) button.classList.add('selected');
      button.addEventListener('click',()=>{
        selectedKeyIndex=k.key_index;
        if(k.name==='LED98') toast('That slot is reserved for lighting and cannot be remapped.');
        else updateActionEditor(k);
        renderKeyboard('keymapKeyboard','keymap');
      });
    }
    host.append(button);
  });
}
function shade(hex, amount) {
  const raw=hex.replace('#',''); const rgb=[0,2,4].map(i=>parseInt(raw.slice(i,i+2),16));
  return '#'+rgb.map(c=>Math.max(0,Math.min(255,c+amount)).toString(16).padStart(2,'0')).join('');
}

function renderModes() {
  const host=$('modeGrid'); host.replaceChildren();
  MODES.forEach((m,i)=>{
    const b=document.createElement('button'); b.className='mode-card'+(state.lighting.mode===i?' active':''); b.type='button';
    const icon=document.createElement('span'); icon.className='mode-icon'; icon.textContent=m[1];
    const name=document.createElement('span'); name.className='mode-name'; name.textContent=m[0];
    const sub=document.createElement('div'); sub.className='mode-sub'; sub.textContent=m[2];
    b.append(icon,name,sub); b.addEventListener('click',()=>{state.lighting.mode=i; renderModes(); saveState();}); host.append(b);
  });
}
function isReactiveEffect(){ return effectDefinition().category==='reactive'; }
function recordReactiveActivity(hidUsage){
  const lightIndex=lightIndexByHidUsage.get(Number(hidUsage));
  if(lightIndex!==undefined) effectActivity.set(lightIndex,performance.now());
}
function syncDesktopReactiveCapture(){
  const enabled=Boolean(window.aulaDesktop?.isDesktop && hardwareEffectRunning && isReactiveEffect());
  try { window.aulaDesktop?.setReactiveCapture?.(enabled); } catch {}
}
function registerDesktopReactiveInput(){
  window.aulaDesktop?.onGlobalKeydown?.(hidUsage=>{
    if(hardwareEffectRunning && isReactiveEffect()) recordReactiveActivity(hidUsage);
  });
  window.aulaDesktop?.onReactiveInputStatus?.(({active,error})=>{
    if(active) log('Global reactive input enabled. Only key positions are used; typed text is not recorded.','ok');
    else if(error) { log(`Global reactive input unavailable: ${error}`,'error'); toast('Reactive input listener unavailable. See Activity Log.','error'); }
  });
}

function selectedPalette(){return COLOR_PALETTES.find(p=>p.id===state.effectLab.palette)||COLOR_PALETTES[0];}
function paletteColors(){const p=selectedPalette();return p.id==='custom'?[]:p.colors;}
function renderPaletteGrid(){
  const host=$('paletteGrid');if(!host)return;host.replaceChildren();
  COLOR_PALETTES.forEach(p=>{
    const b=document.createElement('button');b.type='button';b.className='palette-card'+(state.effectLab.palette===p.id?' active':'');b.dataset.paletteId=p.id;b.title=p.description;
    const strip=document.createElement('span');strip.className='palette-strip';
    const colors=p.colors.length?p.colors:[state.lighting.color];p.colors.length?colors.forEach(c=>{const i=document.createElement('i');i.style.background=c;strip.append(i);}):(()=>{const i=document.createElement('i');i.style.background=state.lighting.color;strip.append(i);})();
    const name=document.createElement('strong');name.textContent=p.name;const desc=document.createElement('small');desc.textContent=p.description;
    b.append(strip,name,desc);b.addEventListener('click',()=>{state.effectLab.palette=p.id;renderPaletteGrid();saveState();if($('effectPreviewStatus'))$('effectPreviewStatus').textContent=`Palette · ${p.name}`;if(state.effectLab.preview)renderEffectPreviewFrame(performance.now());});host.append(b);
  });
  const active=$('paletteActiveName');if(active)active.textContent=selectedPalette().name;
}

function renderQmkEffectCards() {
  const host=$('qmkEffectGrid'); if(!host) return;
  const query=($('effectSearch').value||'').trim().toLowerCase();
  const category=$('effectCategory').value;
  const filtered=QMK_EFFECTS.filter(effect=>(category==='all'||effect.category===category) &&
    (!query||`${effect.name} ${effect.description} ${effect.id}`.toLowerCase().includes(query)));
  host.replaceChildren();
  filtered.forEach(effect=>{
    const b=document.createElement('button'); b.type='button';
    b.className='qmk-effect-card'+(state.effectLab.selected===effect.id?' active':'');
    b.dataset.effectId=effect.id;
    const name=document.createElement('strong'); name.textContent=effect.name;
    const desc=document.createElement('span'); desc.textContent=effect.description;
    const tag=document.createElement('small'); tag.textContent=effect.aulaMode===null?'Live RGB stream · Studio effect':`Live RGB stream · Native match: ${MODES[effect.aulaMode][0]}`;
    b.append(name,desc,tag);
    b.addEventListener('click',()=>{
      cacheCurrentEffectControls();
      state.effectLab.selected=effect.id;
      activateEffectControls(effect.id);
      renderQmkEffectCards(); syncEffectTuningUI(); saveState();
      if(hardwareEffectRunning) { publishDesktopLightingState(true); syncDesktopReactiveCapture(); }
      if(state.effectLab.preview){$('effectPreviewStatus').textContent=`Previewing · ${effect.name}`;renderEffectPreviewFrame(performance.now());}
    });
    host.append(b);
  });
  const count=$('effectCount'); if(count) count.textContent=`${filtered.length} / ${QMK_EFFECTS.length} EFFECTS`;
  if(!filtered.length){const empty=document.createElement('div');empty.className='effect-empty';empty.textContent='No effects match this search.';host.append(empty);}
}
function effectDefinition(){ return QMK_EFFECTS.find(e=>e.id===state.effectLab.selected)||QMK_EFFECTS[0]; }
const EFFECT_BRIGHTNESS_PRESETS = Object.freeze({
  raindrops:155, jellybean_raindrops:145, pixel_rain:165, digital_rain:150,
  starlight:155, starlight_smooth:140, starlight_dual_hue:150, starlight_dual_sat:145,
  typing_heatmap:160, snowfall:145, pixel_snow:155, frost:135, starfield:140,
  fire:135, embers:145, meteor_shower:145, fireworks:150, confetti:140,
  solid_reactive_simple:150, solid_reactive:145, solid_reactive_wide:145,
  solid_reactive_multiwide:145, solid_reactive_cross:145, solid_reactive_multicross:145,
  solid_reactive_nexus:150, solid_reactive_multinexus:150, splash:145, multisplash:145,
  solid_splash:150, solid_multisplash:150, reactive_afterglow:150, reactive_tap_spark:155,
  reactive_ripple_rainbow:145, reactive_burst:150, reactive_dots:155, reactive_echo:150,
  reactive_edge:145, reactive_row:145, reactive_column:145, reactive_neighbors:145,
  reactive_fade:150, reactive_glow:145, reactive_spectrum:145
});
function recommendedEffectBrightness(effectId=state.effectLab.selected){
  const effect=QMK_EFFECTS.find(item=>item.id===effectId);
  return EFFECT_BRIGHTNESS_PRESETS[effectId] ?? (effect?.category==='nature'?125:effect?.category==='cinematic'?120:effect?.category==='reactive'?145:115);
}
function tuningPercent(value,fallback){const n=Number(value);return Math.max(25,Math.min(200,Number.isFinite(n)?n:fallback));}
function cacheCurrentEffectControls(){
  if(!state.effectLab.controlsByEffect || typeof state.effectLab.controlsByEffect!=='object') state.effectLab.controlsByEffect={};
  state.effectLab.controlsByEffect[state.effectLab.selected]={
    speedPercent:tuningPercent(state.effectLab.speedPercent,100),
    brightnessPercent:tuningPercent(state.effectLab.brightnessPercent,recommendedEffectBrightness()),
    brightnessAuto:state.effectLab.brightnessAuto!==false
  };
}
function activateEffectControls(effectId){
  const saved=state.effectLab.controlsByEffect?.[effectId];
  if(saved){
    state.effectLab.speedPercent=tuningPercent(saved.speedPercent,100);
    state.effectLab.brightnessPercent=tuningPercent(saved.brightnessPercent,recommendedEffectBrightness(effectId));
    state.effectLab.brightnessAuto=saved.brightnessAuto!==false;
  }else{
    state.effectLab.speedPercent=100;
    state.effectLab.brightnessPercent=recommendedEffectBrightness(effectId);
    state.effectLab.brightnessAuto=true;
  }
  cacheCurrentEffectControls();
}
function effectRenderOptions(){
  return {
    speed:3*(tuningPercent(state.effectLab.speedPercent,100)/100),
    brightness:5,
    brightnessScale:tuningPercent(state.effectLab.brightnessPercent,115)/100
  };
}
function syncEffectTuningUI(){
  const speed=$('effectSpeed'),brightness=$('effectBrightness');
  if(speed){speed.value=String(state.effectLab.speedPercent??100);$('effectSpeedVal').textContent=`${state.effectLab.speedPercent??100}%`;}
  if(brightness){brightness.value=String(state.effectLab.brightnessPercent??115);$('effectBrightnessVal').textContent=`${state.effectLab.brightnessPercent??115}%`;}
  const mode=$('effectBrightnessMode');if(mode)mode.textContent=state.effectLab.brightnessAuto?'AUTO':'MANUAL';
}
function paintEffectPreviewFrame(frame){
  // The system-tray driver does not need to update 82 DOM nodes while hidden.
  if(document.hidden || lightingKeyNodes.size===0) return;
  for(const [lightIndex,button] of lightingKeyNodes){
    const raw=frame[lightIndex];
    if(raw){const color=Array.isArray(raw)?`rgb(${raw[0]}, ${raw[1]}, ${raw[2]})`:raw;button.style.background=color;button.style.borderColor=color;button.style.boxShadow='0 0 12px color-mix(in srgb, '+color+', transparent 58%)';}
  }
}
function renderEffectPreviewFrame(now){
  if(!keys.length) return;
  const frame=renderQmkEffectFrame({effectId:state.effectLab.selected,keys,timeMs:now,color:state.lighting.color,...effectRenderOptions(),activity:effectActivity,paletteColors:paletteColors()});
  paintEffectPreviewFrame(frame);
}
function effectPreviewLoop(now){
  if(!state.effectLab.preview) return;
  renderEffectPreviewFrame(now);
  effectRaf=requestAnimationFrame(effectPreviewLoop);
}
function stopEffectPreview(){
  state.effectLab.preview=false;
  hardwareEffectRunning=false;
  syncDesktopReactiveCapture();
  if(effectRaf) cancelAnimationFrame(effectRaf);
  effectRaf=0;
  const button=$('toggleEffectPreview'); if(button) button.textContent='Preview in Studio';
  const status=$('effectPreviewStatus'); if(status) status.textContent='Software preview stopped';
  renderKeyboard('lightingKeyboard','lighting');
  saveState();
}
async function toggleEffectPreview(){
  if(hardwareEffectRunning){await stopHardwareEffect(true);toast('Hardware effect stopped; native AULA lighting restored.');return;}
  if(state.effectLab.preview){stopEffectPreview();return;}
  state.effectLab.preview=true;
  $('toggleEffectPreview').textContent='Stop preview';
  $('effectPreviewStatus').textContent=`Previewing · ${effectDefinition().name}`;
  $('toggleEffectPreview').blur();
  saveState();
  if(effectRaf) cancelAnimationFrame(effectRaf);
  effectRaf=requestAnimationFrame(effectPreviewLoop);
}
const sleepMs = ms => new Promise(resolve => setTimeout(resolve, ms));
async function hardwareEffectLoop() {
  const ledIndices=keys.slice().sort((a,b)=>Number(a.y)-Number(b.y)||Number(a.x)-Number(b.x)).map(k=>Number(k.light_index));
  let frames=0, windowStart=performance.now(), lastPreviewPaint=0;
  while(hardwareEffectRunning && driver.connected) {
    const frameStart=performance.now();
    // Produce numeric RGB directly for HID: no CSS string formatting and no
    // per-frame regex parsing. The same frame is reused for the UI preview.
    const frame=renderQmkEffectFrame({effectId:state.effectLab.selected,keys,timeMs:frameStart,color:state.lighting.color,...effectRenderOptions(),activity:effectActivity,paletteColors:paletteColors(),outputFormat:'rgb'});
    // Painting 82 DOM keys at the USB frame rate can add renderer jitter.
    // Keep the physical stream at its stable cadence and refresh the optional
    // on-screen preview at up to 10 FPS while hardware streaming.
    if(frameStart-lastPreviewPaint>=100){paintEffectPreviewFrame(frame);lastPreviewPaint=frameStart;}
    await driver.streamRealtimeFrame(frame,ledIndices);
    frames++;
    if(frames%10===0) {
      const fps=(frames*1000/Math.max(1,performance.now()-windowStart)).toFixed(1);
      const status=$('effectPreviewStatus');
      if(status) status.textContent=`AULA Real-time Lighting · ${fps} FPS · ${effectDefinition().name}`;
      frames=0;windowStart=performance.now();
    }
    // Completion-based pacing prevents catch-up bursts after a slower USB
    // transfer. Effects use monotonic time, so visual phase never drifts.
    const spent=performance.now()-frameStart;
    await sleepMs(Math.max(2,REALTIME_FRAME_MS-spent));
  }
}
function publishDesktopLightingState(active){
  try { window.aulaDesktop?.setLightingState?.(Boolean(active),active?effectDefinition().name:''); } catch {}
}
async function stopHardwareEffect(restoreNative=true) {
  const wasRunning=hardwareEffectRunning;
  hardwareEffectRunning=false;
  syncDesktopReactiveCapture();
  if(hardwareEffectTask) { try { await hardwareEffectTask; } catch {} }
  hardwareEffectTask=null;
  publishDesktopLightingState(false);
  stopEffectPreview();
  const button=$('toggleEffectHardware'); if(button) button.textContent='Start real-time lighting';
  if(restoreNative && wasRunning && driver.connected) {
    await driver.applyLighting({mode:state.lighting.mode,rgb:[0,2,4].map(i=>parseInt(state.lighting.color.slice(1).slice(i,i+2),16)),rainbow:state.lighting.rainbow,brightness:state.lighting.brightness,speed:state.lighting.speed,direction:state.lighting.direction});
    $('effectPreviewStatus').textContent='Stopped · Native AULA lighting restored';
  }
}
async function toggleHardwareEffect() {
  if(hardwareEffectRunning) {
    await stopHardwareEffect(true);
    toast('Custom effect stopped; native AULA lighting restored.');
    return;
  }
  if(!driver.connected) return toast('Connect the F75 Max by USB-C in wired mode before starting a hardware effect.','error');
  const reactivePrivacy=isReactiveEffect()?`\n\nReactive input permission: this effect needs a global Windows keyboard listener while the effect is active, even when Studio is minimized or another app is focused. It listens to keyboard events from any keyboard attached to this PC, converts supported key positions to F75 Max LED indices, and does not record or store typed text. Stopping the effect disables the listener.`:'';
  showRisk(`This uses AULA's built-in Real-time Lighting mode. Studio first enters host-control mode once using the captured 04 18 → 04 28 → host clock block → 04 02 setup. Then each animation frame uses the vendor's steady-state 04 20 header, eight 64-byte colour blocks (512 bytes total, packed in visual order), and 04 02 frame commit. It does not use the persistent 04 23 per-key palette write or send 04 18 / 04 F0 on every frame. The packet order is adapted from captures for the 0C45:800A family and uses the supplied F75 Max 82-key layout. Stop the stream to restore native AULA lighting.${reactivePrivacy}`,async()=>{
    await driver.enterRealtimePreview();
    hardwareEffectRunning=true;
    syncDesktopReactiveCapture();
    publishDesktopLightingState(true);
    state.effectLab.preview=true;
    $('toggleEffectHardware').textContent='Stop real-time lighting';
    $('toggleEffectPreview').textContent='Stop Studio preview';
    $('effectPreviewStatus').textContent=`Starting hardware stream · ${effectDefinition().name}`;
    if(effectRaf) cancelAnimationFrame(effectRaf);
    effectRaf=0; // hardware loop owns preview updates while streaming
    hardwareEffectTask=hardwareEffectLoop().catch(async error=>{
      hardwareEffectRunning=false;hardwareEffectTask=null;syncDesktopReactiveCapture();publishDesktopLightingState(false);stopEffectPreview();
      $('toggleEffectHardware').textContent='Start real-time lighting';
      log(`Realtime RGB stream stopped: ${error.message}`,'error');
      toast(`Hardware effect stopped: ${error.message}`,'error');
      if(driver.connected) {
        try { await driver.applyLighting({mode:state.lighting.mode,rgb:[0,2,4].map(i=>parseInt(state.lighting.color.slice(1).slice(i,i+2),16)),rainbow:state.lighting.rainbow,brightness:state.lighting.brightness,speed:state.lighting.speed,direction:state.lighting.direction}); } catch (restoreError) { log(`Native lighting restore failed: ${restoreError.message}`,'error'); }
      }
    });
  });
}
async function useClosestNativeEffect(){
  const effect=effectDefinition();
  if(effect.aulaMode===null){toast('There is no close native AULA equivalent. Use AULA Real-time Lighting to stream the Studio-rendered version.');return;}
  await stopHardwareEffect(false);
  state.lighting.mode=effect.aulaMode;
  syncLightingUI(); saveState();
  toast(`${effect.name} mapped to AULA ${MODES[effect.aulaMode][0]}. Press Apply to keyboard to send it.`);
}
function capturePreviewTyping(event){
  if(!state.effectLab.preview) return;
  // The desktop global hook covers keys while another app is focused. Skip
  // window key events during hardware streaming so each press is counted once.
  if(hardwareEffectRunning && window.aulaDesktop?.isDesktop) return;
  if(event.target && /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)) return;
  const usage=reactiveInputMap.browserCodeToHidUsage?.[event.code];
  if(Number.isInteger(usage)) recordReactiveActivity(usage);
}

function syncLightingUI() {
  $('effectColor').value=state.lighting.color;
  $('colorHex').textContent=state.lighting.color.toUpperCase();
  $('brightness').value=state.lighting.brightness; $('brightnessVal').textContent=`${state.lighting.brightness} / 5`;
  $('speed').value=state.lighting.speed; $('speedVal').textContent=`${state.lighting.speed} / 5`;
  $('rainbow').checked=!!state.lighting.rainbow;
  document.querySelectorAll('#directionSeg button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.dir)===state.lighting.direction));
  renderModes(); renderKeyboard('lightingKeyboard','lighting');
}
function addCustomTools() {
  let tools=$('keyColorTools');
  if(tools) return tools;
  tools=document.createElement('div'); tools.id='keyColorTools'; tools.className='key-color-tools';
  tools.innerHTML=`<div class="key-tools-left"><span class="tool-overline">PER-KEY EDITOR</span><strong id="keyToolsSelection">No key selected</strong><small>Ctrl / Shift + click to select multiple keys</small></div><div class="key-tools-right"><input type="color" id="customKeyColor" value="#55D6BE" aria-label="Selected key colour"><button class="btn btn-outline" id="paintKeys">Set selected</button><button class="btn btn-quiet" id="clearKeys">Clear selected</button><button class="btn btn-primary" id="applyPerKey">Send custom RGB ↗</button></div>`;
  $('lightingKeyboard').parentElement.parentElement.after(tools);
  $('paintKeys').addEventListener('click',()=>{
    if(!state.lightingSelection.length) return toast('Select at least one key first.');
    const color=$('customKeyColor').value.toUpperCase();
    const ledKeys=new Set(keys.map(k=>k.light_index));
    state.lightingSelection.forEach(idx=>{ if(ledKeys.has(idx)) state.perKeyColors[String(idx)]=color; });
    saveState(); renderKeyboard('lightingKeyboard','lighting'); updateCustomToolsSelection(); toast('Selected key colours updated in the local profile.');
  });
  $('clearKeys').addEventListener('click',()=>{
    state.lightingSelection.forEach(idx=>delete state.perKeyColors[String(idx)]);
    saveState(); renderKeyboard('lightingKeyboard','lighting'); toast('Selected key colours cleared locally.');
  });
  $('applyPerKey').addEventListener('click',()=>{
    showRisk('Per-key RGB uses an experimental block-write command. The exact LED layout and command variant have not been verified on this device in this session.', async()=>{
      const colors={}; Object.entries(state.perKeyColors).forEach(([idx,hex])=>{colors[idx]=[0,2,4].map(i=>parseInt(hex.slice(1).slice(i,i+2),16));});
      await driver.applyPerKey(colors,state.lighting.brightness); toast('Per-key RGB command sent. Check the physical key positions.');
    });
  });
  return tools;
}
function updateCustomToolsSelection(){
  const el=$('keyToolsSelection'); if(!el) return;
  if(!state.lightingSelection.length) el.textContent='No key selected';
  else {
    const labels=state.lightingSelection.map(idx=>keys.find(k=>k.light_index===idx)?.name||`LED ${idx}`);
    el.textContent=labels.length>3?`${labels.slice(0,3).join(', ')} +${labels.length-3} more`:labels.join(', ');
  }
}

function navigate(tab) {
  document.querySelectorAll('.nav-item[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${tab}`));
  $('crumb').textContent=({lighting:'Lighting',keymap:'Key mapping',macros:'Macros',settings:'Settings',profiles:'Profiles'})[tab]||'Workspace';
  if(tab==='keymap') renderKeyboard('keymapKeyboard','keymap');
  if(tab==='profiles') renderProfiles();
}

function actionDescription(action={kind:'default'}) {
  switch(action.kind||'default') {
    case 'default':return 'Default'; case 'disable':return 'Disabled';
    case 'key': { const mods=[]; if(action.mods&1)mods.push('Ctrl');if(action.mods&2)mods.push('Shift');if(action.mods&4)mods.push('Alt');if(action.mods&8)mods.push('Win');return [...mods,$KEYNAME.get(action.key)||`Key 0x${Number(action.key).toString(16)}`].join('+'); }
    case 'consumer':return ({181:'Play / Pause',182:'Stop',183:'Next track',184:'Previous track',226:'Mute',233:'Volume up',234:'Volume down',205:'Email',130:'Calculator'})[action.code]||'Media action';
    case 'mouse':return 'Mouse action';case 'macro':return `Macro ${Number(action.macro||0)+1}`;case 'special':return `Special 0x${Number(action.code||0).toString(16).toUpperCase()}`;default:return 'Action';
  }
}
function updateActionEditor(key) {
  $('emptySelection').classList.add('hidden'); $('actionEditor').classList.remove('hidden');
  $('selectedKeyCaption').textContent=`${key.name} · ${selectedLayer==='base'?'Base layer':'Fn layer'}`;
  $('selectedKeyIndex').textContent=`KEY ${key.key_index}  /  LED ${key.light_index}`;
  const action=state.keymaps[selectedLayer]?.[String(key.key_index)]||{kind:'default'};
  $('actionType').value=action.kind||'default';
  $('targetKey').value=String(action.key??0x04);
  $('modCtrl').checked=!!(action.mods&1);$('modShift').checked=!!(action.mods&2);$('modAlt').checked=!!(action.mods&4);$('modWin').checked=!!(action.mods&8);
  $('consumerCode').value=String(action.code??181); $('mouseCode').value=(action.mouse||[1,0,0]).join(',');
  $('macroSlot').value=String(action.macro??0);$('macroMode').value=String(action.macro_mode??0);$('macroRepeat').value=String(action.repeat??1);
  $('specialCode').value=Number(action.code||1).toString(16).padStart(4,'0').toUpperCase();
  syncActionFields();
}
function syncActionFields() {
  const type=$('actionType').value;
  $('keyActionFields').classList.toggle('hidden',type!=='key');
  $('consumerFields').classList.toggle('hidden',type!=='consumer');
  $('mouseFields').classList.toggle('hidden',type!=='mouse');
  $('macroFields').classList.toggle('hidden',type!=='macro');
  $('specialFields').classList.toggle('hidden',type!=='special');
}
function readActionEditor() {
  const kind=$('actionType').value;
  if(kind==='default'||kind==='disable')return {kind};
  if(kind==='key') return {kind,key:Number($('targetKey').value),mods:(+$('modCtrl').checked)|((+$('modShift').checked)<<1)|((+$('modAlt').checked)<<2)|((+$('modWin').checked)<<3)};
  if(kind==='consumer')return {kind,code:Number($('consumerCode').value)};
  if(kind==='mouse')return {kind,mouse:$('mouseCode').value.split(',').map(Number)};
  if(kind==='macro')return {kind,macro:Number($('macroSlot').value),macro_mode:Number($('macroMode').value),repeat:Math.max(1,Math.min(255,Number($('macroRepeat').value)||1))};
  if(kind==='special') {const hex=$('specialCode').value.trim().replace(/^0x/i,'');if(!/^[0-9a-fA-F]{1,4}$/.test(hex))throw new Error('Enter a valid 1–4 digit hexadecimal special code.');return {kind,code:parseInt(hex,16)};}
  return {kind:'default'};
}

function setSelectedLayer(layer) {
  selectedLayer=layer; selectedKeyIndex=null;
  document.querySelectorAll('.layer-segment button').forEach(b=>b.classList.toggle('selected',b.dataset.layer===layer));
  $('actionEditor').classList.add('hidden'); $('emptySelection').classList.remove('hidden'); $('selectedKeyCaption').textContent='Select a key to edit'; $('selectedKeyIndex').textContent='NO KEY';
  renderKeyboard('keymapKeyboard','keymap');
}

function asciiEvents(text, delay) {
  const events=[];
  const codes={
    ' ':'0x2c','\n':'0x28','\t':'0x2b','-':'0x2d','_':'0x2d','=':'0x2e','+':'0x2e','[':'0x2f','{':'0x2f',']':'0x30','}':'0x30','\\':'0x31','|':'0x31',';':'0x33',':':'0x33',"'":'0x34','"':'0x34','`':'0x35','~':'0x35',',':'0x36','<':'0x36','.':'0x37','>':'0x37','/':'0x38','?':'0x38','!':'0x1e','@':'0x1f','#':'0x20','$':'0x21','%':'0x22','^':'0x23','&':'0x24','*':'0x25','(':'0x26',')':'0x27'
  };
  for(const ch of text) {
    let code=0, shift=false;
    if(/[a-z]/.test(ch)) code=ch.charCodeAt(0)-97+4;
    else if(/[A-Z]/.test(ch)) {code=ch.charCodeAt(0)-65+4;shift=true;}
    else if(/[1-9]/.test(ch)) code=0x1e+Number(ch)-1;
    else if(ch==='0') code=0x27;
    else if(codes[ch]) {code=parseInt(codes[ch],16);shift=/[!@#$%^&*()_+{}|:"~<>?]/.test(ch);}
    else continue;
    if(shift)events.push({kind:'key_down',code:0xe1,delay});
    events.push({kind:'key_down',code,delay});
    events.push({kind:'key_up',code,delay});
    if(shift)events.push({kind:'key_up',code:0xe1,delay});
  }
  return events;
}
function updateMacroEstimate() {
  if(selectedMacroIndex===null)return;
  const events=asciiEvents($('macroText').value,Math.max(10,Number($('eventDelay').value)||30));
  $('macroPreview').value=`${events.length} events`;
  const all=state.macros.map((m,i)=>i===selectedMacroIndex?{...m,events}:m);
  const used=(all.length+all.reduce((sum,m)=>sum+(m.events||[]).length,0))*8;
  $('budgetText').textContent=`${used.toLocaleString()} / 2,700 bytes`;
  $('budgetBar').style.width=`${Math.min(100,used/2700*100)}%`;
  $('budgetBar').style.background=used>2600?'#ff7676':'#54d6ad';
}
function renderMacros() {
  $('macroCount').textContent=`${state.macros.length} / 100`;
  const host=$('macroList');host.replaceChildren();
  if(!state.macros.length){const e=document.createElement('div');e.className='macro-list-empty';e.textContent='No macros yet. Create your first sequence.';host.append(e);}
  state.macros.forEach((m,i)=>{
    const b=document.createElement('button');b.type='button';b.className='macro-list-item'+(i===selectedMacroIndex?' active':'');
    const no=document.createElement('span');no.className='macro-no';no.textContent=String(i+1).padStart(2,'0');
    const info=document.createElement('span');const strong=document.createElement('strong');strong.textContent=m.name||`Macro ${i+1}`;const small=document.createElement('small');small.textContent=`${(m.events||[]).length} events`;info.append(strong,small);
    const del=document.createElement('span');del.className='delete-macro';del.textContent='×';del.title='Delete macro';
    b.append(no,info,del);
    b.addEventListener('click',ev=>{
      if(ev.target===del){state.macros.splice(i,1);if(selectedMacroIndex===i)selectedMacroIndex=null;else if(selectedMacroIndex>i)selectedMacroIndex--;saveState();renderMacros();setMacroEditor();return;}
      selectedMacroIndex=i;renderMacros();setMacroEditor();
    });
    host.append(b);
  });
  $('macroSlot').replaceChildren();
  (state.macros.length?state.macros:[{name:'Macro 1'}]).forEach((m,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=m.name||`Macro ${i+1}`;$('macroSlot').append(o);});
}
function setMacroEditor() {
  const empty=$('macroEmpty'), editor=$('macroFieldsEditor');
  const m=selectedMacroIndex===null?null:state.macros[selectedMacroIndex];
  empty.classList.toggle('hidden',!!m);editor.classList.toggle('hidden',!m);
  if(!m)return;
  $('macroName').value=m.name||'';
  $('macroText').value=m.text||'';
  $('eventDelay').value=m.delay||30;
  updateMacroEstimate();
}
function saveMacroEditor() {
  if(selectedMacroIndex===null)return;
  const delay=Math.max(10,Math.min(2000,Number($('eventDelay').value)||30));
  const text=$('macroText').value;
  const events=asciiEvents(text,delay);
  const item={name:$('macroName').value.trim()||`Macro ${selectedMacroIndex+1}`,text,delay,events};
  state.macros[selectedMacroIndex]=item;
  try{buildMacroBuffer(state.macros);}catch(e){toast(e.message,'error');return;}
  saveState();renderMacros();setMacroEditor();toast('Macro saved to your local profile.');
}

function readSettings() {
  return {disableWin:$('disableWin').checked,disableAltF4:$('disableAltF4').checked,disableAltTab:$('disableAltTab').checked,fnToggle:$('fnToggle').checked,sleep:Number($('sleepOption').value),response:Number($('responseOption').value)};
}
function syncSettings() {
  $('disableWin').checked=!!state.settings.disableWin;$('disableAltF4').checked=!!state.settings.disableAltF4;$('disableAltTab').checked=!!state.settings.disableAltTab;$('fnToggle').checked=!!state.settings.fnToggle;$('sleepOption').value=String(state.settings.sleep);$('responseOption').value=String(state.settings.response);
}
function snapshot() {
  return {format:'aula-f75-studio-profile',version:2,ledMapVersion:2,model:'AULA F75 Max',savedAt:new Date().toISOString(),lighting:{...state.lighting},perKeyColors:{...state.perKeyColors},keymaps:structuredClone(state.keymaps),macros:structuredClone(state.macros),settings:{...state.settings},effectLab:{...state.effectLab,preview:false}};
}
function applySnapshot(profile) {
  if(!profile||profile.model!=='AULA F75 Max'||profile.format!=='aula-f75-studio-profile')throw new Error('This file is not an AULA F75 Max Studio profile.');
  Object.assign(state.lighting,profile.lighting||{});state.perKeyColors={...(profile.perKeyColors||{})};if(profile.ledMapVersion!==2)swapLegacyAltFnLedColors(state.perKeyColors);state.keymaps={base:{},fn:{},...(profile.keymaps||{})};state.keymaps.base=state.keymaps.base||{};state.keymaps.fn=state.keymaps.fn||{};state.macros=profile.macros||[];state.settings={...DEFAULT_SETTINGS,...(profile.settings||{})};state.effectLab={selected:profile.effectLab?.selected||'cycle_all',palette:profile.effectLab?.palette||'aurora',speedPercent:100,brightnessPercent:115,brightnessAuto:true,controlsByEffect:{},...(profile.effectLab||{}),preview:false};state.effectLab.controlsByEffect=state.effectLab.controlsByEffect||{};activateEffectControls(state.effectLab.selected);
  saveState();syncLightingUI();syncEffectTuningUI();renderQmkEffectCards();syncSettings();renderKeyboard('keymapKeyboard','keymap');renderMacros();
}
function downloadJson(name,obj) {
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
function renderProfiles() {
  const host=$('profileGrid');host.replaceChildren();
  if(!state.profiles.length){const p=document.createElement('div');p.className='panel';p.style.gridColumn='1/-1';p.innerHTML='<strong style="font-size:11px">No saved profiles yet</strong><p style="font-size:10px;color:#8b909d">Save the current setup to create a profile you can reuse or export.</p>';host.append(p);return;}
  state.profiles.forEach((p,i)=>{
    const card=document.createElement('article');card.className='profile-card';
    const visual=document.createElement('div');visual.className='profile-visual';['#a98cff','#55d6be','#69a7ff','#ff8c69','#f5cb5c'].forEach(c=>{const dot=document.createElement('i');dot.style.setProperty('--c',c);visual.append(dot);});
    const title=document.createElement('h3');title.textContent=p.name;
    const desc=document.createElement('p');desc.textContent=`${MODES[p.data.lighting?.mode||0]?.[0]||'Custom'} · Saved ${new Date(p.savedAt).toLocaleDateString()}`;
    const actions=document.createElement('div');actions.className='profile-card-actions';
    const load=document.createElement('button');load.className='btn btn-outline';load.textContent='Load';load.addEventListener('click',()=>{try{applySnapshot(p.data);toast(`${p.name} loaded into the editor.`);}catch(e){toast(e.message,'error');}});
    const exp=document.createElement('button');exp.className='btn btn-quiet';exp.textContent='Export';exp.addEventListener('click',()=>downloadJson(`${slug(p.name)}.json`,p.data));
    const del=document.createElement('button');del.className='btn btn-quiet';del.textContent='×';del.title='Delete profile';del.addEventListener('click',()=>{state.profiles.splice(i,1);saveState();renderProfiles();});
    actions.append(load,exp,del);card.append(visual,title,desc,actions);host.append(card);
  });
}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'aula-profile';}

function wireEvents() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.tab)));
  $('connectBtn').addEventListener('click',async()=>{
    try{
      if(driver.connected){await stopHardwareEffect(true);await driver.disconnect();setConnected(false);return;}
      await driver.connect();setConnected(true,driver.label);navigator.hid.addEventListener('disconnect',ev=>{if(ev.device===driver.device){hardwareEffectRunning=false;syncDesktopReactiveCapture();publishDesktopLightingState(false);stopEffectPreview();$('toggleEffectHardware').textContent='Start real-time lighting';setConnected(false);toast('Keyboard disconnected.');}});toast('Keyboard connected over USB-C.');
    }catch(e){log(e.message,'error');toast(e.message,'error');}
  });
  $('effectColor').addEventListener('input',e=>{state.lighting.color=e.target.value.toUpperCase();state.effectLab.palette='custom';$('colorHex').textContent=state.lighting.color;renderPaletteGrid();saveState();if(state.effectLab.preview)renderEffectPreviewFrame(performance.now());});
  $('swatches').addEventListener('click',e=>{const b=e.target.closest('button[data-color]');if(!b)return;state.lighting.color=b.dataset.color;state.effectLab.palette='custom';syncLightingUI();renderPaletteGrid();saveState();if(state.effectLab.preview)renderEffectPreviewFrame(performance.now());});
  $('brightness').addEventListener('input',e=>{state.lighting.brightness=Number(e.target.value);$('brightnessVal').textContent=`${e.target.value} / 5`;saveState();});
  $('speed').addEventListener('input',e=>{state.lighting.speed=Number(e.target.value);$('speedVal').textContent=`${e.target.value} / 5`;saveState();});
  $('rainbow').addEventListener('change',e=>{state.lighting.rainbow=e.target.checked;saveState();});
  $('directionSeg').addEventListener('click',e=>{const b=e.target.closest('button[data-dir]');if(!b)return;state.lighting.direction=Number(b.dataset.dir);syncLightingUI();saveState();});
  $('applyLighting').addEventListener('click',async()=>{try{await stopHardwareEffect(false);await driver.applyLighting({mode:state.lighting.mode,rgb:[0,2,4].map(i=>parseInt(state.lighting.color.slice(1).slice(i,i+2),16)),rainbow:state.lighting.rainbow,brightness:state.lighting.brightness,speed:state.lighting.speed,direction:state.lighting.direction});toast('Lighting applied to the keyboard.');}catch(e){log(e.message,'error');toast(e.message,'error');}});
  $('resetLighting').addEventListener('click',async()=>{await stopHardwareEffect(false);state.lighting={...DEFAULT_LIGHT};state.perKeyColors={};state.lightingSelection=[];customEditing=false;$('keyColorTools')?.remove();syncLightingUI();saveState();toast('Lighting preview reset.');});
  $('effectSearch').addEventListener('input',renderQmkEffectCards);
  $('effectCategory').addEventListener('change',renderQmkEffectCards);
  $('effectSpeed').addEventListener('input',e=>{state.effectLab.speedPercent=Number(e.target.value);cacheCurrentEffectControls();$('effectSpeedVal').textContent=`${state.effectLab.speedPercent}%`;saveState();if(state.effectLab.preview&&!hardwareEffectRunning)renderEffectPreviewFrame(performance.now());});
  $('effectBrightness').addEventListener('input',e=>{state.effectLab.brightnessPercent=Number(e.target.value);state.effectLab.brightnessAuto=false;cacheCurrentEffectControls();$('effectBrightnessVal').textContent=`${state.effectLab.brightnessPercent}%`;syncEffectTuningUI();saveState();if(state.effectLab.preview&&!hardwareEffectRunning)renderEffectPreviewFrame(performance.now());});
  $('effectBrightnessAuto').addEventListener('click',()=>{state.effectLab.brightnessAuto=true;state.effectLab.brightnessPercent=recommendedEffectBrightness();cacheCurrentEffectControls();syncEffectTuningUI();saveState();if(state.effectLab.preview&&!hardwareEffectRunning)renderEffectPreviewFrame(performance.now());toast(`Auto brightness set to ${state.effectLab.brightnessPercent}% for ${effectDefinition().name}.`);});
  $('paletteGrid').addEventListener('click',()=>{});
  $('toggleEffectPreview').addEventListener('click',toggleEffectPreview);
  $('toggleEffectHardware').addEventListener('click',toggleHardwareEffect);
  $('useNativeEffect').addEventListener('click',useClosestNativeEffect);
  $('effectColor').addEventListener('input',()=>{if(state.effectLab.preview)renderEffectPreviewFrame(performance.now());});
  window.addEventListener('keydown',capturePreviewTyping);
  $('openCustom').addEventListener('click',()=>{customEditing=!customEditing;if(customEditing){addCustomTools();toast('Per-key editor ready. Select keys on the keyboard.');}else $('keyColorTools')?.remove();renderKeyboard('lightingKeyboard','lighting');});
  document.querySelectorAll('.layer-segment button').forEach(b=>b.addEventListener('click',()=>setSelectedLayer(b.dataset.layer)));
  $('actionType').addEventListener('change',syncActionFields);
  $('saveAction').addEventListener('click',()=>{
    if(selectedKeyIndex===null)return;
    try{state.keymaps[selectedLayer][String(selectedKeyIndex)]=readActionEditor();saveState();renderKeyboard('keymapKeyboard','keymap');toast('Key action saved to local profile.');}catch(e){toast(e.message,'error');}
  });
  $('resetKeymap').addEventListener('click',()=>{state.keymaps[selectedLayer]={};selectedKeyIndex=null;saveState();setSelectedLayer(selectedLayer);toast(`${selectedLayer==='base'?'Base':'Fn'} layer reset in local profile.`);});
  $('applyKeymap').addEventListener('click',()=>{
    showRisk('Key-remapping packet details are disputed between public reverse-engineering projects. This will send the current base and Fn tables to persistent keyboard storage. A confirmed factory keymap restore procedure is not available in this build.',async()=>{
      await driver.applyRemap(buildRemapTable(state.keymaps.base),false);
      await driver.applyRemap(buildRemapTable(state.keymaps.fn),true);
      toast('Remap tables sent. Test one key at a time.');
    });
  });
  $('addMacro').addEventListener('click',()=>{
    if(state.macros.length>=100)return toast('Keyboard macro slot limit reached.');
    state.macros.push({name:`Macro ${state.macros.length+1}`,text:'',delay:30,events:[]});selectedMacroIndex=state.macros.length-1;saveState();renderMacros();setMacroEditor();
  });
  $('macroText').addEventListener('input',updateMacroEstimate);$('eventDelay').addEventListener('input',updateMacroEstimate);
  $('saveMacro').addEventListener('click',saveMacroEditor);
  $('applyMacros').addEventListener('click',()=>{
    showRisk('The macro binary format is taken from an independent reverse-engineering implementation, but a newer F75 Max protocol catalog says macro payloads remain unverified. Uploading may overwrite macro storage.',async()=>{
      const data=buildMacroBuffer(state.macros);await driver.applyMacros(data);toast('Macro data sent. Test with a non-critical macro first.');
    });
  });
  ['disableWin','disableAltF4','disableAltTab','fnToggle','sleepOption','responseOption'].forEach(id=>$(id).addEventListener('change',()=>{state.settings=readSettings();saveState();}));
  $('applySettings').addEventListener('click',()=>{
    showRisk('Function settings are reverse-engineered and partly decoded. This command changes persistent key restrictions and Fn settings.',async()=>{state.settings=readSettings();await driver.applySettings(state.settings);saveState();toast('Settings packet sent. Verify each setting on the keyboard.');});
  });
  $('clearLog').addEventListener('click',()=>{$('activityLog').replaceChildren();const e=document.createElement('div');e.className='log-empty';e.textContent='Log cleared.';$('activityLog').append(e);});
  $('saveProfile').addEventListener('click',()=>{const name=prompt('Name this profile:','My F75 setup');if(!name||!name.trim())return;state.profiles.unshift({name:name.trim(),savedAt:new Date().toISOString(),data:snapshot()});saveState();renderProfiles();toast('Profile saved on this computer.');});
  $('exportCurrent').addEventListener('click',()=>downloadJson('aula-f75-max-profile.json',snapshot()));
  $('importProfile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const p=JSON.parse(await file.text());applySnapshot(p);toast('Profile imported.');}catch(err){toast(err.message,'error');}e.target.value='';});
  $('riskConfirm').addEventListener('change',e=>$('riskContinue').disabled=!e.target.checked);
  $('riskCancel').addEventListener('click',()=>{$('riskDialog').close();pendingRiskAction=null;});
  $('riskContinue').addEventListener('click',async()=>{
    if(!pendingRiskAction)return;$('riskDialog').close();const action=pendingRiskAction;pendingRiskAction=null;
    try{if(!driver.connected)throw new Error('Connect your keyboard in USB-C wired mode first.');await action();}
    catch(e){log(e.message,'error');toast(e.message,'error');}
  });
}

async function init() {
  loadState();
  const [data,inputMap]=await Promise.all([
    fetch('./keymap.json').then(r=>{if(!r.ok)throw new Error('Could not load keyboard layout.');return r.json();}),
    fetch('./reactive-key-map.json').then(r=>{if(!r.ok)throw new Error('Could not load reactive keyboard map.');return r.json();})
  ]);
  keys=data;
  reactiveInputMap=inputMap;
  lightIndexByHidUsage=new Map(keys.filter(k=>Number(k.code)>0).map(k=>[Number(k.code),Number(k.light_index)]));
  driver=new AulaHID(log);
  populateKeyOptions();
  state.effectLab.controlsByEffect=state.effectLab.controlsByEffect||{};
  if(state.effectLab.controlsByEffect[state.effectLab.selected]) activateEffectControls(state.effectLab.selected);
  else { if(state.effectLab.brightnessAuto!==false) state.effectLab.brightnessPercent=recommendedEffectBrightness(); cacheCurrentEffectControls(); }
  syncLightingUI(); syncEffectTuningUI(); syncSettings(); renderKeyboard('keymapKeyboard','keymap'); renderMacros(); renderQmkEffectCards(); renderPaletteGrid(); wireEvents();
  registerDesktopReactiveInput();
  window.aulaDesktop?.onStopLighting?.(async()=>{try{await stopHardwareEffect(true);}catch(e){log(`Tray stop failed: ${e.message}`,'error');}finally{window.aulaDesktop?.completeStopLighting?.();}});
  setConnected(false);
  if(!('hid' in navigator)) {
    $('connectBtn').disabled=true; $('connectBtn').title='WebHID is only available in supported Chromium browsers on secure origins.';
    toast('WebHID is unavailable in this browser. Use Chrome, Edge or Opera on localhost.');
  }
  if(window.aulaDesktop?.isDesktop) {
    const info=await window.aulaDesktop.getRuntimeInfo().catch(()=>null);
    log(`Windows desktop driver ready${info?.version?` · v${info.version}`:''}. Closing the window keeps Studio running in the system tray.`,'ok');
  } else log('AULA Studio ready. Connect the keyboard by USB-C in wired mode.');
}

init().catch(e=>{console.error(e);toast(`Startup error: ${e.message}`,'error');});