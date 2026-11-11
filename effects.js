/*
 * AULA F75 Max Studio software-rendered RGB effect library. Effects are
 * rendered by the host and streamed through the keyboard real-time-lighting
 * transport; these are not QMK firmware effect IDs.
 */
export const QMK_EFFECTS = [
  ['none','None','Turn all LEDs off','ambient',0],
  ['solid_color','Solid colour','One consistent colour','ambient',1],
  ['alphas_mods','Alphas/modifiers','Different colour for modifier keys','ambient',1],
  ['gradient_up_down','Vertical gradient','Colour gradient from top to bottom','ambient',null],
  ['gradient_left_right','Horizontal gradient','Colour gradient from left to right','ambient',10],
  ['breathing','Breathing','Whole keyboard gently pulses','ambient',7],
  ['band_sat','Saturation band','A moving band changes colour saturation','motion',10],
  ['band_val','Brightness band','A moving band changes brightness','motion',10],
  ['band_pinwheel_sat','Pinwheel saturation','Three rotating blades change saturation','motion',12],
  ['band_pinwheel_val','Pinwheel brightness','Three rotating blades change brightness','motion',12],
  ['band_spiral_sat','Spiral saturation','A spiral changes saturation','motion',12],
  ['band_spiral_val','Spiral brightness','A spiral changes brightness','motion',12],
  ['cycle_all','Colour cycle','Whole keyboard cycles through the spectrum','motion',8],
  ['cycle_left_right','Cycle left to right','Rainbow moves horizontally','motion',10],
  ['rainbow_wave','Rainbow Wave','A flowing full-spectrum rainbow travels horizontally across the keyboard','motion',10],
  ['cycle_up_down','Cycle up and down','Rainbow moves vertically','motion',10],
  ['cycle_out_in','Cycle out/in','Colour waves move from outside to centre','motion',9],
  ['cycle_out_in_dual','Dual cycle out/in','Two colour waves converge at the centre','motion',9],
  ['rainbow_moving_chevron','Rainbow chevron','Chevron-shaped rainbow sweeps across the board','motion',10],
  ['cycle_pinwheel','Rainbow pinwheel','Rainbow rotates around the keyboard centre','motion',12],
  ['cycle_spiral','Rainbow spiral','Rainbow spirals around the keyboard centre','motion',12],
  ['dual_beacon','Dual beacon','Two rotating colour beacons','motion',12],
  ['rainbow_beacon','Rainbow beacon','A narrow rainbow rotates around the centre','motion',12],
  ['rainbow_pinwheels','Rainbow pinwheels','Two rainbow pinwheels rotate on each half','motion',12],
  ['flower_blooming','Flower blooming','Two colour waves move in opposite directions','motion',16],
  ['raindrops','Raindrops','Individual keys randomly light up in the chosen hue','organic',4],
  ['jellybean_raindrops','Jellybean raindrops','Random keys flash with varied colours','organic',4],
  ['hue_breathing','Hue breathing','A breathing pulse slowly shifts hue','organic',7],
  ['hue_pendulum','Hue pendulum','A hue wave swings from side to side','organic',16],
  ['hue_wave','Hue wave','A hue wave travels horizontally','organic',16],
  ['pixel_fractal','Pixel fractal','A pulsing fractal-like pattern expands outward','organic',null],
  ['pixel_flow','Pixel flow','Random-colour pulses flow through the key field','organic',16],
  ['pixel_rain','Pixel rain','Random coloured pixels appear and fade','organic',5],
  ['typing_heatmap','Typing heatmap','Recently pressed keys glow and gradually cool','reactive',null],
  ['digital_rain','Digital rain','Falling columns of light','organic',5],
  ['solid_reactive_simple','Reactive simple','The pressed key flashes in the selected colour','reactive',2],
  ['solid_reactive','Reactive','The pressed key briefly changes hue','reactive',2],
  ['solid_reactive_wide','Reactive wide','A circular glow spreads from the pressed key','reactive',15],
  ['solid_reactive_multiwide','Reactive multiwide','Several key presses create circular waves','reactive',15],
  ['solid_reactive_cross','Reactive cross','The pressed key illuminates its row and column','reactive',15],
  ['solid_reactive_multicross','Reactive multicross','Multiple row and column reactions','reactive',15],
  ['solid_reactive_nexus','Reactive nexus','A cross-shaped pulse travels away from the key','reactive',15],
  ['solid_reactive_multinexus','Reactive multinexus','Several cross-shaped pulses spread at once','reactive',15],
  ['splash','Splash','A full-spectrum wave expands from a pressed key','reactive',15],
  ['multisplash','Multisplash','Multiple full-spectrum waves expand','reactive',15],
  ['solid_splash','Solid splash','A single-colour wave expands from a pressed key','reactive',15],
  ['solid_multisplash','Solid multisplash','Multiple single-colour waves expand','reactive',15],
  ['starlight','Starlight','Random keys sparkle in the selected colour','organic',4],
  ['starlight_smooth','Smooth starlight','Random keys softly brighten and dim','organic',7],
  ['starlight_dual_hue','Dual-hue starlight','Sparkles shift slightly around the selected hue','organic',4],
  ['starlight_dual_sat','Dual-saturation starlight','Sparkles vary in saturation','organic',4],
  ['riverflow','Riverflow','A flowing wave of brightness across the board','motion',16],
  ['aurora_curtain','Aurora Curtain','Soft northern-light ribbons drift across the keys','nature',null],
  ['comet','Comet','A bright comet travels with a fading tail','motion',null],
  ['comet_dual','Twin Comets','Two comets sweep in opposite directions','motion',null],
  ['meteor_shower','Meteor Shower','Random meteors streak diagonally across the board','nature',null],
  ['fire','Fire','A warm flame flickers upward from the bottom row','nature',null],
  ['embers','Embers','Glowing embers rise and fade','nature',null],
  ['lava_lamp','Lava Lamp','Slow liquid blobs drift and merge','ambient',null],
  ['plasma','Plasma','Layered plasma waves flow through the layout','ambient',null],
  ['nebula','Nebula','Cloud-like colour fields bloom and drift','cinematic',null],
  ['galaxy','Galaxy','A rotating galactic spiral with a luminous core','cinematic',null],
  ['starfield','Starfield','A field of stars twinkles at different depths','cinematic',null],
  ['twinkle','Twinkle','Gentle independent highlights sparkle across the board','ambient',null],
  ['sparkle_burst','Sparkle Burst','Short clusters of bright sparkles appear and fade','organic',null],
  ['confetti','Confetti','Colourful confetti lights pop across the keys','party',null],
  ['fireworks','Fireworks','Multiple colourful firework bursts expand and fade','party',null],
  ['scanner','Scanner','A focused light bar scans from side to side','motion',null],
  ['scanner_dual','Dual Scanner','Two scanning bars sweep in opposite directions','motion',null],
  ['heartbeat','Heartbeat','A double-beat pulse with a soft resting glow','rhythm',null],
  ['pulse_rings','Pulse Rings','Concentric rings pulse outward from the centre','motion',null],
  ['sonar','Sonar','A sonar ring sweeps through a deep-water palette','nature',null],
  ['radar','Radar','A rotating radar beam with a bright leading edge','motion',null],
  ['orbit','Orbit','Small points orbit around the keyboard centre','motion',null],
  ['orbit_dots','Orbit Dots','Two orbital dots circle in opposite directions','motion',null],
  ['helix','Helix','Two intertwining colour strands travel vertically','geometric',null],
  ['dna_twist','DNA Twist','A double helix twists across the keyboard','geometric',null],
  ['tide','Tide','A calm tidal gradient rolls up and down','nature',null],
  ['ocean_current','Ocean Current','Layered currents flow like underwater ribbons','nature',null],
  ['waterfall','Waterfall','Vertical streams cascade down the layout','nature',null],
  ['ripple_field','Ripple Field','Overlapping water ripples pass across the keys','nature',null],
  ['checkerboard','Checkerboard','A shifting checkerboard of alternating colours','geometric',null],
  ['stripes','Moving Stripes','Diagonal bands travel across the keyboard','geometric',null],
  ['diagonal_rainbow','Diagonal Rainbow','A full-spectrum diagonal colour sweep','motion',null],
  ['matrix_sweep','Matrix Sweep','Columns illuminate in a coordinated sequence','geometric',null],
  ['gradient_pulse','Gradient Pulse','A multi-colour gradient gently expands and contracts','ambient',null],
  ['color_bars','Colour Bars','Bold vertical bars move at different speeds','geometric',null],
  ['equalizer','Equalizer','Independent audio-style bars bounce rhythmically','rhythm',null],
  ['wave_interference','Wave Interference','Intersecting waves create moving interference patterns','geometric',null],
  ['moire','Moiré','Fine overlapping wave bands create a moiré pattern','geometric',null],
  ['kaleidoscope','Kaleidoscope','Symmetrical colour segments rotate and fold','geometric',null],
  ['vortex','Vortex','A spiralling vortex pulls colour toward its centre','motion',null],
  ['tunnel','Light Tunnel','Nested rings create a travelling tunnel illusion','cinematic',null],
  ['chase','Light Chase','A chain of bright pixels chases around the layout','motion',null],
  ['theater_chase','Theatre Chase','Alternating groups of keys chase in sequence','party',null],
  ['comet_tail','Comet Trails','Several short comet trails cross the board','motion',null],
  ['breathing_dual','Dual Breathing','Two complementary colours breathe out of phase','ambient',null],
  ['color_wipe','Colour Wipe','A colour band wipes across and resets','motion',null],
  ['spectrum_breath','Spectrum Breath','The spectrum slowly shifts with a soft breathing pulse','ambient',null],
  ['candlelight','Candlelight','A warm candle flickers subtly and naturally','ambient',null],
  ['pixel_snow','Pixel Snow','Tiny cool-white pixels drift and shimmer','nature',null],
  ['snowfall','Snowfall','Soft flakes fall at varied speeds','nature',null],
  ['frost','Frost','Icy highlights spread and recede across the keys','nature',null],
  ['heatwave','Heatwave','Warm distortion-like bands shimmer upward','nature',null],
  ['spectrum_bounce','Spectrum Bounce','A rainbow pulse bounces between keyboard edges','rhythm',null],
  ['pendulum','Pendulum','A glowing point swings like a pendulum','motion',null],
  ['spiral_rainbow','Spiral Rainbow','A dense rainbow spiral rotates across the layout','motion',null],
  ['reactive_afterglow','Reactive Afterglow','Pressed keys leave a long soft afterglow','reactive',null],
  ['reactive_tap_spark','Tap Spark','Every key press creates a sharp sparkle','reactive',null],
  ['reactive_ripple_rainbow','Rainbow Ripple','A rainbow ripple expands from every pressed key','reactive',null],
  ['reactive_edge','Reactive Edge','A key press lights the nearest keyboard edges','reactive',null],
  ['reactive_row','Reactive Row','A key press illuminates its entire row','reactive',null],
  ['reactive_column','Reactive Column','A key press illuminates its column','reactive',null],
  ['reactive_neighbors','Reactive Neighbours','Nearby keys light up around each press','reactive',null],
  ['reactive_burst','Reactive Burst','A burst of light radiates from every pressed key','reactive',null],
  ['reactive_dots','Reactive Dots','Small dots travel outward from each press','reactive',null],
  ['reactive_fade','Reactive Fade','Pressed keys fade smoothly through the selected palette','reactive',null],
  ['reactive_echo','Reactive Echo','Each press sends several fading echoes','reactive',null],
  ['reactive_glow','Reactive Glow','A soft halo follows recently pressed keys','reactive',null],
  ['reactive_spectrum','Reactive Spectrum','Pressed keys trigger a full-spectrum flash','reactive',null]
].map(([id,name,description,category,aulaMode])=>({id,name,description,category,aulaMode}));


