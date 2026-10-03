import * as THREE from "three";
import {
  MAP_SIZE,
  POINTS,
  SCHOOLS,
  CLUES,
  HERBS,
  ENCOUNTER_POINTS,
  ENEMIES,
} from "./content.js";
export { MAP_SIZE, ENEMIES } from "./content.js";
export const LANDMARKS = {
  mira: { x: 1, z: 1 },
  shrine: { x: 16, z: -14 },
  chest: { x: -15, z: 9 },
  fire: { x: -1, z: 5 },
};
export const riverX = (z) => -10.5 + Math.sin(z * 0.19) * 1.2;
export const isRiver = (x, z) => Math.abs(x - riverX(z)) < 1.6;
export const isBridge = (x, z) => x > -13.7 && x < -7 && Math.abs(z - 5) < 1.1;
export function isPath(x, z) {
  return (
    SCHOOLS.some((s) => {
      const ax = 2,
        az = 5,
        dx = s.x - ax,
        dz = s.z - az;
      const t = Math.max(
        0,
        Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)),
      );
      return Math.hypot(x - ax - t * dx, z - az - t * dz) < 0.8;
    }) ||
    (Math.abs(z - 5) < 1.1 && x < 5) ||
    Math.hypot(x - 1, z - 1) < 3.6 ||
    (Math.abs(x - 2) < 1.05 && z > -9 && z < 6) ||
    (Math.abs(z - (1 - Math.sin(x * 0.3) * 1.2)) < 1.05 && x > 1 && x < 17) ||
    (Math.abs(x - 16) < 1.05 && z < 1 && z > -15) ||
    (Math.abs(z + 14) < 1.2 && x > 12 && x < 19)
  );
}

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const materials = new Map();
function material(color, emissive = 0) {
  const key = `${color}/${emissive}`;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshLambertMaterial({
        color,
        emissive: color,
        emissiveIntensity: emissive,
      }),
    );
  return materials.get(key);
}
function meshBox(parent, x, y, z, w, h, d, color, emissive = 0) {
  const m = new THREE.Mesh(boxGeometry, material(color, emissive));
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCharacter(color = "#6a8753", npc = false) {
  const g = new THREE.Group();
  const leftLeg = new THREE.Group(),
    rightLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0.52, 0);
  rightLeg.position.set(0.16, 0.52, 0);
  g.add(leftLeg, rightLeg);
  meshBox(leftLeg, 0, -0.22, 0, 0.22, 0.42, 0.25, "#514536");
  meshBox(rightLeg, 0, -0.22, 0, 0.22, 0.42, 0.25, "#514536");
  meshBox(leftLeg, 0, -0.44, 0.06, 0.24, 0.13, 0.33, "#3b342b");
  meshBox(rightLeg, 0, -0.44, 0.06, 0.24, 0.13, 0.33, "#3b342b");
  meshBox(g, 0, 0.88, 0, 0.59, 0.66, 0.38, color);
  meshBox(g, 0, 0.63, 0.01, 0.61, 0.12, 0.4, "#493d2f");
  meshBox(g, 0.13, 0.64, 0.217, 0.13, 0.12, 0.035, "#c9aa61");
  meshBox(g, -0.41, 0.9, 0, 0.22, 0.46, 0.29, color);
  meshBox(g, -0.41, 0.63, 0.02, 0.2, 0.18, 0.23, "#deb184");
  const arm = new THREE.Group();
  arm.position.set(0.39, 1.04, 0);
  g.add(arm);
  meshBox(arm, 0, -0.14, 0, 0.22, 0.38, 0.28, color);
  meshBox(arm, 0, -0.41, 0, 0.2, 0.19, 0.24, "#deb184");
  meshBox(g, 0, 1.4, 0, 0.52, 0.5, 0.49, "#e0b88e");
  meshBox(g, 0, 1.65, -0.015, 0.57, 0.16, 0.53, npc ? "#d9ded3" : "#644833");
  meshBox(g, 0, 1.49, -0.22, 0.54, 0.32, 0.1, npc ? "#d9ded3" : "#644833");
  meshBox(g, -0.135, 1.43, 0.252, 0.065, 0.075, 0.02, "#2a392c");
  meshBox(g, 0.135, 1.43, 0.252, 0.065, 0.075, 0.02, "#2a392c");
  meshBox(g, 0, 1.31, 0.253, 0.13, 0.038, 0.025, "#b88667");
  meshBox(g, 0, 1.14, 0.02, 0.6, 0.13, 0.44, npc ? "#d6cbab" : "#d1b667");
  meshBox(g, -0.16, 0.95, 0.215, 0.12, 0.3, 0.04, npc ? "#d6cbab" : "#d1b667");
  if (!npc) {
    meshBox(g, 0, 1.78, -0.07, 0.2, 0.24, 0.2, "#443e36");
    meshBox(g, 0, 1.81, -0.07, 0.29, 0.055, 0.24, "#c9aa61");
    meshBox(g, 0, 0.59, 0, 0.68, 0.32, 0.46, color);
  }
  const sword = new THREE.Group();
  sword.position.set(0.04, -0.45, 0.1);
  arm.add(sword);
  if (!npc) {
    meshBox(sword, 0, 0, 0.15, 0.1, 0.1, 0.35, "#715137");
    meshBox(sword, 0, 0, 0.35, 0.35, 0.08, 0.1, "#c9ae68");
    meshBox(sword, 0, 0, 0.85, 0.1, 0.07, 0.9, "#cbd4c4");
    meshBox(sword, 0.018, 0.046, 0.85, 0.045, 0.02, 0.8, "#f0edda");
  }
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.52, 16),
    new THREE.MeshBasicMaterial({
      color: "#162f22",
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.028;
  g.add(shadow);
  const robe = [];
  g.traverse((c) => {
    if (
      c.isMesh &&
      c.material.color?.getHexString() === new THREE.Color(color).getHexString()
    ) {
      c.material = c.material.clone();
      robe.push(c);
    }
  });
  g.userData = { leftLeg, rightLeg, arm, sword, robe };
  return g;
}

export function createSlime() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  meshBox(body, 0, 0.55, 0, 0.8, 1.05, 0.7, "#7e7450");
  meshBox(body, 0, 1.16, 0, 0.94, 0.28, 0.82, "#739275");
  meshBox(body, -0.57, 0.6, 0, 0.28, 0.64, 0.25, "#655e43");
  meshBox(body, 0.57, 0.6, 0, 0.28, 0.64, 0.25, "#655e43");
  meshBox(body, -0.22, 0.46, 0.422, 0.11, 0.14, 0.02, "#203e2e");
  meshBox(body, 0.22, 0.46, 0.422, 0.11, 0.14, 0.02, "#203e2e");
  meshBox(body, 0, 0.3, 0.422, 0.15, 0.035, 0.025, "#476749");
  meshBox(body, -0.28, 0.61, 0.426, 0.18, 0.08, 0.023, "#bbd394");
  meshBox(body, 0.13, 0.98, 0, 0.08, 0.25, 0.08, "#557044");
  meshBox(body, 0.29, 1.06, 0, 0.25, 0.07, 0.14, "#b2c987");
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.65, 16),
    new THREE.MeshBasicMaterial({
      color: "#142e22",
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.024;
  g.add(shadow);
  g.userData.body = body;
  return g;
}

export function createSpiritFox() {
  const g = new THREE.Group();
  meshBox(g, 0, 0.42, 0, 0.5, 0.38, 0.9, "#d4d8b7");
  meshBox(g, 0, 0.68, 0.4, 0.47, 0.39, 0.4, "#ecedce");
  for (const x of [-0.18, 0.18]) {
    meshBox(g, x, 0.98, 0.4, 0.13, 0.24, 0.17, "#bdc6a1");
    meshBox(g, x, 0.69, 0.61, 0.05, 0.07, 0.02, "#397b73");
  }
  for (const x of [-0.18, 0.18])
    for (const z of [-0.3, 0.3])
      meshBox(g, x, 0.2, z, 0.12, 0.35, 0.14, "#c0c6a6");
  meshBox(g, 0, 0.64, -0.65, 0.3, 0.29, 0.67, "#a3c7bd");
  return g;
}

export function createGuardian() {
  const g = createSlime();
  g.scale.setScalar(2.3);
  g.traverse((c) => {
    if (c.isMesh) {
      c.material = c.material.clone();
      c.material.color.set("#768d8b");
    }
  });
  meshBox(g.userData.body, 0, 0.82, 0.44, 0.25, 0.24, 0.09, "#a9e8cf", 0.7);
  return g;
}

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#7a8975");
    this.scene.fog = new THREE.Fog("#7a8975", 38, 82);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor("#7a8975");
    this.camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 140);
    this.camera.position.set(24, 30, 24);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight("#fff4d3", "#52654a", 2.05));
    const sun = new THREE.DirectionalLight("#ffe2a3", 2.7);
    sun.position.set(-18, 32, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -34,
      right: 34,
      top: 34,
      bottom: -34,
      near: 1,
      far: 85,
    });
    sun.shadow.bias = -0.001;
    sun.shadow.normalBias = 0.05;
    this.scene.add(sun);
    this.static = [];
    this.obstacles = [];
    this.flames = [];
    this.waters = [];
    this.fireflies = [];
    this.smoke = [];
    this.random = rng(71429);
    this.pixelScale = 2;
    this.view = 20;
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.hero = createCharacter();
    this.scene.add(this.hero);
    this.mira = createCharacter("#718da0", true);
    this.mira.position.set(LANDMARKS.mira.x, 0, LANDMARKS.mira.z);
    this.mira.rotation.y = 0.55;
    this.scene.add(this.mira);
    this.buildTerrain();
    this.buildVillage();
    this.buildForest();
    this.buildRuin();
    this.buildCultivation();
    this.buildAtmosphere();
    this.flush();
    this.resize();
  }
  cube(x, y, z, w, h, d, color) {
    this.static.push({ x, y, z, w, h, d, color });
  }
  obstacle(x, z, w, d) {
    this.obstacles.push({ x, z, w: w + 0.3, d: d + 0.3 });
  }
  flush() {
    const batch = new THREE.InstancedMesh(
      boxGeometry,
      new THREE.MeshLambertMaterial({ color: "#ffffff" }),
      this.static.length,
    );
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    this.static.forEach((v, i) => {
      dummy.position.set(v.x, v.y, v.z);
      dummy.scale.set(v.w, v.h, v.d);
      dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix);
      batch.setColorAt(i, color.set(v.color));
    });
    batch.castShadow = true;
    batch.receiveShadow = true;
    batch.computeBoundingSphere();
    this.scene.add(batch);
    this.staticMesh = batch;
  }
  buildTerrain() {
    const r = this.random;
    const greens = [
      "#6d8650",
      "#708a52",
      "#769058",
      "#6b824a",
      "#718751",
      "#7b9159",
    ];
    const dirt = ["#b0a07a", "#b8a67c", "#ae9d71", "#b7a27a"];
    for (let x = -MAP_SIZE / 2; x < MAP_SIZE / 2; x++)
      for (let z = -MAP_SIZE / 2; z < MAP_SIZE / 2; z++) {
        const river = isRiver(x, z);
        const path = isPath(x, z);
        const color = river
          ? "#517e7b"
          : path
            ? dirt[Math.floor(r() * dirt.length)]
            : greens[Math.floor(r() * greens.length)];
        this.cube(x, -0.7, z, 1, river ? 0.62 : 1.4, 1, color);
        if (river) {
          this.cube(
            x,
            -0.13,
            z,
            0.99,
            0.12,
            0.99,
            ["#7da39a", "#78a49b", "#729f9a"][Math.floor(r() * 3)],
          );
          if (r() < 0.18) {
            const water = meshBox(
              this.scene,
              x,
              0.01,
              z,
              0.3 + r() * 0.3,
              0.015,
              0.06,
              "#c1d2ba",
            );
            this.waters.push(water);
          }
        }
        if (
          (Math.abs(x) === 24 || x === 23 || Math.abs(z) === 24 || z === 23) &&
          !river
        ) {
          this.cube(x, -2, z, 1, 1.2, 1, "#566043");
          this.cube(x, -2.85, z, 0.9, 0.5, 0.9, "#47573e");
        }
        if (!river && !path && r() < 0.44) {
          const dx = x + (r() - 0.5) * 0.65,
            dz = z + (r() - 0.5) * 0.65;
          this.cube(dx, 0.12, dz, 0.055, 0.24, 0.055, "#516d39");
          this.cube(dx + 0.09, 0.075, dz + 0.05, 0.065, 0.15, 0.045, "#a1af69");
        }
        if (!river && !path && r() < 0.08) {
          this.cube(x + 0.2, 0.12, z + 0.17, 0.05, 0.23, 0.05, "#4f6e3c");
          this.cube(
            x + 0.2,
            0.26,
            z + 0.17,
            0.12,
            0.1,
            0.12,
            ["#d7b05d", "#e5ce96", "#abacc3"][Math.floor(r() * 3)],
          );
        }
        if (path && r() < 0.17)
          this.cube(
            x + (r() - 0.5) * 0.5,
            0.012,
            z + (r() - 0.5) * 0.5,
            0.18,
            0.025,
            0.14,
            "#cec29b",
          );
      }
    // A wooden bridge is the only walkable crossing of the stream.
    for (let x = -13.5; x < -7; x += 0.35) {
      this.cube(x, 0.12, 5, 0.3, 0.24, 2.1, "#927148");
      this.cube(x, 0.05, 4.05, 0.33, 0.11, 0.13, "#584b32");
      this.cube(x, 0.05, 5.95, 0.33, 0.11, 0.13, "#584b32");
    }
    for (const x of [-13.3, -11.3, -9.3, -7.3])
      for (const z of [3.95, 6.05]) {
        this.cube(x, 0.62, z, 0.17, 1.25, 0.17, "#685337");
        this.cube(x, 0.94, z, 1.8, 0.13, 0.14, "#8c724b");
      }
  }
  house(x, z, width = 4, depth = 4, roof = "#a76b47") {
    this.obstacle(x, z, width, depth);
    this.cube(x, 0.16, z, width + 0.3, 0.3, depth + 0.3, "#777351");
    this.cube(x, 1.65, z, width, 3, depth, "#d2be8e");
    for (const dx of [-width / 2 + 0.1, width / 2 - 0.1])
      for (const dz of [-depth / 2 + 0.06, depth / 2 - 0.06])
        this.cube(x + dx, 1.65, z + dz, 0.19, 3, 0.2, "#695336");
    this.cube(x, 1.06, z + depth / 2 + 0.02, 0.83, 1.92, 0.09, "#4d4832");
    this.cube(x + 0.23, 1, z + depth / 2 + 0.082, 0.09, 0.09, 0.035, "#d8b970");
    for (const dx of [-1.23, 1.23]) {
      this.cube(
        x + dx,
        1.73,
        z + depth / 2 + 0.035,
        0.71,
        0.85,
        0.1,
        "#78623e",
      );
      this.cube(
        x + dx,
        1.75,
        z + depth / 2 + 0.095,
        0.49,
        0.62,
        0.08,
        "#edce85",
      );
      this.cube(
        x + dx,
        1.75,
        z + depth / 2 + 0.144,
        0.065,
        0.64,
        0.025,
        "#685334",
      );
      this.cube(
        x + dx,
        1.72,
        z + depth / 2 + 0.146,
        0.51,
        0.065,
        0.02,
        "#685334",
      );
      this.cube(
        x + dx,
        1.21,
        z + depth / 2 + 0.18,
        0.88,
        0.12,
        0.32,
        "#6a633b",
      );
      for (let n = 0; n < 4; n++)
        this.cube(
          x + dx - 0.28 + n * 0.18,
          1.32,
          z + depth / 2 + 0.2,
          0.1,
          0.12,
          0.11,
          n % 2 ? "#bbc185" : "#a46551",
        );
    }
    this.cube(x, 2.92, z, width + 0.15, 0.17, depth + 0.15, "#6a4f34");
    for (let row = 0; row < 6; row++) {
      const w = width + 1.05 - row * 0.65;
      this.cube(x, 3.05 + row * 0.3, z, w, 0.32, depth + 1.05, roof);
      for (let k = 0; k < 5; k++) {
        this.cube(
          x - w / 2 + 0.06,
          3.21 + row * 0.3,
          z - depth / 2 - 0.25 + (k * (depth + 0.5)) / 5,
          0.11,
          0.035,
          0.51,
          k % 2 ? "#c48355" : "#b9774e",
        );
        this.cube(
          x + w / 2 - 0.06,
          3.21 + row * 0.3,
          z - depth / 2 - 0.25 + (k * (depth + 0.5)) / 5,
          0.11,
          0.035,
          0.51,
          "#bd8055",
        );
      }
    }
    for (const dx of [-width / 2 - 0.6, width / 2 + 0.6])
      for (const dz of [-depth / 2 - 0.4, depth / 2 + 0.4]) {
        this.cube(x + dx, 3.2, z + dz, 0.9, 0.16, 0.65, "#56685c");
        this.cube(x + dx * 1.1, 3.35, z + dz, 0.4, 0.15, 0.6, "#56685c");
      }
    this.cube(x + 0.95, 4.12, z - 0.55, 0.65, 2, 0.65, "#9b9070");
    this.cube(x + 0.95, 5.13, z - 0.55, 0.79, 0.16, 0.79, "#625e4a");
    for (let i = 0; i < 4; i++) {
      const p = meshBox(
        this.scene,
        x + 0.95,
        5.4 + i * 0.57,
        z - 0.55,
        0.25 + i * 0.09,
        0.26 + i * 0.07,
        0.25 + i * 0.09,
        "#c8ccb1",
      );
      p.material = new THREE.MeshBasicMaterial({
        color: "#d2d4bf",
        transparent: true,
        opacity: 0.16 - i * 0.025,
        depthWrite: false,
      });
      p.castShadow = false;
      this.smoke.push({ mesh: p, base: p.position.clone(), phase: i * 1.2 });
    }
    this.cube(x, 0.12, z + depth / 2 + 0.57, 1.5, 0.2, 0.8, "#aea785");
    this.cube(x, 1.99, z + depth / 2 + 0.35, 1.18, 0.14, 0.72, "#8d7145");
  }
  lantern(x, z) {
    this.cube(x, 1.35, z, 0.14, 2.7, 0.14, "#5d5138");
    this.cube(x + 0.3, 2.55, z, 0.75, 0.12, 0.14, "#5d5138");
    this.cube(x + 0.61, 2.2, z, 0.3, 0.49, 0.3, "#745c39");
    const glow = meshBox(
      this.scene,
      x + 0.61,
      2.23,
      z,
      0.23,
      0.28,
      0.23,
      "#ffe4a0",
      0.7,
    );
    this.flames.push({ mesh: glow, base: 2.23 });
    this.cube(x + 0.61, 2.5, z, 0.43, 0.08, 0.43, "#4f5137");
  }
  fence(x, z, length, axis = "x") {
    for (let i = 0; i <= length; i += 1.2) {
      this.cube(
        x + (axis === "x" ? i : 0),
        0.65,
        z + (axis === "z" ? i : 0),
        0.15,
        1.3,
        0.15,
        "#82714b",
      );
    }
    this.cube(
      x + (axis === "x" ? length / 2 : 0),
      0.72,
      z + (axis === "z" ? length / 2 : 0),
      axis === "x" ? length : 0.12,
      0.12,
      axis === "z" ? length : 0.12,
      "#998456",
    );
  }
  buildVillage() {
    this.house(-4, -4, 4, 3.6);
    this.house(3, -7, 3.8, 4, "#80916b");
    this.house(-5, -12, 4.2, 3.8, "#9c6b4e");
    this.house(-17, -3, 4.2, 4.5, "#9f774c");
    this.fence(-7, -0.8, 3);
    this.fence(-7, -8.8, 5);
    this.fence(5.8, -9.8, 4.8, "z");
    // Small kitchen garden with individual voxel crops.
    for (let x = -7; x <= -3; x++)
      for (let z = -9; z <= -7; z++) {
        this.cube(x, 0.06, z, 0.78, 0.12, 0.78, "#716347");
        this.cube(x, 0.25, z, 0.08, 0.3, 0.08, "#669145");
        this.cube(x, 0.35, z, 0.34, 0.13, 0.1, "#a5ad62");
        this.cube(x, 0.34, z, 0.1, 0.13, 0.34, "#93a35a");
        this.cube(x, 0.16, z, 0.16, 0.19, 0.16, "#c29048");
      }
    // Well, market canopy, crates and a signpost give the square its daily life.
    for (const p of [
      [-1.5, -2.3],
      [-0.4, -2.3],
      [-0.4, -3.4],
      [-1.5, -3.4],
    ])
      this.cube(p[0], 0.44, p[1], 0.45, 0.9, 0.45, "#939784");
    this.cube(-0.95, 0.37, -2.85, 1.1, 0.1, 1.1, "#567977");
    for (const x of [-1.64, -0.26])
      this.cube(x, 1.34, -2.84, 0.13, 2.65, 0.13, "#75603e");
    this.cube(-0.95, 2.63, -2.84, 1.8, 0.16, 0.85, "#987d4f");
    for (const x of [-4, -1.7])
      this.cube(x, 1.05, 1, 0.12, 2.1, 0.12, "#695a3c");
    for (let i = 0; i < 8; i++)
      this.cube(
        -4.15 + i * 0.35,
        2.19,
        1,
        0.35,
        0.12,
        1.65,
        i % 2 ? "#d3c69b" : "#8b9e73",
      );
    this.cube(-2.8, 0.88, 1, 2.6, 0.18, 1.2, "#8a7247");
    for (let i = 0; i < 6; i++)
      this.cube(
        -3.7 + i * 0.33,
        1.09,
        1,
        0.22,
        0.24,
        0.24,
        i % 2 ? "#c49957" : "#9fa46b",
      );
    for (const p of [
      [-5, 1],
      [-5.7, 1.3],
      [4.5, -4.1],
    ]) {
      this.cube(p[0], 0.43, p[1], 0.75, 0.85, 0.75, "#977a50");
      this.cube(p[0], 0.43, p[1] + 0.385, 0.72, 0.09, 0.03, "#594e32");
      this.cube(p[0], 0.43, p[1] - 0.385, 0.72, 0.09, 0.03, "#594e32");
      this.cube(p[0], 0.43, p[1] + 0.4, 0.09, 0.81, 0.03, "#c3a673");
    }
    this.lantern(4, 3);
    this.lantern(-6, 5);
    this.lantern(7, 1);
    this.lantern(-13, 6);
    this.cube(6.7, 0.9, 3.2, 0.16, 1.8, 0.16, "#79613b");
    this.cube(6.7, 1.45, 3.2, 1.25, 0.38, 0.1, "#ad9361");
    this.cube(6.5, 1.05, 3.2, 1.15, 0.34, 0.1, "#9a8052");
    const f = LANDMARKS.fire;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.cube(
        f.x + Math.cos(a) * 0.55,
        0.16,
        f.z + Math.sin(a) * 0.55,
        0.28,
        0.3,
        0.28,
        "#9c9a7e",
      );
    }
    this.cube(f.x, 0.12, f.z, 0.75, 0.17, 0.22, "#6c5235");
    this.cube(f.x, 0.13, f.z, 0.22, 0.2, 0.75, "#725233");
    for (let i = 0; i < 4; i++) {
      const flame = meshBox(
        this.scene,
        f.x + (i % 2) * 0.15 - 0.07,
        0.36 + i * 0.1,
        f.z,
        0.2,
        0.38 - i * 0.055,
        0.2,
        i % 2 ? "#f5d588" : "#da914d",
        0.5,
      );
      this.flames.push({ mesh: flame, base: 0.36 + i * 0.1 });
    }
    this.tree(-7, 1.4, "gold", 0.86);
    this.tree(7, -6, "broad", 0.93);
    this.tree(-6.8, 9, "broad", 0.85);
    const c = LANDMARKS.chest;
    this.chest = new THREE.Group();
    this.chest.position.set(c.x, 0, c.z);
    meshBox(this.chest, 0, 0.38, 0, 0.85, 0.62, 0.65, "#8b6a3b");
    this.chestLid = meshBox(this.chest, 0, 0.76, 0, 0.91, 0.2, 0.69, "#ac8950");
    meshBox(this.chest, 0, 0.48, 0.34, 0.18, 0.4, 0.05, "#d3ba71");
    meshBox(this.chest, -0.31, 0.4, 0.33, 0.05, 0.65, 0.05, "#c2a25b");
    meshBox(this.chest, 0.31, 0.4, 0.33, 0.05, 0.65, 0.05, "#c2a25b");
    this.scene.add(this.chest);
  }
  tree(x, z, kind = "pine", scale = 1) {
    const r = this.random;
    const h = (4.3 + r() * 1.7) * scale;
    this.cube(x, h * 0.33, z, 0.4 * scale, h * 0.66, 0.4 * scale, "#766040");
    this.obstacle(x, z, 0.55, 0.55);
    if (kind === "pine") {
      const cols = ["#456c4d", "#537b53", "#648a58", "#749761"];
      for (let i = 0; i < 5; i++) {
        const w = (3.3 - i * 0.5) * scale;
        this.cube(
          x,
          h * 0.42 + i * 0.66 * scale,
          z,
          w,
          0.85 * scale,
          w,
          cols[Math.min(3, i)],
        );
        this.cube(
          x + w * 0.31,
          h * 0.43 + i * 0.66 * scale + 0.12,
          z + w * 0.16,
          w * 0.45,
          0.72 * scale,
          w * 0.5,
          cols[Math.min(3, i + 1)],
        );
      }
      this.cube(
        x,
        h * 0.42 + 3.35 * scale,
        z,
        0.4 * scale,
        0.8 * scale,
        0.4 * scale,
        "#829a63",
      );
    } else {
      const cols =
        kind === "gold"
          ? ["#be994e", "#c8ad60", "#d6bd72", "#b0944e"]
          : ["#638452", "#739355", "#859f63", "#567848"];
      for (let i = 0; i < 16; i++) {
        const ox = (r() - 0.5) * 2.8 * scale,
          oz = (r() - 0.5) * 2.8 * scale,
          oy = h * 0.63 + r() * 1.6 * scale;
        const size = (1.2 + r() * 0.7) * scale;
        this.cube(
          x + ox,
          oy,
          z + oz,
          size,
          0.9 * scale + r() * 0.4,
          size,
          cols[Math.floor(r() * cols.length)],
        );
      }
    }
    // Fallen leaves around the trunk.
    for (let i = 0; i < 10; i++)
      this.cube(
        x + (r() - 0.5) * 3 * scale,
        0.035,
        z + (r() - 0.5) * 3 * scale,
        0.1,
        0.04,
        0.15,
        kind === "gold" ? "#ccb369" : "#a0aa65",
      );
  }
  buildForest() {
    const r = this.random;
    for (let i = 0; i < 240; i++) {
      const x = -30 + r() * 60,
        z = -30 + r() * 60;
      if (
        isRiver(x, z) ||
        POINTS.some(
          (p) =>
            Math.hypot(x - p.x, z - p.z) < (p.kind === "school" ? 4.5 : 2.5),
        ) ||
        isPath(x, z) ||
        isPath(x + 1, z) ||
        isPath(x - 1, z) ||
        Math.hypot(x - 1, z - 3) < 7.3 ||
        Math.hypot(x - 16, z + 14) < 4.6 ||
        Math.hypot(x - LANDMARKS.chest.x, z - LANDMARKS.chest.z) < 2.8 ||
        this.obstacles.some(
          (o) =>
            Math.abs(x - o.x) < o.w / 2 + 1.3 &&
            Math.abs(z - o.z) < o.d / 2 + 1.3,
        ) ||
        ENEMIES.some((e) => Math.hypot(x - e.x, z - e.z) < 2)
      )
        continue;
      this.tree(
        x,
        z,
        r() < 0.68 ? "pine" : r() < 0.45 ? "gold" : "broad",
        0.75 + r() * 0.3,
      );
    }
    for (let i = 0; i < 45; i++) {
      const x = -30 + r() * 60,
        z = -30 + r() * 60;
      if (
        isRiver(x, z) ||
        POINTS.some((p) => Math.hypot(x - p.x, z - p.z) < 3.5) ||
        ENEMIES.some((p) => Math.hypot(x - p.x, z - p.z) < 3) ||
        isPath(x, z) ||
        this.obstacles.some(
          (o) =>
            Math.abs(x - o.x) < o.w / 2 + 1 && Math.abs(z - o.z) < o.d / 2 + 1,
        ) ||
        Math.hypot(x - 1, z - 4) < 4
      )
        continue;
      const w = 0.4 + r() * 0.5;
      this.cube(x, 0.2, z, w, 0.4, w * 0.8, "#8c957e");
      this.cube(x + 0.1, 0.4, z, 0.4, 0.19, 0.35, "#a7ad90");
      this.obstacle(x, z, w, w * 0.8);
    }
    for (const [x, z] of [
      [8, 4],
      [10, -4],
      [17, 3],
      [12, -13],
      [-13, 9],
      [-15, 4],
    ]) {
      for (let i = 0; i < 3; i++) {
        this.cube(x + i * 0.28, 0.15, z + i * 0.12, 0.09, 0.3, 0.09, "#d2c7a0");
        this.cube(x + i * 0.28, 0.34, z + i * 0.12, 0.3, 0.14, 0.3, "#ba7755");
        this.cube(
          x + i * 0.28 + 0.03,
          0.42,
          z + i * 0.12,
          0.08,
          0.02,
          0.07,
          "#e7daba",
        );
      }
    }
  }
  buildRuin() {
    const s = LANDMARKS.shrine;
    for (let x = 13; x <= 19; x++)
      for (let z = -17; z <= -11; z++)
        if ((x + z) % 3 !== 0)
          this.cube(x, 0.04, z, 0.93, 0.1, 0.93, "#a5ad92");
    for (const [dx, dz, h] of [
      [-2, -2, 3.2],
      [2, -2, 4.1],
      [-2, 2, 1.7],
      [2, 2, 2.8],
    ]) {
      this.cube(s.x + dx, 0.2, s.z + dz, 1.1, 0.4, 1.1, "#818e7b");
      this.cube(s.x + dx, h / 2, s.z + dz, 0.61, h, 0.61, "#a5af98");
      this.cube(s.x + dx, h, s.z + dz, 0.9, 0.22, 0.9, "#abb49b");
      for (let i = 0; i < 3; i++)
        this.cube(
          s.x + dx + 0.32,
          0.7 + i * 0.52,
          s.z + dz,
          0.04,
          0.26,
          0.5,
          "#688661",
        );
    }
    this.cube(s.x, 0.25, s.z, 1.85, 0.5, 1.85, "#85957f");
    this.cube(s.x, 0.62, s.z, 1.31, 0.27, 1.31, "#b3b9a0");
    this.cube(s.x, 0.87, s.z, 0.9, 0.23, 0.9, "#849580");
    this.crystal = new THREE.Group();
    meshBox(this.crystal, 0, 0, 0, 0.56, 0.84, 0.56, "#b2d4c8", 0.28);
    meshBox(this.crystal, 0, 0.48, 0, 0.28, 0.24, 0.28, "#d4ecd7", 0.32);
    meshBox(this.crystal, 0, -0.47, 0, 0.27, 0.26, 0.27, "#78b8b2", 0.3);
    this.crystal.rotation.z = 0.2;
    this.crystal.position.set(s.x, 1.65, s.z);
    this.scene.add(this.crystal);
    const light = new THREE.PointLight("#a1e5ca", 2, 7);
    light.position.set(s.x, 2, s.z);
    this.scene.add(light);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 1.4, 32),
      new THREE.MeshBasicMaterial({
        color: "#c6d6ab",
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s.x, 0.13, s.z);
    this.scene.add(ring);
  }
  buildAtmosphere() {
    const r = this.random;
    for (let i = 0; i < 65; i++) {
      const p = meshBox(
        this.scene,
        -20 + r() * 40,
        0.5 + r() * 5,
        -20 + r() * 40,
        0.045,
        0.045,
        0.045,
        "#ebdfa1",
        0.5,
      );
      p.castShadow = false;
      this.fireflies.push({
        mesh: p,
        base: p.position.clone(),
        phase: r() * Math.PI * 2,
      });
    }
    // Low, angular cloud wisps far beyond the valley.
    for (let i = 0; i < 7; i++) {
      this.cube(
        -23 + i * 8,
        11 + r() * 2,
        -27,
        3 + r() * 3,
        0.35,
        1.3,
        "#a5b19b",
      );
    }
  }
  buildCultivation() {
    this.markers = new Map();
    this.people = new Map([["mentor", this.mira]]);
    for (const s of SCHOOLS) {
      const npc = createCharacter(s.color, true);
      npc.position.set(s.x, 0, s.z);
      npc.rotation.y = 0.6;
      this.scene.add(npc);
      this.people.set(`school-${s.id}`, npc);
      for (const dx of [-2, 2])
        this.cube(s.x + dx, 1.5, s.z - 1.7, 0.18, 3, 0.18, "#5e5948");
      this.cube(s.x, 3, s.z - 1.7, 4.6, 0.22, 0.7, "#58685e");
      this.cube(s.x, 3.25, s.z - 1.7, 3.5, 0.18, 0.9, "#697b69");
      this.cube(s.x - 1.7, 2, s.z - 1.7, 0.55, 1.3, 0.11, s.color);
      this.cube(s.x, 2.95, s.z - 1.2, 1.8, 0.5, 0.1, "#484f44");
      this.lantern(s.x + 2.3, s.z + 1);
    }
    const traveler = createCharacter("#bb9c76", true);
    traveler.position.set(8, 0, 0);
    this.scene.add(traveler);
    this.people.set("traveler", traveler);
    const fox = createSpiritFox();
    fox.position.set(-21, 0, 19);
    this.scene.add(fox);
    this.markers.set("fox", fox);
    for (const h of HERBS) {
      const plant = new THREE.Group();
      plant.position.set(h.x, 0, h.z);
      meshBox(plant, 0, 0.25, 0, 0.1, 0.5, 0.1, "#42695a");
      meshBox(plant, 0, 0.45, 0, 0.7, 0.16, 0.2, "#a6c8a6", 0.15);
      meshBox(plant, 0, 0.6, 0, 0.25, 0.2, 0.25, "#e4d890", 0.2);
      this.scene.add(plant);
      this.markers.set(h.id, plant);
    }
    for (const c of [...CLUES, ...ENCOUNTER_POINTS]) {
      const group = new THREE.Group();
      group.position.set(c.x, 0, c.z);
      meshBox(group, 0, 0.65, 0, 0.85, 1.3, 0.65, "#8c9b86");
      meshBox(group, 0, 1.37, 0, 1.02, 0.14, 0.82, "#afbaa1");
      meshBox(
        group,
        0,
        0.75,
        0.34,
        0.14,
        0.5,
        0.04,
        c.symbol ? "#b8e0c9" : "#dec889",
        0.4,
      );
      this.scene.add(group);
      this.markers.set(c.id, group);
    }
    this.cube(-4, 0.5, 5, 0.8, 1, 0.8, "#666b5c");
    this.cube(-4, 1.1, 5, 1.05, 0.17, 1.05, "#c29b65");
    this.cube(-4, 1.38, 5, 0.5, 0.4, 0.5, "#657965");
    this.cube(24, 0.4, 10, 0.85, 0.8, 0.65, "#615c4a");
    this.cube(24, 0.86, 10, 0.9, 0.12, 0.7, "#b29c6a");
  }
  canWalk(x, z) {
    if (Math.abs(x) > MAP_SIZE / 2 - 1 || Math.abs(z) > MAP_SIZE / 2 - 1)
      return false;
    if (isRiver(x, z) && !isBridge(x, z)) return false;
    return !this.obstacles.some(
      (o) =>
        Math.abs(x - o.x) < o.w / 2 + 0.22 &&
        Math.abs(z - o.z) < o.d / 2 + 0.22,
    );
  }
  move(group, dx, dz) {
    const p = group.position;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.18));
    for (let i = 0; i < steps; i++) {
      if (this.canWalk(p.x + dx / steps, p.z)) p.x += dx / steps;
      if (this.canWalk(p.x, p.z + dz / steps)) p.z += dz / steps;
    }
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.renderer.setSize(
      Math.ceil(w / this.pixelScale),
      Math.ceil(h / this.pixelScale),
      false,
    );
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.updateProjection();
  }
  updateProjection() {
    this.camera.left = (-this.view * innerWidth) / innerHeight;
    this.camera.right = (this.view * innerWidth) / innerHeight;
    this.camera.top = this.view;
    this.camera.bottom = -this.view;
    this.camera.updateProjectionMatrix();
  }
  setQuality(scale) {
    this.pixelScale = scale;
    this.resize();
  }
  project(pos) {
    const v = pos.clone().project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * innerWidth,
      y: (-0.5 * v.y + 0.5) * innerHeight,
      visible:
        v.z > -1 && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1,
    };
  }
  animate(t, dt, playing) {
    const desiredView = playing ? 12.5 : 20;
    if (Math.abs(this.view - desiredView) > 0.005) {
      this.view += (desiredView - this.view) * (1 - Math.exp(-dt * 3));
      this.updateProjection();
    }
    this.flames.forEach(({ mesh, base }, i) => {
      mesh.scale.y = 0.18 + Math.sin(t * 8 + i) * 0.045;
      mesh.position.y = base + Math.sin(t * 7 + i) * 0.035;
    });
    this.waters.forEach((m, i) => {
      m.scale.x = 0.38 + Math.sin(t * 1.5 + i) * 0.15;
      m.position.y = -0.018 + Math.sin(t * 2 + i) * 0.01;
    });
    this.smoke.forEach(({ mesh, base, phase }) => {
      mesh.position.x = base.x + Math.sin(t * 0.7 + phase) * 0.12;
      mesh.position.y = base.y + ((t * 0.25 + phase) % 1) * 0.7;
    });
    this.fireflies.forEach(({ mesh, base, phase }) => {
      mesh.position.set(
        base.x + Math.sin(t * 0.4 + phase) * 0.6,
        base.y + Math.sin(t * 0.8 + phase) * 0.45,
        base.z + Math.cos(t * 0.4 + phase) * 0.5,
      );
      mesh.visible = Math.sin(t * 1.4 + phase) > -0.35;
    });
    this.crystal.position.y = 1.75 + Math.sin(t * 1.6) * 0.16;
    this.crystal.rotation.y = t * 0.45;
    const dest = playing
      ? this.hero.position.clone()
      : new THREE.Vector3(-1.5, 0, -1.5);
    if (!playing)
      dest.add(
        new THREE.Vector3(
          Math.sin(t * 0.09) * 0.4,
          0,
          Math.cos(t * 0.09) * 0.4,
        ),
      );
    this.cameraTarget.lerp(dest, 1 - Math.exp(-dt * 3));
    const offset = new THREE.Vector3(26, 30, 26);
    this.camera.position.copy(this.cameraTarget).add(offset);
    this.camera.lookAt(
      this.cameraTarget.x,
      this.cameraTarget.y,
      this.cameraTarget.z,
    );
    this.renderer.render(this.scene, this.camera);
  }
}
