import assert from 'node:assert/strict';
import {
  AulaHID,
  USB_IDS,
  WIRELESS_USB_IDS,
  WIRELESS_USAGE,
  WIRELESS_REPORT_SIZE,
  buildWirelessRgbCommitPacket,
  buildWirelessRgbPacket,
  buildWirelessSettingsPacket,
  wirelessChecksum
} from './protocol.js';

assert.deepEqual(USB_IDS, { vendorId: 0x0c45, productId: 0x800a });
assert.deepEqual(WIRELESS_USB_IDS, { vendorId: 0x05ac, productId: 0x024f });
assert.equal(WIRELESS_USAGE.rawPage, 0xff60);
assert.equal(WIRELESS_REPORT_SIZE, 32);

const commit = buildWirelessRgbCommitPacket();
assert.equal(commit.length, 32);
assert.equal(commit[0], 0x0f);
assert.equal(commit[31], wirelessChecksum(commit));
assert.equal(commit[31], commit.slice(0, 31).reduce((sum, byte) => (sum + byte) & 0xff, 0));

const rgb = buildWirelessRgbPacket({
  mode: 1,
  rgb: [0x12, 0x34, 0x56],
  rainbow: true,
  brightness: 5,
  speed: 3,
  direction: 2
});
assert.equal(rgb.length, 32);
assert.deepEqual(Array.from(rgb.slice(0, 7)), [0x05, 0x10, 0x00, 0x01, 0x12, 0x34, 0x56]);
assert.deepEqual(Array.from(rgb.slice(11, 15)), [1, 5, 3, 2]);
assert.deepEqual(Array.from(rgb.slice(17, 19)), [0xaa, 0x55]);
assert.equal(rgb[31], wirelessChecksum(rgb));

const off = buildWirelessRgbPacket({ mode: 0, rgb: [1, 2, 3], rainbow: true, brightness: 0, speed: 0, direction: 0 });
assert.deepEqual(Array.from(off.slice(0, 7)), [0x05, 0x10, 0x00, 0x00, 0, 0, 0]);
assert.equal(off[31], wirelessChecksum(off));
assert.throws(() => buildWirelessRgbPacket({ mode: 20 }), /mode must be 0–19/);
assert.throws(() => buildWirelessRgbPacket({ mode: 1, rgb: [256, 0, 0] }), /three values/);

const settings = buildWirelessSettingsPacket({
  disableWin: true,
  disableAltF4: true,
  disableAltTab: false,
  fnToggle: true,
  sleep: 2,
  response: 1
});
assert.equal(settings.length, 32);
assert.deepEqual(Array.from(settings.slice(0, 16)), [
  0x07, 0x10, 0, 0, 1, 1, 1, 1, 1, 2, 0, 1, 0, 0, 1, 1
]);
assert.deepEqual(Array.from(settings.slice(17, 19)), [0xaa, 0x55]);
assert.equal(settings[31], wirelessChecksum(settings));
assert.throws(() => buildWirelessSettingsPacket({ sleep: 4, response: 1 }), /sleep setting/);
assert.throws(() => buildWirelessSettingsPacket({ sleep: 0, response: 0 }), /response level/);