// Curated multi-stop palettes designed for dark keycaps. The custom picker
// remains available as a single-colour source when paletteId is 'custom'.
export const COLOR_PALETTES = [
  {id:'aurora',name:'Aurora',description:'Mint, teal, sky and violet',colors:['#63F5C8','#25C6C8','#4C9DFF','#9B82FF','#D5A7FF']},
  {id:'arctic',name:'Arctic Ice',description:'Glacier blue and crisp white',colors:['#B8F4FF','#64D7F5','#4A9DDB','#A3B8FF','#F3FBFF']},
  {id:'sakura',name:'Sakura',description:'Cherry blossom pink and soft lilac',colors:['#FFB7D5','#F47DAF','#C58CFF','#9C9BFF','#FFE0EC']},
  {id:'sunset',name:'Sunset',description:'Peach, coral, magenta and dusk',colors:['#FFE08A','#FF9B71','#F05A78','#B45BE5','#5545A5']},
  {id:'ocean',name:'Deep Ocean',description:'Lagoon, cyan and midnight blue',colors:['#42E8C5','#18B9C8','#1686C7','#3855A8','#171E59']},
  {id:'ember',name:'Ember',description:'Firelight, orange and molten gold',colors:['#FFF0A6','#FFC247','#FF7A32','#E94336','#701D48']},
  {id:'cyberpunk',name:'Cyberpunk',description:'Electric cyan and neon fuchsia',colors:['#00F5FF','#00B8FF','#755CFF','#E843FF','#FF4F9A']},
  {id:'lavender',name:'Lavender Dream',description:'Soft violet, periwinkle and rose',colors:['#E5C7FF','#BCA7FF','#8EA9FF','#D1A7EE','#F5D5F2']},
  {id:'forest',name:'Enchanted Forest',description:'Jade, emerald and moonlit mint',colors:['#C1F07A','#58D68D','#12B886','#087E78','#B4E6C8']},
  {id:'royal',name:'Royal Amethyst',description:'Regal purple with champagne accents',colors:['#E8C5FF','#B77BFF','#7445C8','#3A286F','#F4D59A']},
  {id:'cotton',name:'Cotton Candy',description:'Baby blue, pink and pastel violet',colors:['#A9E7FF','#B8B5FF','#F6B5E5','#FFCEE5','#D5F4FF']},
  {id:'toxic',name:'Toxic Neon',description:'Acid lime, green and ultraviolet',colors:['#E8FF3B','#9BFF45','#23D18B','#00B6A8','#A34DFF']},
  {id:'gold',name:'Champagne Gold',description:'Warm ivory, gold and bronze',colors:['#FFF5D6','#F4D58D','#D7A84C','#A87832','#FFF0C2']},
  {id:'dracula',name:'Dracula',description:'Rose, purple and cool lavender',colors:['#FF79C6','#BD93F9','#8BE9FD','#50FA7B','#F1FA8C']},
  {id:'nord',name:'Nord',description:'Muted icy blue and slate',colors:['#8FBCBB','#88C0D0','#81A1C1','#5E81AC','#D8DEE9']},
  {id:'monochrome',name:'Moonlight',description:'Silver, white and graphite',colors:['#424956','#7C8797','#C7D0DD','#FFFFFF','#8390A3']},
  {id:'redline',name:'Redline',description:'Crimson, ruby and warm white',colors:['#FFE4E1','#FF6B6B','#E03131','#A4133C','#5A1028']},
  {id:'citrus',name:'Citrus Pop',description:'Lemon, lime and tangerine',colors:['#FFF275','#C9F04A','#65D46E','#FFB347','#FF7759']},
  {id:'custom',name:'Custom colour',description:'Use the individual colour picker',colors:[]}
];

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const fract=v=>v-Math.floor(v);
const hash=n=>fract(Math.sin(n*127.1+311.7)*43758.5453123);

