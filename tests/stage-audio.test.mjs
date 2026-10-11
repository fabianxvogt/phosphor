import test from "node:test";
import assert from "node:assert/strict";
import { StageAudio } from "../stage-audio.mjs";

function audioFixture() {
  const audio = new StageAudio();
  audio.ensure = async () => {};
  audio.node = { port: { postMessage() {} } };
  audio.engine.demo = async () => {
    audio.engine.kind = "demo";
  };
  return audio;
}

test("mute is applied before a source starts and newer mute choices survive async startup", async () => {
  const audio = audioFixture();
  let start;
  audio.ensure = () =>
    new Promise((resolve) => {
      start = resolve;
    });
  const pending = audio.use({ source: "demo", muted: true });
  assert.equal(audio.engine.muted, true);
  audio.engine.mute(false);
  start();
  await pending;
  assert.equal(audio.status().muted, false);
});

test("a late source completion cannot replace the current source status", async () => {
  const audio = audioFixture();
  let finish;
  audio.engine.input = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const input = audio.use({ source: "input" });
  await Promise.resolve();
  await audio.use({ source: "demo" });
  finish();
  await input;
  assert.equal(audio.status().source, "demo");
});

test("mute survives Off and subsequent source changes", async () => {
  const audio = audioFixture();
  await audio.use({ source: "demo", muted: true });
  await audio.use({ source: "off" });
  assert.equal(audio.status().muted, true);
  await audio.use({ source: "demo" });
  assert.equal(audio.status().muted, true);
});
