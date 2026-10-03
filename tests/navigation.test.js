import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { findPath } from "../src/navigation.js";
import { World, rng } from "../src/world.js";
import { SPAWN, POINTS, ENEMIES } from "../src/content.js";
test("navigation detours around walls without cutting corners", () => {
  const canWalk = (x, z) =>
    Math.abs(x) < 5 &&
    Math.abs(z) < 5 &&
    !(Math.abs(x) < 0.8 && Math.abs(z) < 2.2);
  const path = findPath({ x: -3, z: 0 }, { x: 3, z: 0 }, canWalk);
  assert.ok(path.length > 1);
  let prev = { x: -3, z: 0 };
  for (const p of path) {
    for (let t = 0; t <= 1; t += 0.02)
      assert.ok(
        canWalk(prev.x + (p.x - prev.x) * t, prev.z + (p.z - prev.z) * t),
      );
    prev = p;
  }
  assert.deepEqual(path.at(-1), { x: 3, z: 0 });
});
test("unreachable targets return no route", () => {
  const canWalk = (x, z) =>
    Math.abs(x) < 4 && Math.abs(z) < 4 && Math.abs(x) > 0.8;
  assert.deepEqual(findPath({ x: -3, z: 0 }, { x: 3, z: 0 }, canWalk), []);
});
test("every sect, resource, clue, encounter and enemy is reachable by real movement in the expanded map", () => {
  const world = Object.create(World.prototype);
  Object.assign(world, {
    scene: new THREE.Scene(),
    static: [],
    obstacles: [],
    flames: [],
    waters: [],
    fireflies: [],
    smoke: [],
    random: rng(71429),
  });
  world.buildTerrain();
  world.buildVillage();
  world.buildForest();
  world.buildRuin();
  assert.ok(world.canWalk(SPAWN.x, SPAWN.z));
  assert.equal(world.canWalk(-10.5, 0), false);
  assert.equal(world.canWalk(-10.5, 5), true);
  for (const target of [...POINTS, ...ENEMIES]) {
    const path = findPath(SPAWN, target, (x, z) => world.canWalk(x, z));
    assert.ok(path.length > 0, `Unreachable ${target.id}`);
    const actor = new THREE.Group();
    actor.position.set(SPAWN.x, 0, SPAWN.z);
    const remaining = [...path];
    for (let frame = 0; remaining.length && frame < 7000; frame++) {
      const p = remaining[0],
        d = new THREE.Vector3(
          p.x - actor.position.x,
          0,
          p.z - actor.position.z,
        );
      if (d.length() < 0.17) {
        remaining.shift();
        continue;
      }
      d.normalize();
      world.move(actor, (d.x * 4.3) / 60, (d.z * 4.3) / 60);
    }
    assert.equal(remaining.length, 0, `Stuck going to ${target.id}`);
    assert.ok(
      Math.hypot(actor.position.x - target.x, actor.position.z - target.z) <
        2.25,
    );
  }
});
