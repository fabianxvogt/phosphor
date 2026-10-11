import test from "node:test";
import assert from "node:assert/strict";
import physarum, {
  packAgent,
  unpackAgent,
  sensorTurn,
  stepAgent,
  diffuseTrail,
} from "../scene-physarum.mjs";
import { presetSnapshot, validateSnapshot } from "../session.mjs";
import { defaultPattern, validatePattern } from "../rhythm.mjs";

test("three-sensor steering follows forward/left/right chemotaxis", () => {
  assert.equal(sensorTurn(3, 2, 1, 0.4), 0);
  assert.equal(sensorTurn(2, 3, 1, 0.4), 0.4);
  assert.equal(sensorTurn(2, 1, 3, 0.4), -0.4);
  assert.equal(sensorTurn(0, 2, 2, 0.4, 0.1), -0.4);
  assert.equal(sensorTurn(0, 2, 2, 0.4, 0.9), 0.4);
  assert.equal(sensorTurn(1, 1, 1, 0.4), 0);
});

test("continuous agent state round-trips with 12-bit positions and an 8-bit heading", () => {
  for (let i = 0; i < 1000; i++) {
    const agent = {
      x: i / 1001,
      y: ((i * 317) % 1001) / 1001,
      heading: (i / 1001) * Math.PI * 2,
    };
    const packed = packAgent(agent),
      decoded = unpackAgent(packed);
    packed.forEach((byte) =>
      assert.ok(Number.isInteger(byte) && byte >= 0 && byte <= 255),
    );
    assert.ok(Math.abs(decoded.x - agent.x) <= 0.5 / 4095 + 1e-12);
    assert.ok(Math.abs(decoded.y - agent.y) <= 0.5 / 4095 + 1e-12);
    assert.ok(
      Math.abs(decoded.heading - agent.heading) <= Math.PI / 255 + 1e-12,
    );
  }
});

test("flat fields preserve heading; movement and sensors wrap the torus", () => {
  const samples = [];
  const agent = { x: 0.999, y: 0.5, heading: 0 };
  const next = stepAgent(agent, (x, y) => {
    samples.push([x, y]);
    return 0;
  });
  assert.equal(next.heading, 0);
  assert.ok(next.x < 0.01);
  assert.equal(next.y, agent.y);
  assert.equal(samples.length, 3);
  assert.ok(samples.every((point) => point.every((v) => v >= 0 && v < 1)));
  assert.deepEqual(
    next,
    stepAgent(agent, () => 0),
  );
});

test("trail mean filtering conserves mass before retention and diffuses across boundaries", () => {
  const trail = new Float64Array(25);
  trail[0] = 1;
  const diffuse = diffuseTrail(trail, 5, 5, 1, 0.9);
  assert.ok(
    Math.abs(diffuse.reduce((sum, value) => sum + value, 0) - 0.9) < 1e-12,
  );
  assert.ok(diffuse[4] > 0 && diffuse[20] > 0 && diffuse[24] > 0);
  assert.ok(Math.max(...diffuse) < 1);
});

test("Physarum study has eight valid looks, four habitats and separate field feedback", () => {
  assert.equal(physarum.presets.length, 8);
  for (const variant of physarum.type.values)
    assert.ok(physarum.presets.some((look) => look.params.habitat === variant));
  for (let i = 0; i < physarum.presets.length; i++) {
    const snapshot = presetSnapshot(physarum, i);
    assert.deepEqual(validateSnapshot(snapshot, [physarum]), snapshot);
  }
  assert.deepEqual(
    validatePattern(defaultPattern(physarum.rhythm), physarum.rhythm),
    defaultPattern(physarum.rhythm),
  );
  assert.deepEqual(physarum.field.size, [256, 256]);
  assert.match(physarum.simulation.fragment, /pSense/);
  assert.match(physarum.field.fragment, /sum \/ 9\.0/);
  assert.match(physarum.field.depositVertex, /pDecode\(particle\(\)\)/);
});