// Verify the transport sends only the wireless receiver's Output reports,
// with the commit packet first, and never uses the wired 64-byte feature path.
const driver = new AulaHID(() => {});
const sent = [];
driver.device = {
  opened: true,
  productName: 'AULA F75 Max 2.4G receiver',
  sendReport: async (reportId, data) => sent.push({ reportId, data: new Uint8Array(data) }),
  sendFeatureReport: async () => { throw new Error('Wired feature reports must not be used in wireless mode.'); }
};
driver.wirelessCollection = { usagePage: 0xff60, outputReports: [{ reportId: 0 }] };
driver.transport = 'wireless';
assert.equal(driver.connected, true);
assert.equal(driver.label, 'AULA F75 Max · 2.4 GHz receiver');
assert.equal(driver.supportsRealtimeStream, false);
await driver.applyLighting({ mode: 8, rgb: [0x12, 0x34, 0x56], rainbow: false, brightness: 4, speed: 2, direction: 3 });
assert.equal(sent.length, 2);
assert.ok(sent.every(report => report.reportId === 0));
assert.deepEqual(Array.from(sent[0].data), Array.from(commit));
assert.deepEqual(Array.from(sent[1].data), Array.from(buildWirelessRgbPacket({ mode: 8, rgb: [0x12, 0x34, 0x56], rainbow: false, brightness: 4, speed: 2, direction: 3 })));
await driver.applySettings({ disableWin: true, disableAltF4: false, disableAltTab: true, fnToggle: false, sleep: 1, response: 0 });
assert.equal(sent.length, 3);
assert.deepEqual(Array.from(sent[2].data), Array.from(buildWirelessSettingsPacket({ disableWin: true, disableAltF4: false, disableAltTab: true, fnToggle: false, sleep: 1, response: 1 })));
assert.equal(sent[2].data[11], 1, 'zero-based UI Level 1 must map to wireless firmware response level 1.');
await assert.rejects(() => driver.enterRealtimePreview(), /not supported through USB-C wired mode|PC-rendered real-time effects/);
await assert.rejects(() => driver.applyPerKey({ 95: [255, 0, 0] }), /not supported through the 2.4 GHz receiver protocol/);
await assert.rejects(() => driver.applyRemap(new Uint8Array(0x240)), /not supported through the 2.4 GHz receiver protocol/);
await assert.rejects(() => driver.applyMacros(new Uint8Array(64)), /not supported through the 2.4 GHz receiver protocol/);

console.log('PASS: 2.4 GHz receiver IDs and FF60 transport, 32-byte checksum-protected native RGB/commit/settings reports, wireless send order, and explicit wired-only feature guards.');

// Endpoint selection must require the receiver's FF60 output collection. A
// Bluetooth HID endpoint sharing the receiver VID/PID must never be selected.
const bluetoothOnly = {
  vendorId: 0x05ac, productId: 0x024f, productName: 'AULA F75 Max Bluetooth',
  collections: [{ usagePage: 0x0001, usage: 0x0006, outputReports: [] }],
  opened: false,
  open: async function () { this.opened = true; },
  close: async function () { this.opened = false; },
  addEventListener() {}
};
const validReceiver = {
  vendorId: 0x05ac, productId: 0x024f, productName: 'AULA F75 Max 2.4G receiver',
  collections: [{ usagePage: 0xff60, usage: 0x0001, outputReports: [{ reportId: 0 }] }],
  opened: false,
  open: async function () { this.opened = true; },
  close: async function () { this.opened = false; },
  addEventListener() {}
};
const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
try {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { hid: {
      getDevices: async () => [bluetoothOnly],
      requestDevice: async ({ filters }) => {
        assert.deepEqual(filters, [WIRELESS_USB_IDS]);
        return [bluetoothOnly, validReceiver];
      }
    } }
  });
  const connectDriver = new AulaHID(() => {});
  await connectDriver.connect('wireless');
  assert.equal(connectDriver.device, validReceiver);
  assert.equal(connectDriver.transport, 'wireless');
  await connectDriver.disconnect();

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { hid: {
      getDevices: async () => [bluetoothOnly],
      requestDevice: async () => [bluetoothOnly]
    } }
  });
  const bluetoothDriver = new AulaHID(() => {});
  await assert.rejects(() => bluetoothDriver.connect('wireless'), /No 2\.4 GHz receiver interface was granted|FF60 output collection/);
  assert.equal(bluetoothOnly.opened, false, 'Bluetooth HID must not be opened as the 2.4 GHz receiver.');
} finally {
  if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator);
  else delete globalThis.navigator;
}

console.log('PASS: 2.4 GHz connect selection validates FF60 and rejects a same-ID Bluetooth endpoint.');