// Keyboard geometry is immutable after keymap.json loads. Compile it once so
// every animation frame avoids re-scanning layout bounds and doing key.find()
// for reactive effects.
const layoutCache = new WeakMap();
function compiledLayout(keys) {
  let cached = layoutCache.get(keys);
  if (cached) return cached;
  const entries = keys.map((k, i) => {
    const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
    return {
      key: k, i, lightIndex: Number(k.light_index), cx, cy,
      modifier: /^(Alt|Ctrl|Shift|Win|Fn)/i.test(k.name || ''),
      noise: hash((k.light_index || i) + 1),
      noise2: hash((k.light_index || i) + 91)
    };
  });
  const minX = Math.min(...entries.map(e => e.key.x));
  const minY = Math.min(...entries.map(e => e.key.y));
  const maxX = Math.max(...entries.map(e => e.key.x + e.key.w), minX + 1);
  const maxY = Math.max(...entries.map(e => e.key.y + e.key.h), minY + 1);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const scale = Math.hypot(maxX - minX, maxY - minY) || 1;
  const byLightIndex = new Map(entries.map(e => [e.lightIndex, e]));
  // Build a physical serpentine path from key geometry, not XML/LED index order.
  // Group key centres into rows (tolerance accommodates staggered key rows),
  // then alternate direction so the chase travels continuously across the layout.
  const rowSorted = [...entries].sort((a,b) => a.cy-b.cy || a.cx-b.cx);
  const rows = [];
  for (const entry of rowSorted) {
    let row = rows.find(r => Math.abs(r.cy-entry.cy) <= 13);
    if (!row) { row = { cy: entry.cy, items: [] }; rows.push(row); }
    row.items.push(entry); row.cy = row.items.reduce((sum,e)=>sum+e.cy,0)/row.items.length;
  }
  rows.sort((a,b)=>a.cy-b.cy);
  const chasePath = rows.flatMap((row,index) => row.items.sort((a,b)=>index%2 ? b.cx-a.cx : a.cx-b.cx));
  const chaseIndex = new Map(chasePath.map((entry,index)=>[entry,index]));
  cached = {
    entries, byLightIndex, chasePath, chaseIndex,
    bounds: { minX, minY, maxX, maxY, cx, cy, scale },
  };
  layoutCache.set(keys, cached);
  return cached;
}
function hexHue(hex){
  const s=String(hex||'#9B82FF').replace('#','');
  const r=parseInt(s.slice(0,2),16)/255,g=parseInt(s.slice(2,4),16)/255,b=parseInt(s.slice(4,6),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}
  const l=(max+min)/2;const sat=d===0?0:d/(1-Math.abs(2*l-1));
  return {h,s:sat,l};
}
function hsl(h,s,l){
  h=((h%360)+360)%360;s=clamp(s);l=clamp(l);
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
  return `rgb(${Math.round((r+m)*255)}, ${Math.round((g+m)*255)}, ${Math.round((b+m)*255)})`;
}


