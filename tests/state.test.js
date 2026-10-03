import test from "node:test";
import assert from "node:assert/strict";
import {
  Adventure,
  SAVE_KEY,
  LEGACY_SAVE_KEY,
  questInfo,
  SPAWN,
} from "../src/state.js";
import {
  SCHOOLS,
  CLUES,
  HERBS,
  ENEMIES,
  ENCOUNTER_POINTS,
} from "../src/content.js";
function prepared(id, origin = "rescue") {
  const a = new Adventure(71429);
  assert.ok(a.begin());
  assert.ok(a.chooseOrigin(origin));
  a.openChest();
  HERBS.forEach((h) => a.harvest(h.id));
  if (id === "sword" || id === "beast")
    ENEMIES.filter((e) => !e.boss)
      .slice(0, 3)
      .forEach((e) => a.defeat(e.id));
  if (id === "dan") a.brew("heal");
  if (id === "beast") a.feedFox();
  if (id === "array") CLUES.forEach((c) => a.readClue(c.id));
  if (id === "shadow") a.takeCache();
  assert.ok(a.finishTrial(id));
  assert.ok(a.joinSect(id));
  return a;
}
function reachThree(a) {
  while (a.level < 3) {
    while (a.qi < a.nextXp) {
      if (a.herbs < 3) {
        a.playTime = Math.max(a.playTime, a.nextRefresh);
        a.rest();
        HERBS.forEach((h) => a.harvest(h.id));
      }
      assert.ok(a.brew("qi"));
    }
    if (a.coins < (a.level === 1 ? 20 : 30)) {
      assert.ok(a.commission(a.sect, "herbs"));
    }
    assert.ok(a.breakthrough());
  }
}
for (const s of SCHOOLS)
  test(`${s.name}: both solutions and all endings complete and survive reload`, () => {
    for (const origin of ["rescue", "explore"])
      for (const resolution of ["seal", "battle"])
        for (const ending of ["report", "keep", "neutral"]) {
          const a = prepared(s.id, origin);
          reachThree(a);
          if (resolution === "seal") {
            CLUES.forEach((c) => a.readClue(c.id));
            assert.ok(a.seal());
            assert.equal(a.seal(), false);
          } else {
            assert.ok(a.awakenBoss());
            assert.ok(a.defeat("guardian"));
            assert.equal(a.defeat("guardian"), null);
          }
          assert.ok(a.finish(ending));
          assert.equal(a.finish(ending), false);
          assert.equal(questInfo(a).count, "✓");
          const b = Adventure.restore(a.serialize());
          assert.ok(b);
          assert.deepEqual(
            JSON.parse(b.serialize()),
            JSON.parse(a.serialize()),
          );
        }
  });
