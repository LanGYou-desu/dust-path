import test from "node:test";
import assert from "node:assert/strict";
import { resolveKey, handleGameplayKey } from "../src/controls.js";

function keyboardEvent(patch = {}) {
  return {
    code: "",
    key: "",
    repeat: false,
    target: { tagName: "CANVAS" },
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
    ...patch,
  };
}

test("all advertised keys also work when an embedded browser omits code", () => {
  const expected = {
    w: "KeyW",
    A: "KeyA",
    s: "KeyS",
    D: "KeyD",
    j: "KeyJ",
    e: "KeyE",
    q: "KeyQ",
    i: "KeyI",
    m: "KeyM",
    k: "KeyK",
    c: "KeyC",
    n: "KeyN",
    " ": "Space",
    Enter: "Enter",
    Shift: "ShiftLeft",
    ArrowUp: "ArrowUp",
    1: "Digit1",
    2: "Digit2",
  };
  for (const [key, code] of Object.entries(expected))
    assert.equal(resolveKey(keyboardEvent({ key })), code);
  assert.equal(
    resolveKey(keyboardEvent({ code: "KeyJ", key: "Process" })),
    "KeyJ",
  );
  assert.equal(
    resolveKey(keyboardEvent({ code: "Unidentified", key: "e" })),
    "KeyE",
  );
  assert.equal(resolveKey(keyboardEvent({ code: "KeyZ", key: "w" })), "KeyW");
});

test("cultivation controls dispatch immediately without disturbing movement", () => {
  const keys = new Set(["KeyW"]),
    fired = [];
  for (const [key, action] of [
    ["k", "cast"],
    ["c", "cultivation"],
    ["n", "sects"],
  ]) {
    const event = keyboardEvent({ key });
    handleGameplayKey(event, keys, { [action]: () => fired.push(action) });
    assert.equal(event.prevented, true);
  }
  assert.deepEqual(fired, ["cast", "cultivation", "sects"]);
  assert.ok(keys.has("KeyW"));
});

test("a J tap fires before keyup even if no animation frame has happened", () => {
  const keys = new Set();
  let attacks = 0;
  handleGameplayKey(keyboardEvent({ key: "j" }), keys, {
    attack: () => attacks++,
  });
  keys.delete("KeyJ");
  assert.equal(attacks, 1);
  assert.equal(keys.size, 0);
});

test("held key repeats do not consume extra potions or advance extra dialogue", () => {
  const keys = new Set();
  let potions = 0,
    interactions = 0;
  const actions = { drink: () => potions++, interact: () => interactions++ };
  for (const key of ["q", "e"]) {
    handleGameplayKey(keyboardEvent({ key }), keys, actions);
    for (let i = 0; i < 10; i++)
      handleGameplayKey(keyboardEvent({ key, repeat: true }), keys, actions);
  }
  assert.equal(potions, 1);
  assert.equal(interactions, 1);
});

test("Space and Enter dispatch their own actions while another HUD button is focused", () => {
  const keys = new Set();
  const fired = [];
  for (const [key, action] of [
    [" ", "dodge"],
    ["Enter", "interact"],
  ]) {
    const event = keyboardEvent({ key, target: { tagName: "BUTTON" } });
    handleGameplayKey(event, keys, { [action]: () => fired.push(action) });
    assert.equal(event.prevented, true);
  }
  assert.deepEqual(fired, ["dodge", "interact"]);
});

test("text fields and browser shortcuts retain native keyboard behavior", () => {
  for (const patch of [
    { ctrlKey: true },
    { altKey: true },
    { metaKey: true },
    { target: { tagName: "INPUT" } },
    { target: { isContentEditable: true } },
  ]) {
    const event = keyboardEvent({ key: "j", ...patch });
    const keys = new Set();
    assert.equal(
      handleGameplayKey(event, keys, {
        attack() {
          assert.fail("Unexpected attack");
        },
      }),
      null,
    );
    assert.equal(event.prevented, false);
    assert.equal(keys.size, 0);
  }
});