function parseHex(hex){const h=String(hex).replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)||0);}
const PALETTE_RGB_CACHE = new Map();
function parsedPalette(colors){
  if(!Array.isArray(colors)||colors.length<2)return null;
  const key=colors.join('|');
  let parsed=PALETTE_RGB_CACHE.get(key);
  if(!parsed){parsed=colors.map(parseHex);PALETTE_RGB_CACHE.set(key,parsed);if(PALETTE_RGB_CACHE.size>64)PALETTE_RGB_CACHE.delete(PALETTE_RGB_CACHE.keys().next().value);}
  return parsed;
}
function samplePaletteRgb(colors, position, brightness=1, parsed=null){
  const stops=parsed||parsedPalette(colors);if(!stops)return null;
  const p=fract(position)*stops.length, i=Math.floor(p), f=p-i;
  const a=stops[i%stops.length], b=stops[(i+1)%stops.length];
  return [0,1,2].map(j=>Math.round(clamp((a[j]+(b[j]-a[j])*f)*brightness,0,255)));
}
function samplePalette(colors, position, brightness=1){
  const rgb=samplePaletteRgb(colors,position,brightness);
  return rgb?`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`:null;
}
function hslRgb(h,s,l){
  h=((h%360)+360)%360;s=clamp(s);l=clamp(l);
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
  return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];
}

