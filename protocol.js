/*
 * AULA F75 Max HID protocol helpers.
 * Wired USB-C uses 64-byte feature reports (0C45:800A / FF13).
 * The 2.4 GHz receiver uses 32-byte checksum-protected output reports
 * (05AC:024F / FF60). These transports are deliberately kept separate.
 */
export const USB_IDS = { vendorId: 0x0c45, productId: 0x800a };
export const WIRELESS_USB_IDS = { vendorId: 0x05ac, productId: 0x024f };
export const USAGE = { commandPage: 0xff13, commandUsage: 0x0001 };
export const WIRELESS_USAGE = { rawPage: 0xff60 };
export const WIRELESS_REPORT_SIZE = 32;
export const REPORT_SIZE = 64;
const DELAY_MS = 40;
const REALTIME_ACK_MS = 7;
const REALTIME_BLOCK_GAP_MS = 3;
const REALTIME_PRE_COMMIT_MS = 9;
const REALTIME_ENTER_SETTLE_MS = 200;
export const REALTIME_FRAME_MS = 58.7;
const TABLE_SIZE = 0x240;
const TRAILER = [0xaa, 0x55];

/**
 * Build one AULA real-time colour frame.
 *
 * Captured AULA DeviceDriver.exe stream format on the 0C45:800A / FF13
 * channel: eight 64-byte reports form one flat 128-slot array of
 * [light_index, R, G, B] records. Physical keys are packed in visual reading
 * order; remaining slots are zero padding. There is no terminator block and
 * no AA55 trailer on this stream path.
 *
 * `ledIndices` must already be in visual order (top, then left), as obtained
 * from the exact F75 Max keyboard layout XML.
 */
