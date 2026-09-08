import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultFlightPose, validateFlightPose, worldDistance, advanceFlight, turnFlight, flightBasis } from '../fractal-navigation.mjs';

test('the recursive world surrounds connected cross-passages and repeats on every axis', () => {
  assert.ok(worldDistance([0, 0, 2]) > .5);
  assert.ok(worldDistance([2, 0, 0]) > .5);
  assert.ok(worldDistance([0, 2, 0]) > .5);
  assert.ok(worldDistance([1.5, 1.5, 1.5]) < 0);
  for (const scale of [2.05, 2.18, 2.32, 2.45]) {
    assert.ok(worldDistance(defaultFlightPose().position, scale) > .5);
    for (const p of [[.7, 1.8, -.2], [2, 2, 2], [-.3, .2, -2.1]]) {
      for (let axis = 0; axis < 3; axis++) {
        const shifted = p.map((v, i) => v + (i === axis ? 6 : 0));
        assert.ok(Math.abs(worldDistance(p, scale) - worldDistance(shifted, scale)) < 1e-12);
      }
    }
  }
});

test('turning changes subsequent position, reverse retraces, and strafe/rise are independent', () => {
  const start = { position: [0, 0, 0], yaw: 0, pitch: 0 };
  const straight = advanceFlight(start, { forward: 1 }, .05).pose;
  const turned = advanceFlight(turnFlight(start, Math.PI / 2, 0), { forward: 1 }, .05).pose;
  assert.ok(straight.position[2] > 0 && straight.position[0] === 0);
  assert.ok(turned.position[0] > 0 && Math.abs(turned.position[2]) < 1e-10);
  const reversed = advanceFlight(straight, { forward: -1 }, .05).pose;
  assert.ok(Math.hypot(...reversed.position) < 1e-12);
  assert.ok(advanceFlight(start, { rise: 1 }, .05).pose.position[1] > 0);
  assert.ok(advanceFlight(start, { strafe: 1 }, .05).pose.position[0] > 0);
  assert.deepEqual(advanceFlight(straight, {}, .05).pose.position, straight.position);
});

test('bounded substeps stop before surfaces, including at maximum speed and long frame gaps', () => {
  let pose = { position: [0, 0, 0], yaw: Math.PI / 4, pitch: .6 };
  let stopped = false;
  for (let i = 0; i < 1500; i++) {
    const next = advanceFlight(pose, { forward: 1 }, i % 2 ? 100 : .05, { speed: .8, scale: 2.05 });
    assert.ok(worldDistance(next.pose.position) >= .035 - 1e-12);
    stopped ||= next.blocked;
    pose = next.pose;
  }
  assert.ok(stopped);
  const atWall = [...pose.position];
  for (let i = 0; i < 30; i++) pose = advanceFlight(pose, { forward: -1 }, .05, { speed: .8 }).pose;
  assert.ok(Math.hypot(...pose.position.map((v, i) => v - atWall[i])) > .1, 'reverse can leave the collision boundary');
});

test('pose serialization is exact and malformed coordinates/orientations are rejected', () => {
  const pose = defaultFlightPose();
  assert.deepEqual(validateFlightPose(JSON.parse(JSON.stringify(pose))), pose);
  for (const bad of [null, {}, { ...pose, position: [NaN, 0, 0] }, { ...pose, position: ['1', 0, 0] }, { ...pose, position: [0, 0] }, { ...pose, pitch: Math.PI / 2 }, { ...pose, yaw: Infinity }]) assert.throws(() => validateFlightPose(bad), /malformed/);
  const normalized = turnFlight(pose, 300, -400);
  assert.ok(Math.abs(normalized.pitch) <= 1.45 && Math.abs(normalized.yaw) <= Math.PI);
  const basis = flightBasis(normalized);
  for (const vector of Object.values(basis)) assert.ok(Math.abs(Math.hypot(...vector) - 1) < 1e-12);
});