test("peaceful scatter path reaches the ending without combat or random opportunities", () => {
  const a = prepared("wander");
  reachThree(a);
  CLUES.forEach((c) => a.readClue(c.id));
  assert.ok(a.seal());
  assert.ok(a.finish("neutral"));
  assert.equal(a.kills, 0);
  assert.equal(Object.keys(a.encounterResults).length, 0);
});
test("turning paths retains skills, charges reputation and permits repairing the relationship", () => {
  const a = prepared("dan");
  const qi = a.qi;
  assert.ok(a.leaveSect());
  assert.equal(a.qi, qi);
  assert.ok(a.learned.includes("dan"));
  assert.equal(a.reputation.dan, -20);
  assert.equal(a.joinSect("dan"), false);
  assert.ok(a.finishTrial("wander"));
  assert.ok(a.joinSect("wander"));
  assert.ok(a.equip("dan"));
  assert.equal(a.skillCost(), 28);
  a.herbs = 6;
  assert.ok(a.commission("dan", "herbs"));
  assert.ok(a.commission("dan", "herbs"));
  assert.equal(a.reputation.dan, 0);
  a.leaveSect();
  assert.ok(a.joinSect("dan"));
  assert.equal(a.learned.length, 2);
  assert.equal(a.skillCost(), 22);
});
test("manual breakthrough never triggers merely by gaining qi; insufficient resources preserve all balances", () => {
  const a = new Adventure(1);
  assert.equal(a.breakthrough(), false);
  a.begin();
  a.gainQi(500);
  assert.equal(a.level, 1);
  a.coins = 0;
  const snapshot = a.serialize();
  assert.equal(a.breakthrough(), false);
  assert.equal(a.serialize(), snapshot);
});
test("harvest, crafting and commissions form a renewable growth loop and do not duplicate unique rewards", () => {
  const a = prepared("sword");
  assert.equal(a.finishTrial("sword"), false);
  assert.equal(a.openChest(), false);
  assert.equal(a.defeat("fern"), null);
  assert.equal(a.harvest(HERBS[0].id), false);
  assert.ok(a.rest());
  assert.ok(a.harvest(HERBS[0].id));
  assert.ok(a.defeat("fern"));
  assert.equal(a.rest(), false);
  a.playTime = 30;
  assert.ok(a.rest());
  a.herbs = 0;
  assert.equal(a.brew("heal"), false);
  assert.equal(a.commission("sword", "herbs"), false);
});
test("clues can be discovered in any order and array trial can be corrected", () => {
  const a = new Adventure(1);
  a.begin();
  for (const id of ["sky", "wood", "earth"]) a.readClue(id);
  assert.equal(a.clues.length, 3);
  assert.equal(a.trialReady("array"), false);
  a.readClue("wood");
  a.readClue("sky");
  assert.ok(a.trialReady("array"));
  const qi = a.qi;
  a.readClue("sky");
  assert.equal(a.qi, qi);
  assert.ok(Adventure.restore(a.serialize()));
});
test("opportunity deck is seeded, unique and outcomes are irreversible across reload", () => {
  const a = new Adventure(123),
    b = new Adventure(123);
  assert.deepEqual(a.encounters, b.encounters);
  assert.equal(new Set(Object.values(a.encounters)).size, 4);
  assert.notDeepEqual(a.encounters, new Adventure(456).encounters);
  a.herbs = 99;
  a.food = 99;
  for (const p of ENCOUNTER_POINTS) {
    assert.ok(a.chooseEncounter(p.id, 0));
    assert.equal(a.chooseEncounter(p.id, 1), false);
  }
  const c = Adventure.restore(a.serialize());
  assert.ok(c);
  assert.deepEqual(c.encounterResults, a.encounterResults);
  assert.deepEqual(c.encounters, a.encounters);
});
test("death preserves paths and plot, full health does not waste medicine", () => {
  const a = prepared("dan");
  assert.equal(a.drink(), false);
  a.hurt(80);
  const before = a.hp;
  assert.ok(a.drink());
  assert.equal(a.hp - before, 60);
  a.coins = 2;
  a.hurt(999);
  const b = Adventure.restore(a.serialize());
  assert.ok(b);
  assert.equal(b.hp, b.maxHp);
  assert.equal(b.coins, 0);
  assert.equal(b.sect, "dan");
  assert.deepEqual(b.position, SPAWN);
});
test("new saves use an independent namespace and corrupted data is rejected", () => {
  assert.notEqual(SAVE_KEY, LEGACY_SAVE_KEY);
  assert.equal(Adventure.restore(null), null);
  assert.equal(Adventure.restore("{bad"), null);
  const a = prepared("dan");
  for (const patch of [
    { version: 2 },
    { level: 9 },
    { hp: 999 },
    { mana: 999 },
    { coins: -1 },
    { sect: "unknown" },
    { equipped: "sword" },
    { learned: ["dan", "dan"] },
    { choices: { origin: "rescue", resolution: "seal", ending: null } },
    { position: { x: 100, z: 0 } },
    { seed: -1 },
    { sigils: ["sky"] },
    { reputation: { dan: 0 } },
    { encounters: {} },
    { encounterResults: { bad: 0 } },
    { defeatCycles: { bad: 0 } },
  ])
    assert.equal(
      Adventure.restore(
        JSON.stringify({ ...JSON.parse(a.serialize()), ...patch }),
      ),
      null,
    );
});
test("changing roads after completion preserves the historical ending and completed quest", () => {
  const a = prepared("dan");
  reachThree(a);
  CLUES.forEach((c) => a.readClue(c.id));
  a.seal();
  a.finish("report");
  a.leaveSect();
  assert.equal(questInfo(a).count, "✓");
  a.finishTrial("wander");
  a.joinSect("wander");
  assert.equal(a.sect, "wander");
  assert.equal(a.endingPath, "dan");
  assert.equal(a.choices.ending, "report");
  assert.equal(Adventure.restore(a.serialize()).endingPath, "dan");
});
