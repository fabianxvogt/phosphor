import test from "node:test";
import assert from "node:assert/strict";
import { FlashLimiter } from "../flash-limiter.mjs";

function flashes(samples) {
  let anchor = samples[0].y, extreme = anchor, direction = 0;
  const times = [];
  for (const { y, time } of samples.slice(1)) {
    if (!direction) {
      if (y - anchor >= 0.1 && anchor < 0.8) { direction = 1; extreme = y; }
      else if (anchor - y >= 0.1 && y < 0.8) { direction = -1; extreme = y; }
    } else if (direction === 1) {
      extreme = Math.max(extreme, y);
      if (extreme - y >= 0.1 && y < 0.8) { times.push(time); direction = 0; anchor = y; }
    } else {
      extreme = Math.min(extreme, y);
      if (y - extreme >= 0.1 && extreme < 0.8) { times.push(time); direction = 0; anchor = y; }
    }
  }
  return times;
}

function strobe(enabled, exempt = false) {
  const limiter = new FlashLimiter();
  const samples = [];
  for (let frame = 0; frame < 600; frame++) {
    const time = frame / 60;
    const input = Math.floor(frame / 3) % 2;
    const gain = limiter.update(input, time, enabled, exempt);
    samples.push({ time, y: input * gain });
  }
  return { samples, times: flashes(samples), limiter };
}

test("a 10 Hz full-frame strobe has at most three general flashes in any second", () => {
  const { times, limiter } = strobe(true);
  for (const time of times) assert.ok(times.filter(t => t > time - 1 && t <= time).length <= 3);
  assert.ok(limiter.limitedFrames > 0);
});

test("disabled and safe-look-exempt strobes remain unchanged", () => {
  for (const [enabled, exempt] of [[false, false], [true, true]]) {
    const { samples, times } = strobe(enabled, exempt);
    assert.deepEqual(samples.map(s => s.y), samples.map((_, frame) => Math.floor(frame / 3) % 2));
    assert.ok(times.length > 90);
  }
});

test("steady images are untouched, including after a limited burst", () => {
  const limiter = new FlashLimiter();
  for (let frame = 0; frame < 120; frame++) assert.equal(limiter.update(0.45, frame / 60), 1);
  for (let frame = 120; frame < 180; frame++) limiter.update(Math.floor(frame / 3) % 2, frame / 60);
  for (let frame = 180; frame < 360; frame++) limiter.update(0.45, frame / 60);
  assert.equal(limiter.update(0.45, 6), 1);
});

test("the first bright approved frame reserves the flash from startup black", () => {
  const limiter = new FlashLimiter();
  const samples = [{time:0,y:0}];
  for (let frame=1;frame<60;frame++) {
    const input=Math.floor(frame/3)%2===0 ? .7 : 0;
    samples.push({time:frame/60,y:input*limiter.update(input,frame/60)});
  }
  const times=flashes(samples);
  assert.ok(times.length<=3,`startup emitted ${times.length} flashes`);
});

test("sRGB8 rounding cannot turn subthreshold excursions into unlimited flashes", () => {
  const limiter = new FlashLimiter();
  const quantizedLuminance = linear => {
    const srgb = linear <= .0031308 ? linear*12.92 : 1.055*linear**(1/2.4)-.055;
    const byte = Math.round(srgb*255)/255;
    return byte <= .04045 ? byte/12.92 : ((byte+.055)/1.055)**2.4;
  };
  const samples = [{time:0,y:0}];
  for (let frame=1;frame<600;frame++) {
    const input=Math.floor(frame/3)%2===0 ? .549 : .45;
    samples.push({time:frame/60,y:quantizedLuminance(input*limiter.update(input,frame/60))});
  }
  const times=flashes(samples);
  for (const time of times) assert.ok(times.filter(t=>t>time-1&&t<=time).length<=3);
});