export function buildRealtimeFramePackets(colors, ledIndices, reusablePayload = null, reusablePackets = null) {
  // Callers may supply one 512-byte buffer and reuse it after each awaited HID
  // transfer. This avoids allocating/copying eight fresh reports on every frame.
  if (!Array.isArray(ledIndices) || !ledIndices.length) throw new Error('No LED indices supplied for the realtime frame.');
  if (ledIndices.length > 128) throw new Error('Realtime stream supports at most 128 key slots.');
  const unique = new Set(ledIndices);
  if (unique.size !== ledIndices.length) throw new Error('Realtime frame contains duplicate LED indices.');
  if (ledIndices.some(i => !Number.isInteger(i) || i < 1 || i > 255)) throw new Error('Realtime LED index must be a non-zero byte.');

  const payload = reusablePayload instanceof Uint8Array && reusablePayload.byteLength === 128 * 4
    ? reusablePayload
    : new Uint8Array(128 * 4);
  payload.fill(0);
  ledIndices.forEach((index, slot) => {
    const rgb = colors[index] || [0, 0, 0];
    if (!Array.isArray(rgb) || rgb.length !== 3 || rgb.some(v => !Number.isFinite(v) || v < 0 || v > 255)) {
      throw new Error(`Invalid RGB value for LED ${index}.`);
    }
    const offset = slot * 4;
    payload[offset] = index;
    payload[offset + 1] = Math.round(rgb[0]);
    payload[offset + 2] = Math.round(rgb[1]);
    payload[offset + 3] = Math.round(rgb[2]);
  });
  if (Array.isArray(reusablePackets) && reusablePackets.length === 8 && reusablePackets.every((packet, block) => packet.buffer === payload.buffer && packet.byteOffset === block * REPORT_SIZE && packet.byteLength === REPORT_SIZE)) return reusablePackets;
  return Array.from({ length: 8 }, (_, block) => payload.subarray(block * REPORT_SIZE, (block + 1) * REPORT_SIZE));
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const bytesOf = view => new Uint8Array(view.buffer, view.byteOffset, view.byteLength);

/** Build the 64-byte host clock block used by the Real-time Lighting entry handshake. */
export function buildRealtimeHostClockPacket(now = new Date()) {
  const packet = new Uint8Array(REPORT_SIZE);
  packet[0] = 0x00;
  packet[1] = 0x01;
  packet[2] = 0x5a;
  packet[3] = (now.getFullYear() - 2000) & 0xff;
  packet[4] = now.getMonth() + 1;
  packet[5] = now.getDate();
  packet[6] = now.getHours();
  packet[7] = now.getMinutes();
  packet[8] = now.getSeconds();
  packet[9] = 0x00;
  packet[10] = now.getDay(); // Keyboard convention: Sunday = 0.
  packet[62] = 0xaa;
  packet[63] = 0x55;
  return packet;
}

/** Checksum used by the F75 Max 2.4 GHz receiver (sum of bytes 0..30). */
export function wirelessChecksum(report) {
  if (!(report instanceof Uint8Array) || report.length !== WIRELESS_REPORT_SIZE) {
    throw new Error(`Wireless report must be exactly ${WIRELESS_REPORT_SIZE} bytes.`);
  }
  let sum = 0;
  for (let i = 0; i < WIRELESS_REPORT_SIZE - 1; i++) sum = (sum + report[i]) & 0xff;
  return sum;
}

function finalizeWirelessReport(report) {
  report[WIRELESS_REPORT_SIZE - 1] = wirelessChecksum(report);
  return report;
}

/** The receiver expects a commit marker before a native RGB mode update. */
export function buildWirelessRgbCommitPacket() {
  const report = new Uint8Array(WIRELESS_REPORT_SIZE);
  report[0] = 0x0f;
  return finalizeWirelessReport(report);
}

/** Build a native AULA RGB-mode output report for the 05AC:024F receiver. */
export function buildWirelessRgbPacket({ mode, rgb = [255, 255, 255], rainbow = false, brightness = 5, speed = 3, direction = 0 }) {
  if (!Number.isInteger(mode) || mode < 0 || mode > 19) throw new Error('Wireless RGB mode must be 0–19.');
  if (!Array.isArray(rgb) || rgb.length !== 3 || rgb.some(v => !Number.isFinite(v) || v < 0 || v > 255)) throw new Error('Wireless RGB colour must contain three values from 0–255.');
  if (!Number.isFinite(brightness) || !Number.isFinite(speed) || !Number.isInteger(direction) || direction < 0 || direction > 3) throw new Error('Invalid wireless brightness, speed or direction.');
  const report = new Uint8Array(WIRELESS_REPORT_SIZE);
  report[0] = 0x05; report[1] = 0x10; report[2] = 0x00; report[3] = mode;
  if (mode !== 0) {
    // The wireless driver captures RGB in R,G,B order, unlike some older
    // 32-byte protocol notes that describe a packed integer in little-endian.
    report[4] = Math.round(rgb[0]); report[5] = Math.round(rgb[1]); report[6] = Math.round(rgb[2]);
    report[11] = rainbow ? 1 : 0;
    report[12] = Math.max(1, Math.min(5, Math.round(brightness)));
    report[13] = Math.max(1, Math.min(5, Math.round(speed)));
    report[14] = direction;
  }
  report[17] = 0xaa; report[18] = 0x55;
  return finalizeWirelessReport(report);
}

/** Wireless performance / sleep / key-restriction settings packet. */
export function buildWirelessSettingsPacket(settings = {}) {
  const sleepValue = Number(settings.sleep ?? 0);
  const responseValue = Number(settings.response ?? 3);
  if (!Number.isInteger(sleepValue) || sleepValue < 0 || sleepValue > 3) throw new Error('Wireless sleep setting must be 0–3.');
  if (!Number.isInteger(responseValue) || responseValue < 1 || responseValue > 5) throw new Error('Wireless response level must be 1–5.');
  const report = new Uint8Array(WIRELESS_REPORT_SIZE);
  report[0] = 0x07; report[1] = 0x10;
  report[4] = 1; report[5] = 1; report[6] = 1; report[7] = 1;
  report[8] = settings.fnToggle ? 1 : 0;
  report[9] = sleepValue;
  report[11] = responseValue;
  report[12] = 0; // Game Mode remains controlled separately by the keyboard.
  report[13] = settings.disableAltTab ? 1 : 0;
  report[14] = settings.disableAltF4 ? 1 : 0;
  report[15] = settings.disableWin ? 1 : 0;
  report[17] = 0xaa; report[18] = 0x55;
  return finalizeWirelessReport(report);
}


export class AulaHID {
  constructor(onLog = () => {}) {
    this.device = null;
    this.controlCollection = null;
    this.wirelessCollection = null;
    this.transport = null;
    this.realtimeReady = false;
    this.realtimeFramePayload = new Uint8Array(128 * 4);
    // Create the eight HID views once. Each frame reuses both the backing
    // payload and the exact report views, avoiding steady-state allocations.
    this.realtimeFramePackets = Array.from({length:8},(_,block)=>this.realtimeFramePayload.subarray(block*REPORT_SIZE,(block+1)*REPORT_SIZE));
    this.onLog = onLog;
  }
  get connected() { return !!this.device?.opened; }
  get label() { return this.transport === 'wireless' ? 'AULA F75 Max · 2.4 GHz receiver' : (this.device?.productName || 'AULA F75 Max · USB-C wired'); }
  get supportsRealtimeStream() { return this.transport === 'wired'; }
  get supportsNativeLighting() { return this.transport === 'wired' || this.transport === 'wireless'; }

  async connect(preferredMode = 'auto') {
    if (!('hid' in navigator)) throw new Error('This desktop runtime does not expose WebHID. Use the Windows desktop build on a supported Chromium runtime.');

    const flatten = list => {
      const out = [];
      const walk = items => (items || []).forEach(c => { out.push(c); walk(c.children); });
      walk(list);
      return out;
    };
    const hasWiredCommand = d => flatten(d?.collections).some(c => Number(c.usagePage) === USAGE.commandPage && Number(c.usage) === USAGE.commandUsage);
    const getWirelessCollection = d => flatten(d?.collections).find(c =>
      Number(c.usagePage) === WIRELESS_USAGE.rawPage && (c.outputReports || []).some(r => Number(r.reportId) === 0)
    );
    const summarizeDevice = d => {
      const collections = flatten(d?.collections).map(c => {
        const features = (c.featureReports || []).map(r => `feature:${r.reportId}`).join(', ') || 'no feature';
        const outputs = (c.outputReports || []).map(r => `output:${r.reportId}`).join(', ') || 'no output';
        return `page=0x${Number(c.usagePage || 0).toString(16).padStart(4,'0')} usage=0x${Number(c.usage || 0).toString(16).padStart(4,'0')} (${features}; ${outputs})`;
      }).join(' | ');
      return `${d.productName || 'AULA HID'} ${Number(d.vendorId).toString(16)}:${Number(d.productId).toString(16)}: ${collections || 'collections not exposed'}`;
    };
    const matching = list => (list || []).filter(d =>
      (Number(d.vendorId) === USB_IDS.vendorId && Number(d.productId) === USB_IDS.productId) ||
      (Number(d.vendorId) === WIRELESS_USB_IDS.vendorId && Number(d.productId) === WIRELESS_USB_IDS.productId)
    );

    const requestedMode = ['wired', 'wireless'].includes(preferredMode) ? preferredMode : 'auto';
    const isWireless = d => Number(d.vendorId) === WIRELESS_USB_IDS.vendorId && Number(d.productId) === WIRELESS_USB_IDS.productId;
    const isWired = d => Number(d.vendorId) === USB_IDS.vendorId && Number(d.productId) === USB_IDS.productId;
    let picks = [];
    try { picks = matching(await navigator.hid.getDevices()); }
    catch (error) { this.onLog(`Existing HID grants could not be enumerated: ${error?.message || error}. Requesting access normally.`, 'info'); }
    if (requestedMode === 'wireless') picks = picks.filter(d => isWireless(d) && getWirelessCollection(d));
    else if (requestedMode === 'wired') picks = picks.filter(d => isWired(d) && hasWiredCommand(d));
    else picks = picks.filter(d => (isWireless(d) && getWirelessCollection(d)) || (isWired(d) && hasWiredCommand(d)));

    // Request only the selected physical transport. This also lets the user
    // grant the receiver later even when a wired HID permission already exists.
    if (!picks.length) {
      const filters = requestedMode === 'wireless' ? [WIRELESS_USB_IDS] : requestedMode === 'wired' ? [USB_IDS] : [WIRELESS_USB_IDS, USB_IDS];
      try { picks = matching(await navigator.hid.requestDevice({ filters })); }
      catch (error) {
        if (error?.name === 'NotFoundError') {
          if (requestedMode === 'wireless') throw new Error('No 2.4 GHz receiver was offered. Insert the AULA receiver, switch the keyboard to 2.4G mode, and press Fn + ~ for 3 seconds to pair if needed.');
          if (requestedMode === 'wired') throw new Error('No wired AULA F75 Max interface was offered. Connect the keyboard by USB-C and switch it to wired mode.');
          throw new Error('No AULA F75 Max interface was offered. Insert the 2.4 GHz receiver or connect USB-C, then select the matching connection mode.');
        }
        throw new Error(`Windows HID permission request failed (${error?.name || 'Error'}): ${error?.message || error}. Check the desktop app HID permission setup and retry.`);
      }
    }
    if (requestedMode === 'wireless') picks = picks.filter(d => isWireless(d) && getWirelessCollection(d));
    else if (requestedMode === 'wired') picks = picks.filter(d => isWired(d) && hasWiredCommand(d));
    else picks = picks.filter(d => (isWireless(d) && getWirelessCollection(d)) || (isWired(d) && hasWiredCommand(d)));
    if (!picks.length) throw new Error(`No ${requestedMode === 'auto' ? 'supported AULA' : requestedMode === 'wireless' ? '2.4 GHz receiver' : 'wired AULA'} interface was granted. Expected wired 0C45:800A or receiver 05AC:024F.`);

    const wirelessPick = picks.find(d => isWireless(d) && getWirelessCollection(d));
    const wiredPick = picks.find(d => isWired(d) && hasWiredCommand(d));
    const device = requestedMode === 'wireless' ? wirelessPick
      : requestedMode === 'wired' ? wiredPick
      : wirelessPick || wiredPick;
    if (!device) {
      const details = picks.map(summarizeDevice).join(' || ');
      if (requestedMode === 'wireless') throw new Error(`The selected 05AC:024F device does not expose the 2.4 GHz receiver's FF60 output collection. Bluetooth HID is not a supported configuration transport. Receiver details: ${details || 'none'}`);
      if (requestedMode === 'wired') throw new Error(`The selected 0C45:800A device does not expose the wired FF13:0001 configuration collection. Device details: ${details || 'none'}`);
      throw new Error(`No supported AULA configuration endpoint was found. Expected wired FF13:0001 (0C45:800A) or 2.4 GHz FF60 output (05AC:024F). Devices: ${details || 'none'}`);
    }
    const selectedTransport = isWireless(device) ? 'wireless' : 'wired';
    this.onLog(`Windows exposed ${picks.length} supported AULA HID device(s): ${picks.map(summarizeDevice).join(' || ')}`, 'info');

    try { await device.open(); }
    catch (error) {
      const name = error?.name || 'HIDError';
      throw new Error(`Windows found the AULA ${selectedTransport === 'wireless' ? '2.4 GHz receiver' : 'wired keyboard'}, but could not open its HID interface (${name}: ${error?.message || 'open failed'}). Close the official AULA configuration program and retry.`);
    }

    const collections = flatten(device.collections);
    if (selectedTransport === 'wireless') {
      const raw = collections.find(c => Number(c.usagePage) === WIRELESS_USAGE.rawPage);
      const outputIds = (raw?.outputReports || []).map(r => Number(r.reportId));
      if (!raw || !outputIds.includes(0)) {
        const details = summarizeDevice(device);
        await device.close();
        throw new Error(`The 2.4 GHz receiver (${WIRELESS_USB_IDS.vendorId.toString(16)}:${WIRELESS_USB_IDS.productId.toString(16)}) was found, but its FF60 output collection/report ID 0 is unavailable. Collections seen: ${details}`);
      }
      this.wirelessCollection = raw;
      this.controlCollection = null;
      this.transport = 'wireless';
      this.onLog(`Connected to the 2.4 GHz receiver output interface / 0xFF60: ${device.productName || 'AULA F75 Max receiver'} (05ac:024f). Native lighting and receiver settings are available.`, 'ok');
    } else {
      const control = collections.find(c => Number(c.usagePage) === USAGE.commandPage && Number(c.usage) === USAGE.commandUsage);
      if (!control) {
        const details = summarizeDevice(device);
        await device.close();
        throw new Error(`The wired device does not expose the expected MI_03 / 0xFF13:0x0001 configuration collection. Collections seen: ${details}`);
      }
      const featureIds = (control.featureReports || []).map(r => Number(r.reportId));
      if (!featureIds.includes(0)) {
        await device.close();
        throw new Error(`The wired MI_03 / 0xFF13 collection is present, but feature report ID 0 is missing. Feature report IDs exposed: ${featureIds.join(', ') || 'none'}.`);
      }
      this.controlCollection = control;
      this.wirelessCollection = null;
      this.transport = 'wired';
      this.onLog(`Connected to wired command interface MI_03 / 0xFF13: ${device.productName || 'AULA F75 Max'} (0c45:800a).`, 'ok');
    }

    this.device = device;
    device.addEventListener('inputreport', event => {
      this.onLog(`Input report ${event.reportId} received (${event.data.byteLength} bytes).`, 'info');
    });
    device.addEventListener('inputreporterror', () => this.onLog('HID input report error.', 'error'));
    return device;
  }

  async disconnect() {
    if (!this.device) return;
    const d = this.device;
    this.device = null;
    this.controlCollection = null;
    this.wirelessCollection = null;
    this.transport = null;
    this.realtimeReady = false;
    if (d.opened) await d.close();
    this.onLog('Keyboard disconnected.', 'info');
  }

  assertConnected() {
    const hasTransport = this.transport === 'wireless' ? Boolean(this.wirelessCollection) : this.transport === 'wired' && Boolean(this.controlCollection);
    if (!this.device?.opened || !hasTransport) throw new Error('Connect the AULA F75 Max by USB-C or with its 2.4 GHz receiver first.');
  }
  assertWired(operation = 'This operation') {
    this.assertConnected();
    if (this.transport !== 'wired') throw new Error(`${operation} is not supported through the 2.4 GHz receiver protocol. Use USB-C wired mode for per-key RGB tables, remapping, macros and PC-rendered real-time animations.`);
  }
  async sendWirelessReport(packet, label = 'wireless report') {
    this.assertConnected();
    if (this.transport !== 'wireless') throw new Error('Wireless output was requested while the wired transport is active.');
    if (!(packet instanceof Uint8Array) || packet.byteLength !== WIRELESS_REPORT_SIZE) throw new Error(`Internal error: ${label} must be exactly ${WIRELESS_REPORT_SIZE} bytes.`);
    await this.device.sendReport(0, packet);
  }

  async send(payload, readback = false, expectAckFor = null) {
    this.assertWired('64-byte feature-report command');
    if (!(payload instanceof Uint8Array) || payload.byteLength !== REPORT_SIZE) throw new Error('Internal error: HID payload must be exactly 64 bytes.');
    await this.device.sendFeatureReport(0, payload);
    await sleep(DELAY_MS);
    if (!readback) return null;
    const raw = await this.device.receiveFeatureReport(0);
    const response = bytesOf(raw);
    if (expectAckFor !== null) {
      if (response.length < 4 || response[1] !== expectAckFor || response[3] !== 0x01) {
        throw new Error(`Device ACK mismatch for 04 ${expectAckFor.toString(16).padStart(2, '0')}: ${Array.from(response.slice(0,8)).map(v=>v.toString(16).padStart(2,'0')).join(' ')}`);
      }
    }
    await sleep(DELAY_MS);
    return response;
  }

  commandPacket(op, fields = {}) {
    const packet = new Uint8Array(REPORT_SIZE);
    packet[0] = 0x04;
    packet[1] = op & 0xff;
    for (const [offset, value] of Object.entries(fields)) packet[Number(offset)] = Number(value) & 0xff;
    return packet;
  }
  async sendRealtimePacket(packet, label, readback = true) {
    this.assertWired('Real-time Lighting stream');
    if (!(packet instanceof Uint8Array) || packet.byteLength !== REPORT_SIZE) {
      throw new Error('Internal error: real-time HID payload must be exactly 64 bytes.');
    }
    await this.device.sendFeatureReport(0, packet);
    if (!readback) return null;
    await sleep(REALTIME_ACK_MS);
    try {
      const response = bytesOf(await this.device.receiveFeatureReport(0));
      const bytes = Array.from(response.slice(0, 8)).map(v => v.toString(16).padStart(2, '0')).join(' ');
      // The vendor real-time helper reads these reports to drain the HID
      // response, but does not enforce the normal config ACK byte. The clock
      // setup reply in particular can be 04 28 00 ... on this device family.
      if (response.length < 4 || response[3] !== 0x01) {
        this.onLog(`Real-time ${label} readback (non-standard ACK): ${bytes || 'empty'}. Continuing as the vendor stream does.`, 'info');
      }
      return response;
    } catch (error) {
      this.onLog(`Real-time ${label} readback unavailable (${error?.message || error}); continuing with the captured stream sequence.`, 'info');
      return null;
    }
  }
  async sendRealtimeCommand(op, fields = {}, label = `04 ${op.toString(16).padStart(2, '0')}`) {
    return this.sendRealtimePacket(this.commandPacket(op, fields), label, true);
  }
  async enterRealtimePreview() {
    this.assertWired('PC-rendered real-time effects');
    if (this.realtimeReady) return;
    this.onLog('Entering AULA Real-time Lighting host-control mode…', 'info');

    // One-time handshake used by the reference AULA 0C45:800A driver:
    // begin -> select RTC/host-control -> send host clock block -> apply.
    // Readbacks are consumed but not judged by the normal config ACK rule.
    await this.sendRealtimeCommand(0x18, {}, 'host-control begin');
    await this.sendRealtimeCommand(0x28, { 8: 0x01 }, 'host-control select');
    await this.sendRealtimePacket(buildRealtimeHostClockPacket(), 'host-control clock block', true);
    await this.sendRealtimeCommand(0x02, {}, 'host-control apply');
    await sleep(REALTIME_ENTER_SETTLE_MS);

    this.realtimeReady = true;
    this.onLog('AULA Real-time Lighting is ready. Custom frames will now use the built-in 04 20 stream.', 'ok');
  }
  async streamRealtimeFrame(colors, ledIndices) {
    this.assertWired('PC-rendered real-time effects');
    if (!this.realtimeReady) await this.enterRealtimePreview();
    const packets = buildRealtimeFramePackets(colors, ledIndices, this.realtimeFramePayload, this.realtimeFramePackets);
    // Steady-state vendor stream: 04 20 (byte 8 = 8), eight raw 64-byte
    // colour blocks, then 04 02. The host-control handshake happens once
    // before the first frame; there is no begin/end around each frame.
    await this.sendRealtimeCommand(0x20, { 8: packets.length }, 'frame header 04 20');
    for (let i = 0; i < packets.length; i++) {
      await this.device.sendFeatureReport(0, packets[i]);
      if (i < packets.length - 1) await sleep(REALTIME_BLOCK_GAP_MS);
    }
    await sleep(REALTIME_PRE_COMMIT_MS);
    await this.sendRealtimeCommand(0x02, {}, 'frame commit 04 02');
  }
  async command(op, fields = {}) {
    this.onLog(`→ command 04 ${op.toString(16).padStart(2,'0')}`, 'info');
    const response = await this.send(this.commandPacket(op, fields), true, op);
    this.onLog(`✓ ACK 04 ${op.toString(16).padStart(2,'0')}`, 'ok');
    return response;
  }
  async begin() { await this.command(0x18); }
  async apply() { await this.command(0x02); }
  async finalize() {
    await this.send(this.commandPacket(0xf0), false);
    this.onLog('→ finalize', 'info');
  }
  async bulk(data, readLast = true) {
    if (!(data instanceof Uint8Array) || data.length % REPORT_SIZE !== 0) throw new Error('Bulk data must be aligned to 64-byte reports.');
    for (let offset = 0; offset < data.length; offset += REPORT_SIZE) {
      const last = offset + REPORT_SIZE >= data.length;
      const page = data.slice(offset, offset + REPORT_SIZE);
      await this.send(page, Boolean(readLast && last), null);
      if (last && readLast) this.onLog('✓ Final data page acknowledged.', 'ok');
    }
  }

  async applyLighting({ mode, rgb, rainbow, brightness, speed, direction }) {
    this.assertConnected();
    this.realtimeReady = false;
    if (!Number.isInteger(mode) || mode < 0 || mode > 19) throw new Error('Effect mode must be 0–19.');
    if (this.transport === 'wireless') {
      // Captured 05AC:024F path: commit, short settle, then one native 32-byte
      // FF60 output report. It is not the wired 04 20 streaming protocol.
      await this.sendWirelessReport(buildWirelessRgbCommitPacket(), 'RGB commit');
      await sleep(50);
      await this.sendWirelessReport(buildWirelessRgbPacket({ mode, rgb, rainbow, brightness, speed, direction }), 'RGB mode');
      this.onLog('Native AULA lighting sent through the 2.4 GHz receiver.', 'ok');
      return;
    }
    const p = new Uint8Array(REPORT_SIZE);
    p[0] = mode;
    if (mode !== 0) {
      p.set(rgb, 1);
      p[8] = rainbow ? 1 : 0;
      p[9] = brightness;
      p[10] = speed;
      p[11] = direction & 0x03;
    }
    p.set(TRAILER, 14);
    await this.begin();
    await this.command(0x13, { 8: 1 });
    await this.send(p, false);
    await this.apply();
    await this.finalize();
    this.onLog('Lighting effect applied.', 'ok');
  }

  async applyPerKey(colors, brightness = 5) {
    this.assertWired('Per-key RGB writes');
    const table = new Uint8Array(TABLE_SIZE);
    for (const [indexText, rgb] of Object.entries(colors)) {
      const index = Number(indexText);
      if (!Number.isInteger(index) || index < 1 || index > 142) continue;
      table.set([index, rgb[0], rgb[1], rgb[2]], index * 4);
    }
    table.set(TRAILER, TABLE_SIZE - 2);
    const preamble = new Uint8Array(REPORT_SIZE);
    preamble[0] = 0x80;
    preamble[9] = brightness;
    preamble.set(TRAILER, 14);
    await this.begin();
    await this.command(0x13, { 8: 1 });
    await this.send(preamble, false);
    await this.apply();
    await this.finalize();
    await this.begin();
    await this.command(0x23, { 8: 0x09 });
    await this.bulk(table, true);
    await this.apply();
    await this.finalize();
    this.onLog('Per-key RGB data sent. Confirm the physical LED mapping.', 'ok');
  }

  async applyRemap(table, fnLayer = false) {
    this.assertWired('Key remapping');
    await this.begin();
    await this.command(fnLayer ? 0x27 : 0x11, { 8: 0x09 });
    await this.bulk(table, true);
    await this.apply();
    await this.finalize();
  }

  async applyMacros(data) {
    this.assertWired('Macro writes');
    await this.command(0x19);
    await this.command(0x15, { 8: data.length / REPORT_SIZE });
    await sleep(40);
    await this.bulk(data, true);
    await sleep(40);
    await this.apply();
  }

  async applySettings(settings) {
    this.assertConnected();
    if (this.transport === 'wireless') {
      // The Settings panel stores response level as zero-based UI values 0–4;
      // the 2.4 GHz report expects firmware levels 1–5.
      await this.sendWirelessReport(buildWirelessSettingsPacket({ ...settings, response: Number(settings.response ?? 0) + 1 }), 'performance/settings');
      this.onLog('Performance and key-restriction settings sent through the 2.4 GHz receiver.', 'ok');
      return;
    }
    const p = new Uint8Array(REPORT_SIZE);
    p[0] = 0; p[1] = 1;
    p[2] = settings.disableWin ? 1 : 0;
    p[3] = settings.disableAltF4 ? 1 : 0;
    p[4] = settings.disableAltTab ? 1 : 0;
    p[5] = settings.fnToggle ? 1 : 0;
    p[6] = settings.sleep;
    p[8] = settings.response;
    p.set(TRAILER, 62);
    await this.begin();
    await this.command(0x17, { 2: 1, 8: 1 });
    await this.send(p, false);
    await this.apply();
  }
}

export function buildRgbTable(colors) {
  const table = new Uint8Array(TABLE_SIZE);
  for (const [indexText, hex] of Object.entries(colors || {})) {
    const index = Number(indexText);
    if (!Number.isInteger(index) || index < 1 || index > 142) continue;
    const value = String(hex).replace('#','');
    if (!/^[0-9a-fA-F]{6}$/.test(value)) continue;
    const rgb = [0,2,4].map(i => parseInt(value.slice(i,i+2),16));
    table.set([index, ...rgb], index * 4);
  }
  table.set(TRAILER, TABLE_SIZE - 2);
  return table;
}

export function buildRemapTable(actions) {
  const table = new Uint8Array(TABLE_SIZE);
  for (const [indexText, action] of Object.entries(actions || {})) {
    const index = Number(indexText);
    if (!Number.isInteger(index) || index < 1 || index > 142) continue;
    table.set(actionToSlot(action), index * 4);
  }
  table.set(TRAILER, TABLE_SIZE - 2);
  return table;
}

function actionToSlot(action = {}) {
  switch (action.kind || 'default') {
    case 'default': return [0,0,0,0];
    case 'disable': return [0x05,0x03,0,0];
    case 'key': {
      const key = Number(action.key || 0), mods = Number(action.mods || 0);
      if (key >= 0xe0 && key <= 0xe7) return [0x02, (1 << (key - 0xe0)) | mods, 0, 0];
      return [0x02, mods, key & 0xff, 0];
    }
    case 'consumer': return [0x03, Number(action.code || 0) & 0xff, 0, 0];
    case 'mouse': return [0x07, ...(action.mouse || [0,0,0]).map(v => Number(v) & 0xff)];
    case 'macro': return [0x06, Number(action.macro || 0) & 0xff, Number(action.macro_mode || 0) & 0xff, Number(action.repeat || 1) & 0xff];
    case 'special': { const n = Number(action.code || 0); return [0x01, (n >> 8) & 0xff, n & 0xff, 0]; }
    default: throw new Error(`Unknown key action: ${action.kind}`);
  }
}

const FLAG = { key_down: 0xb0, key_up: 0x30, mouse_down: 0x90, mouse_up: 0x10 };
export function buildMacroBuffer(macros) {
  if (macros.length > 100) throw new Error('Maximum 100 macro slots.');
  const used = (macros.length + macros.reduce((sum,m) => sum + (m.events || []).length, 0)) * 8;
  if (used > 2700) throw new Error(`Macro memory limit exceeded (${used}/2700 bytes).`);
  const buf = new Uint8Array(0xe00);
  let offset = 100 * 4;
  macros.forEach((macro, slot) => {
    const events = macro.events || [];
    if (!events.length) { buf.fill(0xff, slot*4, slot*4+4); return; }
    buf[slot*4] = offset & 0xff;
    buf[slot*4+1] = (offset >> 8) & 0xff;
    const records = [];
    for (const event of events) {
      const flag = FLAG[event.kind];
      if (!flag) throw new Error(`Unknown macro event: ${event.kind}`);
      const code = Number(event.code) & 0xff;
      const delay = Math.max(10, Math.min(0xffff, Number(event.delay || 10)));
      records.push(0,0,code,flag,delay & 0xff,(delay >> 8)&0xff,0,0x50);
    }
    const recordLen = records.length;
    const recordsCountUnits = recordLen / 4;
    buf[offset] = recordsCountUnits & 0xff;
    buf[offset+1] = (recordsCountUnits >> 8) & 0xff;
    buf.set(records, offset + 8);
    offset += 8 + recordLen;
  });
  const pageCount = Math.floor(offset / REPORT_SIZE) + ((offset % REPORT_SIZE === 0) ? 1 : 2);
  const size = pageCount * REPORT_SIZE;
  if (size > 0xe00) throw new Error('Macro data exceeds keyboard memory.');
  const out = buf.slice(0, size);
  out.set(TRAILER, size - 2);
  return out;
}

export function functionPacket(settings) {
  const p = new Uint8Array(REPORT_SIZE);
  p[0] = 0; p[1] = 1;
  p[2] = +!!settings.disableWin;
  p[3] = +!!settings.disableAltF4;
  p[4] = +!!settings.disableAltTab;
  p[5] = +!!settings.fnToggle;
  p[6] = settings.sleep;
  p[8] = settings.response;
  p.set(TRAILER, 62);
  return p;
}