export function renderQmkEffectFrame({effectId, keys, timeMs, color='#9B82FF', speed=3, brightness=5, brightnessScale=1, activity=new Map(), paletteColors=[], outputFormat='css'}){
  const effect=QMK_EFFECTS.find(e=>e.id===effectId)||QMK_EFFECTS[0];
  const base=hexHue(color), t=(timeMs/1000)*(.22+Math.max(0,Number(speed)||0)*.17), b=Math.max(0,(Number(brightness)||0)/5*(Number(brightnessScale)||1));
  const paletteStops=parsedPalette(paletteColors);
  const layout=compiledLayout(keys), {entries,byLightIndex,chasePath,chaseIndex,bounds}=layout;
  const {minX,minY,maxX,maxY,cx,cy,scale}=bounds;
  const active=[];
  for(const [idx,stamp] of activity.entries()){
    const src=byLightIndex.get(Number(idx));
    if(src){const age=Math.max(0,(timeMs-stamp)/1000);if(age<=2.5)active.push({src,age,decay:Math.exp(-age*2.8)});}
  }
  const activeWave=(entry,wide=1)=>{
    let best=0;
    for(const hit of active){const d=Math.hypot(entry.cx-hit.src.cx,entry.cy-hit.src.cy);best=Math.max(best,hit.decay*Math.exp(-d/(48*wide)));}
    return best;
  };
  const colors={};
  for(const entry of entries){
    const {key:k,i,cx:keyX,cy:keyY,lightIndex,modifier:mod}=entry;
    const x=clamp((keyX-minX)/(maxX-minX||1));
    const y=clamp((keyY-minY)/(maxY-minY||1));
    const dx=(keyX-cx)/scale,dy=(keyY-cy)/scale;
    const r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    const n=entry.noise,n2=entry.noise2;
    let hue=base.h,sat=base.s||.8,light=.5;
    const wave=(z)=>.5+.5*Math.sin(z*Math.PI*2);
    let v=1;
    switch(effectId){
      case 'none': v=0;break;
      case 'solid_color': break;
      case 'alphas_mods': if(mod)hue+=150;sat=mod?.95:base.s;break;
      case 'gradient_up_down': hue+=y*125;break;
      case 'gradient_left_right': hue+=x*150;break;
      case 'breathing': v=.18+.82*wave(t*.45);break;
      case 'band_sat': sat=.2+.8*wave(x*1.5-t);break;
      case 'band_val': v=.08+.92*wave(x*1.5-t);break;
      case 'band_pinwheel_sat': sat=.18+.82*wave(a/Math.PI*1.5-t);break;
      case 'band_pinwheel_val': v=.08+.92*wave(a/Math.PI*1.5-t);break;
      case 'band_spiral_sat': sat=.15+.85*wave(a/Math.PI*1.8+r*22-t);break;
      case 'band_spiral_val': v=.08+.92*wave(a/Math.PI*1.8+r*22-t);break;
      case 'cycle_all': hue+=t*65;break;
      case 'cycle_left_right': hue+=(x-t*.22)*360;break;
      case 'rainbow_wave': hue+=(x*1.45-t*.24)*360; sat=.96; v=.92+.08*wave(x*1.8-t*.35); break;
      case 'cycle_up_down': hue+=(y-t*.22)*360;break;
      case 'cycle_out_in': hue+=(r*2.4-t*.22)*360;break;
      case 'cycle_out_in_dual': hue+=(r*2.4-t*.22)*720;break;
      case 'rainbow_moving_chevron': hue+=(x*2+Math.abs(y-.5)*1.3-t*.25)*360;break;
      case 'cycle_pinwheel': hue+=(a/(Math.PI*2)+t*.13)*360;break;
      case 'cycle_spiral': hue+=(a/(Math.PI*2)+r*5-t*.13)*360;break;
      case 'dual_beacon': hue+=(Math.sin(a*2-t*2)*.5+.5)*180;break;
      case 'rainbow_beacon': hue+=(a/(Math.PI*2)+t*.15)*360; sat=.95;break;
      case 'rainbow_pinwheels': hue+=((a/(Math.PI*2))+(x<.5?1:-1)*t*.16)*360;break;
      case 'flower_blooming': hue+=(Math.sin(x*9-t*2)*.5+.5)*200;break;
      case 'raindrops': {const q=Math.floor(t*1.3+n*9);v=.12+.88*(hash(q*211+i*7)>.84?1:0);break;}
      case 'jellybean_raindrops': {const q=Math.floor(t*1.3+n*9);v=.08+.92*(hash(q*211+i*7)>.84?1:0);hue+=hash(q*13+i*31)*360;sat=.95;break;}
      case 'hue_breathing': hue+=wave(t*.28)*60;v=.28+.72*wave(t*.45);break;
      case 'hue_pendulum': hue+=wave(x*.5-t*.25)*95;break;
      case 'hue_wave': hue+=wave(x*1.6-t*.3)*100;break;
      case 'pixel_fractal': hue+=Math.abs(Math.sin(x*8+t*1.5))*45;v=.15+.85*wave(x*2-t*.7);break;
      case 'pixel_flow': hue+=hash(Math.floor(t*2)+i*17)*300;v=.2+.8*wave(x*3-t);break;
      case 'pixel_rain': hue+=hash(Math.floor(t*2)+i*17)*360;v=hash(Math.floor(t*4)+i*71)>.82?1:.04;break;
      case 'typing_heatmap': {const heat=activeWave(entry,1.3);hue=120-heat*120;sat=.92;v=.05+.95*heat;break;}
      case 'digital_rain': {const col=Math.floor(x*12);const head=fract(t*.45+hash(col+17))*1.25;const dist=fract(y-head+1);v=dist<.35?1-dist*2.2:.025;hue=125;sat=.95;break;}
      case 'solid_reactive_simple': {const z=activeWave(entry,.7);v=.035+.965*z;break;}
      case 'solid_reactive': {const z=activeWave(entry,.8);hue+=z*80;v=.1+.9*z;break;}
      case 'solid_reactive_wide': case 'solid_reactive_multiwide': {const z=activeWave(entry,1.7);v=.025+.975*z;break;}
      case 'solid_reactive_cross': case 'solid_reactive_multicross': case 'solid_reactive_nexus': case 'solid_reactive_multinexus': {let z=0;for(const hit of active){const same=Math.abs(keyY-hit.src.cy)<14||Math.abs(keyX-hit.src.cx)<18;z=Math.max(z,same?Math.exp(-hit.age*2.6):0);}v=.04+.96*z;break;}
      case 'splash': case 'multisplash': case 'solid_splash': case 'solid_multisplash': {const z=activeWave(entry,1.5);if(effectId.includes('solid'))v=.04+.96*z;else{hue+=z*210;v=.04+.96*z;}break;}
      case 'starlight': case 'starlight_smooth': case 'starlight_dual_hue': case 'starlight_dual_sat': {const q=Math.floor(t*1.4+n*7),pulse=wave(t*.22+n*8);v=effectId==='starlight_smooth'?.12+.88*pulse:(hash(q*71+i*11)>.87?1:.035);if(effectId==='starlight_dual_hue')hue+=(n2-.5)*75;if(effectId==='starlight_dual_sat')sat=.25+n2*.75;break;}
      case 'aurora_curtain': hue+=Math.sin(x*7-t*1.4)*52+y*25;v=.18+.82*wave(y*1.5+Math.sin(x*4-t)*.13);sat=.9;break;
      case 'comet': case 'comet_dual': case 'comet_tail': {const head=fract(t*.11)*1.6-.3;const d=Math.abs(x-head);const tail=Math.exp(-d*(effectId==='comet_tail'?13:8));const dual=effectId==='comet_dual'?Math.exp(-Math.abs(x-(1-head))*8):0;v=.025+.975*Math.max(tail,dual);hue+=effectId==='comet_dual'?dual*150:tail*65;break;}
      case 'meteor_shower': {const q=Math.floor(t*.9+n*5),head=fract(t*.16+n)*1.5-.2,dist=Math.abs(x-head-y*.22);v=.025+.975*Math.exp(-dist*24)*(hash(q*71+i)>.36?1:.12);hue+=n*65;break;}
      case 'fire': {const flicker=.55+.45*hash(Math.floor(t*9)+i*13);v=.12+.88*Math.pow(1-y,.8)*flicker;hue=8+y*48+n*16;sat=.98;break;}
      case 'embers': {const q=Math.floor(t*1.7+n*9),rise=fract(t*.22+n);v=hash(q*31+i*17)>.78?Math.pow(rise,1.6):.025;hue=18+rise*34;sat=.95;break;}
      case 'lava_lamp': {const blob=Math.sin(x*5+t*.55+Math.sin(y*8-t)*.7)+Math.cos(y*6-t*.4);v=.16+.84*wave(blob*.28);hue+=Math.sin(blob)*38;sat=.92;break;}
      case 'plasma': {const z=Math.sin(x*9+t)+Math.sin(y*8-t*.8)+Math.sin((x+y)*11+t*.6);hue+=z*58;v=.25+.75*wave(z*.19);sat=.96;break;}
      case 'nebula': case 'galaxy': {const spiral=a/(Math.PI*2)+r*(effectId==='galaxy'?5:2)-t*.07;hue+=spiral*210+Math.sin(r*17-t)*24;v=.14+.86*wave(spiral*2.3+(effectId==='galaxy'?Math.sin(a*3):0));sat=.95;break;}
      case 'starfield': case 'twinkle': case 'sparkle_burst': {const q=Math.floor(t*(effectId==='twinkle'?1.2:2.5)+n*11);const sparkle=hash(q*71+i*19);v=effectId==='twinkle'?.08+.92*Math.pow(wave(t*.3+n*17),5):(sparkle>.91?1:.025);hue+=effectId==='sparkle_burst'?hash(q*19+i)*360:20;sat=.5+n2*.5;break;}
      case 'confetti': {const q=Math.floor(t*2.4+n*13);v=hash(q*31+i*7)>.73?.25+.75*wave(t+n*8):.035;hue=hash(q*17+i*37)*360;sat=.95;break;}
      case 'fireworks': {const q=Math.floor(t*.32),sx=hash(q*13)*.8+.1,sy=hash(q*29)*.55+.18,age=fract(t*.32);const d=Math.hypot((x-sx)*1.2,y-sy);const ring=Math.abs(d-age*.85);v=.025+.975*Math.exp(-ring*32)*(1-age);hue=hash(q*7)*360;sat=.96;break;}
      case 'scanner': case 'scanner_dual': {const pos=fract(t*.22),d=Math.abs(x-pos),d2=Math.abs(x-(1-pos));v=.025+.975*Math.max(Math.exp(-d*28),effectId==='scanner_dual'?Math.exp(-d2*28):0);break;}
      case 'heartbeat': {const beat=wave(t*.8),pulse=Math.pow(Math.max(0,Math.sin(t*5.2)),12);v=.2+.55*beat+.25*pulse;break;}
      case 'pulse_rings': case 'sonar': {const ring=wave(r*5.2-t*.42);v=.06+.94*Math.pow(ring,5);if(effectId==='sonar'){hue=190+ring*38;sat=.95;}break;}
      case 'radar': {const beam=fract((a/(Math.PI*2))-t*.1);v=.025+.975*Math.exp(-beam*15);hue+=beam*80;break;}
      case 'orbit': case 'orbit_dots': {const orbitA=a-t*.8,orbitR=Math.abs(r-(.23+.12*Math.sin(t*.7)));const dot=Math.exp(-Math.abs(orbitR)*35)*Math.pow(Math.max(0,Math.cos(orbitA*3)),8);v=.04+.96*dot;if(effectId==='orbit_dots')hue+=Math.sin(orbitA*2)*75;break;}
      case 'helix': case 'dna_twist': {const strand=Math.min(Math.abs(y-(.5+.28*Math.sin(x*10-t))),Math.abs(y-(.5-.28*Math.sin(x*10-t))));v=.05+.95*Math.exp(-strand*27);hue+=Math.sin(x*10-t)*80;sat=.95;break;}
      case 'tide': case 'ocean_current': {const z=y*3+x*.8+Math.sin(x*5-t)*.24-t*.24;v=.18+.82*wave(z);hue=175+Math.sin(z*2)*28;sat=.88;break;}
      case 'waterfall': {const streams=wave(x*8+Math.sin(x*13)*.3-t*.8);v=.05+.95*Math.pow(streams,5)*(.5+.5*hash(Math.floor(t*2)+i));hue=190+streams*28;break;}
      case 'ripple_field': {const z=Math.sin(Math.hypot(x-.25,y-.5)*16-t*1.4)+Math.sin(Math.hypot(x-.75,y-.5)*16-t*1.4);v=.08+.92*wave(z*.28);hue+=z*20;break;}
      case 'checkerboard': {const cell=(Math.floor(x*10)+Math.floor(y*5)+Math.floor(t*2))%2;v=cell?.95:.12;hue+=cell*155;break;}
      case 'stripes': case 'diagonal_rainbow': {const z=x*7+y*5-t*.65;v=.18+.82*(effectId==='stripes'?wave(z):1);if(effectId==='diagonal_rainbow'){hue+=z*90;sat=.98;}break;}
      case 'matrix_sweep': {const col=Math.floor(x*13),head=fract(t*.35+hash(col+3));v=fract(y-head+1)<.24?.95:.035;hue=132;sat=.95;break;}
      case 'gradient_pulse': {hue+=x*130+y*55;v=.2+.8*wave(t*.32+r*1.8);break;}
      case 'color_bars': {const bar=Math.floor((x*7+t*.45)%7);hue=bar*48;v=.3+.7*wave(y*1.5-t*.3+bar*.11);break;}
      case 'equalizer': {const bars=Math.floor(x*12),height=.22+.7*(.5+.5*Math.sin(t*2.2+bars*1.7+hash(bars)*4));v=y>(1-height)?.95:.04;hue=120-(1-y)*115;sat=.92;break;}
      case 'wave_interference': case 'moire': {const z=Math.sin((x+y)*22-t*1.2)+Math.sin((x-y)*19+t*.8);v=.12+.88*wave(z*.3);hue+=z*35;break;}
      case 'kaleidoscope': {const folds=Math.abs(Math.sin(a*6+r*13-t));v=.12+.88*wave(folds*2);hue+=folds*240;sat=.98;break;}
      case 'vortex': {const z=a/(Math.PI*2)+r*6-t*.12;hue+=z*360;v=.12+.88*wave(z*3);break;}
      case 'tunnel': {const z=fract(r*7-t*.5);v=.08+.92*(z<.12?1:.12);hue+=z*360;break;}
      case 'chase': {
        const pathIndex = chaseIndex.get(entry) ?? 0;
        const count = chasePath.length || 1;
        const head = fract(t*.34)*count;
        const behind = (head-pathIndex+count)%count;
        const ahead = (pathIndex-head+count)%count;
        const tail = behind < 12 ? Math.exp(-behind*.48) : 0;
        const headDistance = Math.min(behind,ahead);
        const headGlow = Math.exp(-Math.pow(headDistance/1.05,2));
        v=.018+.982*Math.max(tail*.82,headGlow);
        hue += (1-headDistance/Math.max(1,count/2))*18;
        break;
      }
      case 'theater_chase': {
        const pathIndex = chaseIndex.get(entry) ?? 0;
        const phase = Math.floor(t*2.4)%3;
        const lit = ((pathIndex-phase+3)%3)===0;
        v=lit?.98:.035;
        break;
      }
      case 'breathing_dual': {const pulse=.15+.85*wave(t*.38+(x<.5?0:.5));hue+=x<.5?0:155;v=pulse;break;}
      case 'color_wipe': {const wipe=fract(t*.12);v=x<wipe?.96:.035;hue+=wipe*150;break;}
      case 'spectrum_breath': {hue+=t*35;v=.2+.8*wave(t*.38);sat=.98;break;}
      case 'candlelight': {const flicker=.78+.22*hash(Math.floor(t*11)+i*17);hue=34+n*12;sat=.72;v=.48+.48*flicker;break;}
      case 'pixel_snow': case 'snowfall': {const q=Math.floor(t*1.4+n*8),fall=fract(t*(.18+n*.12)+n);const snow=hash(q*23+i*11)>.8&&Math.abs(y-fall)<.12;v=effectId==='pixel_snow'?(snow?.9:.035):(snow?1:.035);hue=190;sat=.25;break;}
      case 'frost': {const frost=wave(x*4+y*7-t*.2);v=.18+.82*Math.pow(frost,3);hue=195+frost*35;sat=.45;break;}
      case 'heatwave': {const z=y+Math.sin(x*8-t*1.7)*.09;v=.2+.8*wave(z*3-t*.35);hue=8+z*48;sat=.98;break;}
      case 'spectrum_bounce': {const pos=Math.abs(2*fract(t*.12)-1);hue+=(x-pos)*330;sat=.98;break;}
      case 'pendulum': {const px=.5+Math.sin(t*.9)*.43, d=Math.hypot(x-px,y-.5);v=.04+.96*Math.exp(-d*18);break;}
      case 'spiral_rainbow': {hue+=(a/(Math.PI*2)+r*8-t*.16)*360;sat=.98;v=.3+.7*wave(r*2-t*.3);break;}
      case 'reactive_afterglow': {const z=activeWave(entry,1.2);v=.02+.98*z;hue+=z*42;break;}
      case 'reactive_tap_spark': {const z=activeWave(entry,.55);v=.02+.98*Math.pow(z,2.5);hue+=z*180;break;}
      case 'reactive_ripple_rainbow': case 'reactive_burst': case 'reactive_dots': case 'reactive_echo': {let z=0;for(const hit of active){const d=Math.hypot(keyX-hit.src.cx,keyY-hit.src.cy);const ring=effectId==='reactive_dots'?Math.abs(d-hit.age*180):Math.abs(d-hit.age*130);z=Math.max(z,Math.exp(-ring/(effectId==='reactive_dots'?8:16))*hit.decay);}v=.025+.975*z;if(effectId==='reactive_ripple_rainbow'||effectId==='reactive_echo')hue+=z*250;break;}
      case 'reactive_edge': {let z=0;for(const hit of active){const d=Math.min(Math.hypot(keyX-hit.src.cx,keyY-hit.src.cy),Math.hypot(keyX-hit.src.cx,maxY-keyY),Math.hypot(maxX-keyX,keyY-hit.src.cy));z=Math.max(z,Math.exp(-d/45)*hit.decay);}v=.04+.96*z;break;}
      case 'reactive_row': case 'reactive_column': {let z=0;for(const hit of active){const d=effectId==='reactive_row'?Math.abs(keyY-hit.src.cy):Math.abs(keyX-hit.src.cx);z=Math.max(z,Math.exp(-d/12)*hit.decay);}v=.03+.97*z;break;}
      case 'reactive_neighbors': {const z=activeWave(entry,.85);v=.03+.97*z;break;}
      case 'reactive_fade': case 'reactive_glow': {const z=activeWave(entry,effectId==='reactive_glow'?1.9:1);v=.02+.98*z;hue+=z*75;break;}
      case 'reactive_spectrum': {const z=activeWave(entry,.7);v=.02+.98*z;hue+=z*340;break;}
      case 'riverflow': v=.08+.92*wave(y*2.2+x*.6-t*.45);hue+=Math.sin(y*4-t)*18;break;
    }
    const modV=clamp(v*b,0,1);
    if(outputFormat==='rgb') colors[String(lightIndex)]=samplePaletteRgb(paletteColors,(hue-base.h)/360,modV,paletteStops) || hslRgb(hue,sat,modV*.52);
    else colors[String(lightIndex)]=samplePalette(paletteColors,(hue-base.h)/360,modV) || hsl(hue,sat,modV*.52);
  }
  return colors;
}