// A* on a half-unit grid. Diagonal moves cannot cut through obstacle corners.
export function findPath(start, goal, canWalk, options = {}) {
  const step = 0.5,
    bound = Math.ceil((options.halfSize ?? 31) / step),
    width = bound * 2 + 1;
  const key = (x, z) => (z + bound) * width + x + bound;
  const fromKey = (id) => ({
    x: ((id % width) - bound) * step,
    z: (Math.floor(id / width) - bound) * step,
  });
  const nearest = (point) => {
    const x = Math.round(point.x / step),
      z = Math.round(point.z / step);
    let best = null,
      dist = Infinity;
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx,
          nz = z + dz;
        if (
          Math.abs(nx) > bound ||
          Math.abs(nz) > bound ||
          !canWalk(nx * step, nz * step)
        )
          continue;
        const d = Math.hypot(nx * step - point.x, nz * step - point.z);
        if (d < dist) {
          dist = d;
          best = { x: nx, z: nz };
        }
      }
    return best;
  };
  const source = nearest(start),
    target = nearest(goal);
  if (!source || !target) return [];
  const sourceKey = key(source.x, source.z),
    targetKey = key(target.x, target.z);
  const cost = new Map([[sourceKey, 0]]),
    parents = new Map(),
    closed = new Set();
  const open = [{ id: sourceKey, x: source.x, z: source.z, f: 0 }];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (let limit = 0; open.length && limit < width * width; limit++) {
    let best = 0;
    for (let i = 1; i < open.length; i++)
      if (open[i].f < open[best].f) best = i;
    const current = open.splice(best, 1)[0];
    if (closed.has(current.id)) continue;
    if (current.id === targetKey) {
      const result = [];
      let id = targetKey;
      while (id !== sourceKey) {
        result.unshift(fromKey(id));
        id = parents.get(id);
      }
      result.unshift(fromKey(sourceKey));
      return smoothPath(start, result, canWalk);
    }
    closed.add(current.id);
    for (const [dx, dz] of dirs) {
      const x = current.x + dx,
        z = current.z + dz;
      if (
        Math.abs(x) > bound ||
        Math.abs(z) > bound ||
        !canWalk(x * step, z * step)
      )
        continue;
      if (
        dx &&
        dz &&
        (!canWalk((current.x + dx) * step, current.z * step) ||
          !canWalk(current.x * step, (current.z + dz) * step))
      )
        continue;
      const id = key(x, z);
      if (closed.has(id)) continue;
      const g = cost.get(current.id) + Math.hypot(dx, dz);
      if (g >= (cost.get(id) ?? Infinity)) continue;
      cost.set(id, g);
      parents.set(id, current.id);
      open.push({ id, x, z, f: g + Math.hypot(target.x - x, target.z - z) });
    }
  }
  return [];
}
function smoothPath(start, path, canWalk) {
  const out = [];
  let anchor = start,
    index = 0;
  while (index < path.length) {
    let far = index;
    for (let i = index; i < path.length; i++) {
      const p = path[i],
        d = Math.hypot(p.x - anchor.x, p.z - anchor.z),
        steps = Math.ceil(d / 0.12);
      let clear = true;
      for (let n = 1; n <= steps; n++) {
        if (
          !canWalk(
            anchor.x + ((p.x - anchor.x) * n) / steps,
            anchor.z + ((p.z - anchor.z) * n) / steps,
          )
        ) {
          clear = false;
          break;
        }
      }
      if (!clear) break;
      far = i;
    }
    out.push(path[far]);
    anchor = path[far];
    index = far + 1;
  }
  return out;
}
