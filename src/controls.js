// Some embedded browsers provide `key` without a physical `code`.
// Keep normalization and action dispatch together so all controls use one path.
const keyAliases = {
  " ": "Space",
  Spacebar: "Space",
  Space: "Space",
  Esc: "Escape",
  Escape: "Escape",
  Enter: "Enter",
  Return: "Enter",
  Tab: "Tab",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Left: "ArrowLeft",
  Right: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Shift: "ShiftLeft",
};

export function resolveKey(event) {
  const key = event.key ?? "";
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  if (keyAliases[key])
    return key === "Shift" && event.code === "ShiftRight"
      ? "ShiftRight"
      : keyAliases[key];
  // `Process` from an IME is not a printable key; use its physical code.
  return event.code && event.code !== "Unidentified" ? event.code : "";
}

export const MOVEMENT_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
]);

const actionsByCode = {
  KeyJ: "attack",
  Digit1: "attack",
  Space: "dodge",
  ShiftLeft: "dodge",
  ShiftRight: "dodge",
  KeyE: "interact",
  Enter: "interact",
  KeyQ: "drink",
  Digit2: "drink",
  KeyI: "inventory",
  KeyM: "map",
  KeyK: "cast",
  KeyC: "cultivation",
  KeyN: "sects",
};

export const KEY_LABELS = {
  KeyW: "W",
  KeyA: "A",
  KeyS: "S",
  KeyD: "D",
  ArrowUp: "↑",
  ArrowLeft: "←",
  ArrowDown: "↓",
  ArrowRight: "→",
  KeyJ: "J",
  Digit1: "1",
  Space: "空格",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  KeyE: "E",
  Enter: "Enter",
  KeyQ: "Q",
  Digit2: "2",
  KeyI: "I",
  KeyM: "M",
  KeyK: "K",
  KeyC: "C",
  KeyN: "N",
};
export const ACTION_LABELS = {
  KeyW: "向上移动",
  ArrowUp: "向上移动",
  KeyA: "向左移动",
  ArrowLeft: "向左移动",
  KeyS: "向下移动",
  ArrowDown: "向下移动",
  KeyD: "向右移动",
  ArrowRight: "向右移动",
  attack: "挥剑",
  dodge: "闪避",
  interact: "互动",
  drink: "使用回春丹",
  inventory: "打开背包",
  map: "打开地图",
  cast: "施展功法",
  cultivation: "打开修炼",
  sects: "查看门派",
};

export function handleGameplayKey(event, heldKeys, actions) {
  if (event.ctrlKey || event.altKey || event.metaKey) return null;
  const target = event.target;
  if (
    target?.isContentEditable ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(target?.tagName)
  )
    return null;
  const code = resolveKey(event);
  const action = actionsByCode[code];
  if (!action && !MOVEMENT_KEYS.has(code)) return null;
  // Consume Enter/Space on focused HUD buttons instead of activating that button.
  event.preventDefault();
  heldKeys.add(code);
  if (!event.repeat && action) actions[action]?.();
  return {
    code,
    label: KEY_LABELS[code],
    action: ACTION_LABELS[action ?? code],
  };
}
