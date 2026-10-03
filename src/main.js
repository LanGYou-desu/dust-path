import * as THREE from "three";
import {
  World,
  createSlime,
  createGuardian,
  createSpiritFox,
  isRiver,
  isPath,
} from "./world.js";
import { Adventure, SAVE_KEY, LEGACY_SAVE_KEY, questInfo } from "./state.js";
import {
  MAP_SIZE,
  SPAWN,
  SCHOOLS,
  SCHOOL_BY_ID,
  PATH_EPILOGUES,
  POINTS,
  CLUES,
  HERBS,
  ENEMIES,
} from "./content.js";
import { icon, paintIcons } from "./icons.js";
import { Soundscape } from "./audio.js";
import { findPath } from "./navigation.js";
import { resolveKey, handleGameplayKey } from "./controls.js";
const $ = (id) => document.getElementById(id);
paintIcons();
let world;
try {
  world = new World($("world"));
} catch (error) {
  $("loading").innerHTML = "<p>3D 场景无法启动，请开启浏览器硬件加速。</p>";
  throw error;
}
let adventure = new Adventure(),
  saved = null,
  playing = false,
  modalOpen = false,
  dead = false;
let stamina = 100,
  attackTimer = 0,
  attackCooldown = 0,
  dodgeTimer = 0,
  dodgeCooldown = 0,
  invincible = 0,
  skillCooldown = 0,
  lastFrame = 0,
  elapsed = 0,
  saveClock = 0,
  lastHud = 0;
const keys = new Set(),
  touchMove = { x: 0, y: 0 },
  sound = new Soundscape(),
  bolts = [],
  effects = [],
  floating = [];
let walkPath = [],
  targetEnemy = null,
  companion = null;
const particleGeometry = new THREE.BoxGeometry(0.09, 0.09, 0.09),
  materials = new Map();
function effectMaterial(color) {
  if (!materials.has(color))
    materials.set(color, new THREE.MeshBasicMaterial({ color }));
  return materials.get(color);
}
const destinationMarker = new THREE.Mesh(
  new THREE.RingGeometry(0.25, 0.34, 12),
  new THREE.MeshBasicMaterial({ color: "#e8d7a3", side: THREE.DoubleSide }),
);
destinationMarker.rotation.x = -Math.PI / 2;
destinationMarker.visible = false;
world.scene.add(destinationMarker);
const labels = POINTS.filter(
  (p) => !["herb", "rest", "chest", "cache"].includes(p.kind),
).map((p) => {
  const el = document.createElement("div");
  el.className = `npc-label point-label ${p.kind}`;
  el.innerHTML = `<b>${p.symbol ?? (p.kind === "encounter" ? "缘" : "◇")}</b><span>${p.name}</span>${p.kind === "school" ? `<small>${p.master} · ${p.role}</small>` : ""}`;
  $("game-shell").append(el);
  return { ...p, el };
});
const enemies = ENEMIES.map((c) => {
  const mesh = c.boss ? createGuardian() : createSlime();
  mesh.position.set(c.x, 0, c.z);
  world.scene.add(mesh);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(c.boss ? 3.15 : 1.3, c.boss ? 3.35 : 1.5, 32),
    new THREE.MeshBasicMaterial({
      color: "#e3694d",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  world.scene.add(ring);
  return {
    ...c,
    mesh,
    ring,
    hp: c.boss ? 360 : 75,
    maxHp: c.boss ? 360 : 75,
    alive: !c.boss,
    cooldown: 1,
    windup: 0,
    root: 0,
    phase: c.x * 0.7,
  };
});
try {
  saved = Adventure.restore(localStorage.getItem(SAVE_KEY));
  if (localStorage.getItem(LEGACY_SAVE_KEY))
    $("legacy-note").classList.remove("hidden");
} catch {}
if (saved) $("continue-button").classList.remove("hidden");
function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  $("toasts").append(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 400);
  }, 3200);
}
function blocked() {
  return modalOpen || dead;
}
function save(manual = false) {
  if (!playing) return;
  adventure.position = { x: world.hero.position.x, z: world.hero.position.z };
  try {
    localStorage.setItem(SAVE_KEY, adventure.serialize());
    $("save-label").textContent = "修仙历程已保存";
    if (manual) toast("修仙历程已保存。");
  } catch {
    $("save-label").textContent = "浏览器存储不可用";
  }
}
function clearCombat() {
  for (const b of bolts) world.scene.remove(b.mesh);
  bolts.length = 0;
  if (companion) world.scene.remove(companion.mesh);
  companion = null;
  attackTimer = attackCooldown = dodgeTimer = dodgeCooldown = skillCooldown = 0;
  invincible = 1;
  stamina = 100;
}
function syncWorld(reset = false) {
  for (const e of enemies) {
    const alive = e.boss
      ? adventure.bossAwake && !adventure.choices.resolution
      : adventure.defeatCycles[e.id] !== adventure.cycle;
    if (reset || e.alive !== alive) {
      e.mesh.position.set(e.x, 0, e.z);
      e.hp = e.maxHp;
      e.cooldown = 1;
      e.windup = e.root = 0;
    }
    e.alive = Boolean(alive);
    e.mesh.visible = e.alive;
    if (!e.alive) e.ring.visible = false;
  }
  for (const h of HERBS)
    world.markers.get(h.id).visible = !adventure.harvested.includes(h.id);
  world.crystal.visible = !adventure.complete;
  world.chestLid.position.y = adventure.openedChest ? 1.04 : 0.76;
  world.chestLid.rotation.x = adventure.openedChest ? -0.5 : 0;
  world.hero.userData.robe.forEach((m) =>
    m.material.color.set(SCHOOL_BY_ID[adventure.sect]?.color ?? "#5b8278"),
  );
}
function start(continueSaved = false) {
  closeModal();
  cancelWalk();
  clearCombat();
  keys.clear();
  adventure = continueSaved && saved ? saved : new Adventure();
  playing = true;
  dead = false;
  $("game-shell").classList.add("playing");
  $("intro").classList.add("hidden");
  document
    .querySelectorAll(".in-game")
    .forEach((el) => el.classList.remove("hidden"));
  const p = world.canWalk(adventure.position.x, adventure.position.z)
    ? adventure.position
    : SPAWN;
  world.hero.position.set(p.x, 0, p.z);
  world.hero.rotation.y = Math.PI;
  syncWorld(true);
  updateHud();
  save();
  $("world").focus({ preventScroll: true });
  toast(
    continueSaved
      ? `欢迎回来，${adventure.path}道友。`
      : "灵井异变，仙途初启。先去找村中的岑照。",
  );
}
function updateHud() {
  $("level-badge").textContent = adventure.level || "凡";
  $("level-text").textContent = adventure.realm;
  $("path-name").textContent = adventure.path;
  $("health-fill").style.width = `${(adventure.hp / adventure.maxHp) * 100}%`;
  $("health-text").textContent = `${adventure.hp} / ${adventure.maxHp}`;
  $("mana-fill").style.width = `${(adventure.mana / adventure.maxMana) * 100}%`;
  $("mana-text").textContent =
    `${Math.floor(adventure.mana)} / ${adventure.maxMana}`;
  $("stamina-fill").style.width = `${stamina}%`;
  $("xp-text").textContent =
    adventure.level >= 3
      ? `${adventure.qi} 修为 · 待问筑基`
      : `${adventure.qi} / ${adventure.nextXp} 修为`;
  $("potion-count").textContent = adventure.potions;
  $("coin-count").textContent = adventure.coins;
  $("resource-count").textContent =
    `灵草 ${adventure.herbs} · 兽粮 ${adventure.food}`;
  $("skill-name").textContent =
    SCHOOL_BY_ID[adventure.equipped]?.art ?? "待习功法";
  $("skill-cooldown").textContent =
    skillCooldown > 0 ? Math.ceil(skillCooldown) : "";
  const q = questInfo(adventure);
  for (const k of ["title", "description", "objective", "count"])
    $(`quest-${k}`).textContent = q[k];
  $("quest-reward").textContent = adventure.complete
    ? "首章已完成 · 前路由你选择"
    : "自由问道 · 五门派与散修";
  const p = world.hero.position,
    region =
      p.x > 11 && p.z < -10
        ? "荒脉遗迹"
        : p.x < -11
          ? "西岸寻仙"
          : p.x > 7
            ? "云岫山道"
            : "青禾村";
  $("region-name").textContent = region;
  $("region-detail").textContent = "云岫山境 · 灵井异变";
  $("map-location").textContent = region;
  drawMap($("minimap"));
  const boss = enemies.find((e) => e.boss);
  $("boss-hud").classList.toggle("hidden", !boss.alive || !playing);
  $("boss-health").style.width =
    `${(Math.max(0, boss.hp) / boss.maxHp) * 100}%`;
  $("boss-text").textContent = `${Math.max(0, boss.hp)} / ${boss.maxHp}`;
}
function drawMap(canvas, large = false) {
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height,
    size = Math.min(w, h) - 18,
    scale = size / MAP_SIZE,
    ox = (w - size) / 2,
    oz = (h - size) / 2,
    point = (x, z) => [ox + (x + 32) * scale, oz + (z + 32) * scale];
  ctx.fillStyle = "#263e35";
  ctx.fillRect(0, 0, w, h);
  for (let x = -32; x < 32; x++)
    for (let z = -32; z < 32; z++) {
      ctx.fillStyle = isRiver(x, z)
        ? "#7ba79d"
        : isPath(x, z)
          ? "#b1a680"
          : (x * 13 + z * 7) % 5 === 0
            ? "#52704f"
            : "#415d49";
      const [px, py] = point(x, z);
      ctx.fillRect(px, py, scale + 0.3, scale + 0.3);
    }
  for (const p of POINTS.filter((p) => p.kind !== "herb")) {
    const [px, py] = point(p.x, p.z);
    ctx.fillStyle = p.color ?? (p.kind === "encounter" ? "#e1bd72" : "#d3dfb5");
    ctx.fillRect(px - 2, py - 2, 4, 4);
    if (large) {
      ctx.font = p.kind === "school" ? "11px KaiTi" : "9px KaiTi";
      ctx.textAlign = "center";
      ctx.fillText(p.short ?? p.name.split(" · ")[0], px, py - 5);
    }
  }
  for (const e of enemies.filter((e) => e.alive)) {
    const [px, py] = point(e.mesh.position.x, e.mesh.position.z);
    ctx.fillStyle = "#c87961";
    ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
  }
  const [px, py] = point(world.hero.position.x, world.hero.position.z);
  ctx.fillStyle = "#fff1c5";
  ctx.beginPath();
  ctx.arc(px, py, large ? 4 : 3, 0, Math.PI * 2);
  ctx.fill();
}
function cancelWalk() {
  walkPath = [];
  targetEnemy = null;
  destinationMarker.visible = false;
}
function navigateTo(goal, enemy = null) {
  walkPath = findPath(world.hero.position, goal, (x, z) => world.canWalk(x, z));
  targetEnemy = enemy;
  if (!walkPath.length) {
    targetEnemy = null;
    toast("这条路暂时走不通，试试旁边的小径。");
    return;
  }
  destinationMarker.position.set(walkPath.at(-1).x, 0.1, walkPath.at(-1).z);
  destinationMarker.visible = true;
}
function openModal(title, content, eyebrow = "仙途手札") {
  cancelWalk();
  keys.clear();
  modalOpen = true;
  $("modal-title").textContent = title;
  $("modal-eyebrow").textContent = eyebrow;
  $("modal-content").innerHTML = content;
  $("modal-close").classList.toggle("hidden", dead);
  $("modal-shade").classList.remove("hidden");
  paintIcons($("modal"));
  $("modal-content")
    .querySelector("button:not(:disabled),select")
    ?.focus({ preventScroll: true });
}
function closeModal() {
  if (dead) return;
  modalOpen = false;
  $("modal-shade").classList.add("hidden");
  if (playing) $("world").focus({ preventScroll: true });
}
function choices(title, text, options, eyebrow = "缘起 · 由你抉择") {
  openModal(
    title,
    `<p class="story-text">${text}</p><div class="choice-list">${options.map((o, i) => `<button class="choice-card" data-choice="${i}" ${o.disabled ? "disabled" : ""}><span>${String(i + 1).padStart(2, "0")}</span><div><b>${o.label}</b>${o.detail ? `<small>${o.detail}</small>` : ""}</div><i>→</i></button>`).join("")}</div>`,
    eyebrow,
  );
  $("modal-content")
    .querySelectorAll("[data-choice]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const o = options[Number(b.dataset.choice)];
          closeModal();
          o.run?.();
          syncWorld();
          updateHud();
          save();
        }),
    );
}
function result(message) {
  toast(message);
  syncWorld();
  updateHud();
  save();
}
function findInteraction() {
  if (!playing || blocked()) return null;
  const p = world.hero.position;
  return (
    POINTS.filter(
      (v) => v.kind !== "herb" || !adventure.harvested.includes(v.id),
    )
      .map((v) => ({ ...v, distance: Math.hypot(v.x - p.x, v.z - p.z) }))
      .filter((v) => v.distance < 2.25)
      .sort((a, b) => a.distance - b.distance)[0] ?? null
  );
}
function interact() {
  const p = findInteraction();
  if (!p) {
    toast("靠近村民、门派营地、灵草或遗迹后按 E 互动。");
    return;
  }
  switch (p.kind) {
    case "mentor":
      if (!adventure.level)
        choices(
          "岑照 · 引气入门",
          "灵井不该逆流。五宗各有打算，我却更在意村民明天喝什么水。这部引气诀送你：谨慎行事，或大胆走出去，都得由你自己决定。",
          [
            {
              label: "学会引气，走出村庄",
              detail: "进入炼气一层 · 获得 20 修为",
              run: () => {
                adventure.begin();
                burst(world.hero.position, "#bde2c6", 24);
                result("引气入体 · 炼气一层。东边的采药人似乎知道些什么。");
              },
            },
          ],
        );
      else
        choices(
          "岑照 · 青禾村",
          adventure.complete
            ? "灵井平息了，而你的选择还会继续产生回响。今后如何走，仍由你决定。"
            : "先到东边看看采药人，再去拜访门派。缺修为就炼养气丹，缺灵石就交委托。西岸道人不问出身，也是条路。",
          [
            { label: "查看修炼与突破", run: showCultivation },
            {
              label: "前往受伤采药人",
              run: () => navigateTo(POINTS.find((p) => p.kind === "origin")),
            },
            { label: "查看各门派", run: showSects },
          ],
        );
      break;
    case "origin":
      if (!adventure.level) {
        toast("先回村找岑照学会引气。");
        break;
      }
      if (adventure.choices.origin)
        choices(
          "采药人 · 吴禾",
          adventure.choices.origin === "rescue"
            ? "你那天留下替我包扎，我记着。给你的丹方能让回春丹多恢复一些气血。"
            : "你选择先去看遗迹，我能理解。石上的旧阵纹，恐怕比口头保证更可靠。",
          [
            {
              label: "查看遗迹位置",
              run: () => navigateTo(POINTS.find((p) => p.kind === "shrine")),
            },
          ],
        );
      else
        choices(
          "先顾眼前，还是先探远处？",
          "采药人坐在路边，脚踝还在流血。他说遗迹曾有人影闪过。你可以留下照料，也可以趁线索还新鲜，先去探查。",
          [
            {
              label: "留下救助采药人",
              detail: "回春丹恢复量提高至 60 · 丹药 +1 · 灵草 +2 · 修为 +15",
              run: () => {
                adventure.chooseOrigin("rescue");
                result("你学会了改良丹方。吴禾提到：丹霞谷正在招募药师。");
              },
            },
            {
              label: "抢先探查遗迹",
              detail: "灵石 +15 · 修为 +25 · 得知阵纹可修复封印",
              run: () => {
                adventure.chooseOrigin("explore");
                result("吴禾指向遗迹：地、木、天三处阵纹，可能是另一种解法。");
              },
            },
          ],
        );
      break;
    case "school":
      showSchool(p.school);
      break;
    case "herb":
      if (adventure.harvest(p.id)) {
        burst(new THREE.Vector3(p.x, 0.5, p.z), "#b7d2a3", 8);
        result("采得灵草 ×2 · 修为 +5");
      }
      break;
    case "rest": {
      const refreshed = adventure.rest();
      clearCombat();
      syncWorld(true);
      result(
        refreshed
          ? "调息完毕。山道妖物与灵草已刷新，可再次历练。"
          : `生命与灵力已恢复；资源刷新还需 ${Math.ceil(adventure.nextRefresh - adventure.playTime)} 秒游玩时间。`,
      );
      break;
    }
    case "furnace":
      showFurnace();
      break;
    case "chest":
      result(
        adventure.openChest()
          ? "补给匣：灵石 +20 · 回春丹 +2"
          : "补给匣已取过。",
      );
      break;
    case "fox":
      result(
        adventure.foxFed
          ? "灵狐已经恢复，万灵山的叶弥会认可这段缘分。"
          : adventure.feedFox()
            ? "灵狐接受了兽粮。万灵山历练条件已完成。"
            : "灵狐需要两份兽粮，击败山道妖物可获得。",
      );
      break;
    case "cache":
      if (
        enemies.some(
          (e) =>
            e.alive &&
            !e.boss &&
            Math.hypot(e.mesh.position.x - p.x, e.mesh.position.z - p.z) < 3.5,
        )
      )
        toast("巡逻者就在附近。绕开它，或正面击败它再取密匣。");
      else
        result(
          adventure.takeCache()
            ? "取得密匣 · 灵石 +15 · 修为 +20。可以拜访归影阁。"
            : "密匣已取走。",
        );
      break;
    case "clue":
      adventure.readClue(p.id);
      choices(
        p.name,
        `石刻浮现：地承其形，木生其息，天定其序。<br>已找到阵纹 ${adventure.clues.length} / 3。玄衍门次序：${adventure.sigils.map((id) => CLUES.find((c) => c.id === id).symbol).join(" → ") || "尚未对齐"}。<br>三处阵纹齐备后，可以在遗迹修复封印。`,
        [{ label: "记下阵纹，继续探索" }],
        "古阵 · 留痕",
      );
      break;
    case "encounter":
      showEncounter(p.id);
      break;
    case "shrine":
      showShrine();
      break;
  }
}
function showSchool(id) {
  const s = SCHOOL_BY_ID[id],
    done = adventure.trials.includes(id),
    options = [];
  if (!done)
    options.push({
      label: adventure.trialReady(id) ? "交付入门历练" : "历练尚未完成",
      detail: `${s.trial} 完成后 +15 灵石、+30 修为。`,
      disabled: !adventure.trialReady(id),
      run: () => {
        if (adventure.finishTrial(id))
          result(`${s.name}历练通过，可以入门，也可以先去看看别处。`);
        showSchool(id);
      },
    });
  else if (adventure.sect !== id)
    options.push({
      label: id === "wander" ? "选择散修道路" : `拜入${s.name}`,
      detail: adventure.sect
        ? "先在修炼界面离开当前道路。"
        : adventure.reputation[id] < 0
          ? "完成两次委托，可修复旧日离宗的影响。"
          : `学会${s.art} · 声望 ${adventure.reputation[id]}`,
      disabled: Boolean(adventure.sect) || adventure.reputation[id] < 0,
      run: () => {
        if (adventure.joinSect(id))
          result(`你选择了${s.name}，已学会${s.art}。按 K 施展，按 C 修炼。`);
      },
    });
  else
    options.push({
      label: "查看本门功法与修炼",
      detail: `声望 ${adventure.reputation[id]} · ${s.art}`,
      run: showCultivation,
    });
  options.push({
    label: "交付三份灵草",
    detail: "+10 灵石 · +30 修为 · 本门声望 +10，可重复",
    disabled: !adventure.level || adventure.herbs < 3,
    run: () => {
      adventure.commission(id, "herbs");
      result("草药委托完成。");
      showSchool(id);
    },
  });
  options.push({
    label: "交付三次除妖记录",
    detail: `${adventure.bountyKills} / 3 · +20 灵石 · +45 修为 · 本门声望 +10`,
    disabled: !adventure.level || adventure.bountyKills < 3,
    run: () => {
      adventure.commission(id, "hunt");
      result("除妖悬赏完成。");
      showSchool(id);
    },
  });
  choices(
    `${s.master} · ${s.name}`,
    `${s.description}<br><strong>本门功法：${s.art}</strong> · ${s.skill.cost} 灵力 · ${s.skill.cooldown} 秒冷却。<br>入门历练：${s.trial}`,
    options,
    `${s.symbol} · ${s.role}`,
  );
}
function showSects() {
  if (!playing) return;
  openModal(
    "天下问道，各有归途",
    `<p>目前道路：<strong>${adventure.path}</strong>。亲自前往营地完成历练，或找西岸道人选择散修。</p><div class="sect-grid">${SCHOOLS.map((s) => `<button class="sect-card" data-sect="${s.id}" style="--sect-color:${s.color}"><span class="sect-seal">${s.symbol}</span><h3>${s.name}</h3><small>${s.role}</small><p>${s.trial}</p><b>${adventure.sect === s.id ? "当前道路" : adventure.trials.includes(s.id) ? "历练已通过" : "前往拜访 ↗"}</b></button>`).join("")}</div><p>转道保留已学功法和经历，可在修炼界面离开当前道路。</p>`,
    "五宗 · 一介散修",
  );
  $("modal-content")
    .querySelectorAll("[data-sect]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          closeModal();
          navigateTo(SCHOOL_BY_ID[b.dataset.sect]);
        }),
    );
}
function showCultivation() {
  if (!playing) return;
  const fee = adventure.level === 1 ? 20 : 30,
    ready =
      adventure.level > 0 &&
      adventure.level < 3 &&
      adventure.qi >= adventure.nextXp &&
      adventure.coins >= fee;
  openModal(
    "修炼 · 一息一境",
    `<div class="cultivation-head"><span class="realm-seal">${adventure.level ? "气" : "凡"}</span><div><h3>${adventure.realm}</h3><p>${adventure.path} · 灵石 ${adventure.coins}</p></div></div><div class="cultivation-progress"><span style="width:${Math.min(100, (adventure.qi / adventure.nextXp) * 100)}%"></span></div><p>${!adventure.level ? "先与岑照交谈，学会引气。" : adventure.level >= 3 ? `已达首章境界上限，积存 ${adventure.qi} 修为。筑基将在后续章节开放。` : `突破需要 ${adventure.nextXp} 修为与 ${fee} 灵石。当前修为 ${adventure.qi}。突破恢复全部生命与灵力。`}</p><button class="primary-button" id="breakthrough" ${ready ? "" : "disabled"}>${adventure.level >= 3 ? "筑基 · 后续章节" : "静心突破"}<span>→</span></button><h3 class="section-label">已学功法 · K 施展</h3><div class="art-list">${adventure.learned.length ? adventure.learned.map((id) => `<button data-art="${id}" class="art-row ${adventure.equipped === id ? "selected" : ""}"><span>${SCHOOL_BY_ID[id].symbol}</span><div><b>${SCHOOL_BY_ID[id].art}</b><small>消耗 ${adventure.skillCost(id)} 灵力 · ${SCHOOL_BY_ID[id].skill.cooldown} 秒冷却${id !== adventure.sect ? " · 异门兼修 +25% 消耗" : ""}</small></div><i>${adventure.equipped === id ? "已装备" : "装备"}</i></button>`).join("") : "<p>拜师或成为散修后，将获得第一项功法。</p>"}</div>${adventure.sect ? '<button class="text-button" id="leave-sect">离开当前道路，另寻机缘 ↗</button><p class="small-note">原道路声望降低 20，已学功法与经历保留。原营地的委托可恢复声望。</p>' : ""}`,
    "凡人 · 炼气 · 筑基",
  );
  $("breakthrough").onclick = () => {
    if (adventure.breakthrough()) {
      closeModal();
      burst(world.hero.position, "#e5d796", 36);
      sound.play("quest");
      result(`突破成功 · ${adventure.realm}`);
    }
  };
  $("modal-content")
    .querySelectorAll("[data-art]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          adventure.equip(b.dataset.art);
          save();
          updateHud();
          showCultivation();
        }),
    );
  if ($("leave-sect"))
    $("leave-sect").onclick = () =>
      choices(
        "另寻前路",
        `离开${adventure.path}将降低原道路声望 20，保留修为、功法与经历。`,
        [
          {
            label: "离开，另寻机缘",
            run: () => {
              adventure.leaveSect();
              result("旧路仍在身后。按 N 寻找新的门派与机缘。");
            },
          },
          { label: "暂且留下", run: showCultivation },
        ],
      );
}
function showFurnace() {
  choices(
    "青禾丹炉",
    `炉火缓缓升起。背包中有 ${adventure.herbs} 份灵草。`,
    [
      {
        label: "炼制回春丹",
        detail: "消耗灵草 ×2 · 获得回春丹 ×1",
        disabled: !adventure.level || adventure.herbs < 2,
        run: () => {
          adventure.brew("heal");
          result("回春丹炼成，可用 Q 服下。");
          showFurnace();
        },
      },
      {
        label: "炼制并服用养气丹",
        detail: "消耗灵草 ×3 · 修为 +35",
        disabled: !adventure.level || adventure.herbs < 3,
        run: () => {
          adventure.brew("qi");
          result("服下养气丹 · 修为 +35。按 C 主动突破。");
          showFurnace();
        },
      },
    ],
    "丹火 · 一炉烟霞",
  );
}
function showEncounter(id) {
  const e = adventure.encounter(id),
    chosen = adventure.encounterResults[id];
  if (chosen !== undefined) {
    choices(
      e.title,
      `这段机缘已留下结果：${e.options[chosen].consequence}`,
      [{ label: "继续前行" }],
      "已记入仙途手札",
    );
    return;
  }
  choices(
    e.title,
    e.text,
    e.options.map((o, index) => ({
      label: o.label,
      detail: o.consequence,
      disabled: !adventure.canChooseEncounter(id, index),
      run: () => {
        if (adventure.chooseEncounter(id, index)) result(o.consequence);
      },
    })),
    "山野机缘 · 此局独有",
  );
}
const endingTexts = {
  report:
    "残卷交到引路人手中，你在当前道路上赢得更多信任。五宗的调查即将公开，而你将面对同门对真相的不同判断。",
  keep: "你将残卷留在自己手中，领悟照尘诀，灵力上限增加 20。卷中一道陌生印记，或许会引你走向五宗之外的传承。",
  neutral:
    "你把残卷交给中立的岑照，请他公开调查。三份灵草与三十枚灵石是谢礼；关于失踪药师的消息，成为下一段旅程的线索。",
};
function showShrine() {
  if (adventure.complete) {
    showVictory();
    return;
  }
  if (
    !adventure.level ||
    !adventure.choices.origin ||
    !adventure.sect ||
    adventure.level < 3
  ) {
    choices(
      "荒脉遗迹",
      "玉石中的灵气仍在逆流。先学会引气、作出启程选择并确定修仙道路。炼气三层后，才有能力处理危机。<br>收集地、木、天阵纹，可以不用正面击败守卫。",
      [
        { label: "查看修炼", run: showCultivation },
        { label: "查看门派", run: showSects },
      ],
    );
    return;
  }
  if (adventure.choices.resolution) {
    choices(
      "残卷的去向",
      `你${adventure.choices.resolution === "seal" ? "修复了封印" : "击败了守卫"}。玉石下藏着半卷旧书，灵井异变是有人所为，而非天灾。`,
      [
        {
          label:
            adventure.sect === "wander"
              ? "交给散修引路人"
              : `交给${adventure.path}`,
          detail: "+40 灵石 · 当前道路声望 +20",
          run: () => {
            adventure.finish("report");
            showVictory();
          },
        },
        {
          label: "自己保留，继续调查",
          detail: "领悟照尘诀 · 灵力上限 +20 · 修为 +40",
          run: () => {
            adventure.finish("keep");
            showVictory();
          },
        },
        {
          label: "交给岑照，公开线索",
          detail: "+30 灵石 · 灵草 +3 · 失踪药师线索",
          run: () => {
            adventure.finish("neutral");
            showVictory();
          },
        },
      ],
      "一卷三途 · 未来由此展开",
    );
    return;
  }
  choices(
    "荒脉之下",
    `石柱间传来低沉回响。可以唤醒守卫正面挑战，也可以依据阵纹修复封印。已找到阵纹 ${adventure.clues.length} / 3。`,
    [
      {
        label: adventure.bossAwake ? "继续迎战守卫" : "唤醒荒脉守卫",
        detail: "留意地面红圈，及时闪避",
        run: () => {
          adventure.awakenBoss();
          syncWorld();
          navigateTo(ENEMIES.find((e) => e.boss));
          result("守卫苏醒。红圈表示即将发动范围攻击，空格可以闪避。");
        },
      },
      {
        label: "依照阵纹修复封印",
        detail: "需要地、木、天三处阵纹 · 同样获得主线奖励",
        disabled: adventure.clues.length < 3,
        run: () => {
          if (adventure.seal()) {
            burst(world.hero.position, "#b4ddc5", 32);
            result("封印重新运转。再与遗迹互动，决定残卷去向。");
          }
        },
      },
    ],
    "强攻或调查 · 都是你的路",
  );
}
function endingNarrative() {
  return (
    endingTexts[adventure.choices.ending] +
    (adventure.choices.ending === "report"
      ? "<br><br>" + PATH_EPILOGUES[adventure.endingPath]
      : "")
  );
}
function showVictory() {
  choices(
    "第一章 · 灵井异变",
    `<div class="victory-mark">道</div><strong>${SCHOOL_BY_ID[adventure.endingPath]?.name ?? adventure.path} · ${adventure.realm}</strong><br>${endingNarrative()}<br><br>你的启程：${adventure.choices.origin === "rescue" ? "救助采药人" : "抢先探查遗迹"}。你的解法：${adventure.choices.resolution === "seal" ? "调查阵纹，修复封印" : "正面迎战，击败守卫"}。`,
    [
      {
        label: "继续探索与转道",
        detail: "首章已完成，筑基和下一章将在后续版本开放。",
      },
      { label: "查看仙途手札", run: showJournal },
    ],
    "首章完成 · 前路未定",
  );
}
function showInventory() {
  if (!playing) return;
  choices(
    "行囊 · 随身之物",
    `<div class="inventory-grid">${[
      ["sword", "青禾短剑", `伤害 ${adventure.damage}`],
      ["potion", "回春丹", `× ${adventure.potions}`],
      ["leaf", "灵草", `× ${adventure.herbs}`],
      ["bag", "兽粮", `× ${adventure.food}`],
      ["coin", "灵石", `× ${adventure.coins}`],
      ["crystal", "古阵线索", `${adventure.clues.length} / 3`],
    ]
      .map(
        ([i, n, c]) =>
          `<div class="inventory-item"><span data-icon="${i}"></span><span>${n}</span><b>${c}</b></div>`,
      )
      .join("")}</div>`,
    [
      {
        label: "服用回春丹",
        detail: `恢复 ${adventure.choices.origin === "rescue" ? 60 : 50} 生命`,
        disabled: adventure.potions < 1 || adventure.hp >= adventure.maxHp,
        run: drink,
      },
      {
        label: "前往村中丹炉",
        run: () => navigateTo(POINTS.find((p) => p.kind === "furnace")),
      },
    ],
    "一草一石 · 皆是机缘",
  );
}
function showMap() {
  if (!playing) return;
  const destinations = POINTS;
  openModal(
    "云岫山境 · 山河图",
    `<canvas class="map-large" id="large-map" width="480" height="400" aria-label="云岫山境地图"></canvas><div class="map-destinations">${destinations.map((p) => `<button data-place="${p.id}">${p.short ?? p.name.split(" · ")[0]} ↗</button>`).join("")}</div><p>点击地名或地图自动寻路。西岸需经村南木桥；金色石碑是机缘，青玉石碑记录阵纹。</p>`,
    "山河有路 · 各自问道",
  );
  const map = $("large-map");
  drawMap(map, true);
  $("modal-content")
    .querySelectorAll("[data-place]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          closeModal();
          navigateTo(POINTS.find((p) => p.id === b.dataset.place));
        }),
    );
  map.onclick = (e) => {
    const r = map.getBoundingClientRect(),
      px = ((e.clientX - r.left) * map.width) / r.width,
      pz = ((e.clientY - r.top) * map.height) / r.height,
      size = Math.min(map.width, map.height) - 18,
      scale = size / MAP_SIZE;
    closeModal();
    navigateTo({
      x: (px - (map.width - size) / 2) / scale - 32,
      z: (pz - (map.height - size) / 2) / scale - 32,
    });
  };
}
function showJournal() {
  if (!playing) return;
  const q = questInfo(adventure),
    history = adventure.history.map(
      (h) =>
        `${h.type === "join" ? "踏入" : "离开"}${SCHOOL_BY_ID[h.sect].name}`,
    );
  openModal(
    "仙途手札 · 灵井异变",
    `<div class="journal-current"><small>当前主线</small><h3>${q.title}</h3><p>${q.description}</p></div><div class="journal-entry"><b>启程选择</b><p>${adventure.choices.origin ? (adventure.choices.origin === "rescue" ? "救助采药人，习得改良回春丹方。" : "抢先探索，得知阵纹修复封印的线索。") : "尚未作出选择。"}</p></div><div class="journal-entry"><b>道路经历</b><p>${history.join(" → ") || "一介凡人，前路仍待选择。"}</p></div><div class="journal-entry"><b>古阵与遗迹</b><p>阵纹 ${adventure.clues.length} / 3 · ${adventure.choices.resolution === "seal" ? "封印已修复" : adventure.choices.resolution === "battle" ? "守卫已击败" : "逆流尚未平息"}</p></div>${Object.entries(
      adventure.encounterResults,
    )
      .map(
        ([id, index]) =>
          `<div class="journal-entry"><b>机缘 · ${adventure.encounter(id).title}</b><p>${adventure.encounter(id).options[index].label}：${adventure.encounter(id).options[index].consequence}</p></div>`,
      )
      .join(
        "",
      )}${adventure.complete ? `<div class="journal-entry"><b>残卷去向</b><p>${endingNarrative()}</p></div>` : ""}`,
    "一念起 · 万途生",
  );
}
function showHelp() {
  openModal(
    "操作 · 仙途入门",
    `<div class="help-grid">${[
      ["移动", "WASD / 方向键"],
      ["普通攻击", "J / 右键"],
      ["当前功法", "K"],
      ["闪避", "空格 / Shift"],
      ["附近互动", "E / Enter"],
      ["服用回春丹", "Q"],
      ["行囊 / 地图", "I / M"],
      ["修炼 / 门派", "C / N"],
      ["关闭 / 暂停", "Esc"],
    ]
      .map(([a, b]) => `<span>${a}</span><kbd>${b}</kbd>`)
      .join(
        "",
      )}</div><p>左键点地寻路，点击敌人自动接近并攻击。窗口内用 Tab 选择、Enter 确认。先找岑照引气，再与东边采药人交谈，之后选择自己的道路。</p><p>灵草可在村中丹炉炼丹。修为和灵石足够后按 C 主动突破。青禾驿可恢复生命和灵力，每 30 秒游玩时间可刷新历练资源。</p>`,
    "凡人也能开始的仙途",
  );
}
function showSettings() {
  openModal(
    "山间小憩",
    `<div class="setting-row"><span>像素画面</span><select id="quality-select" aria-label="像素画面"><option value="1">细腻像素</option><option value="2">经典像素</option><option value="3">复古像素</option></select></div><div class="setting-row"><span>山间声音</span><button id="settings-sound">${sound.enabled ? "已开启" : "已关闭"}</button></div>${playing ? '<div class="setting-row"><span>保存此刻</span><button id="manual-save">保存历程</button></div><div class="setting-row"><span>暂别山境</span><button id="return-title">返回标题</button></div>' : ""}<p>窗口打开时暂停战斗与资源计时。存档保存在当前浏览器与地址中。</p>`,
    "一息之间 · 歇脚再行",
  );
  $("quality-select").value = String(world.pixelScale);
  $("quality-select").onchange = (e) =>
    world.setQuality(Number(e.target.value));
  $("settings-sound").onclick = async () => {
    await toggleSound();
    $("settings-sound").textContent = sound.enabled ? "已开启" : "已关闭";
  };
  if (playing) {
    $("manual-save").onclick = () => save(true);
    $("return-title").onclick = () => {
      save();
      saved = Adventure.restore(adventure.serialize());
      closeModal();
      cancelWalk();
      clearCombat();
      playing = false;
      $("game-shell").classList.remove("playing");
      document
        .querySelectorAll(".in-game")
        .forEach((el) => el.classList.add("hidden"));
      $("intro").classList.remove("hidden");
      $("continue-button").classList.remove("hidden");
      $("interaction-prompt").classList.add("hidden");
      $("boss-hud").classList.add("hidden");
    };
  }
}
async function toggleSound() {
  try {
    const enabled = await sound.toggle();
    $("audio-button").innerHTML = icon(enabled ? "sound" : "mute");
    $("audio-button").setAttribute(
      "aria-label",
      enabled ? "关闭声音" : "开启声音",
    );
  } catch {
    toast("当前浏览器无法播放声音。");
  }
}
function floatText(text, position, kind = "") {
  const el = document.createElement("div");
  el.className = `float-text ${kind}`;
  el.textContent = text;
  $("floating-labels").append(el);
  floating.push({
    el,
    position: position.clone().add(new THREE.Vector3(0, 1.8, 0)),
    life: 1,
  });
}
function burst(pos, color = "#d8c58b", count = 12) {
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(particleGeometry, effectMaterial(color));
    mesh.position.copy(pos).add(new THREE.Vector3(0, 0.7, 0));
    world.scene.add(mesh);
    effects.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 3,
      ),
      life: 0.65,
    });
  }
}
function damageEnemy(e, amount, root = 0) {
  if (!e.alive) return;
  e.hp -= amount;
  e.root = Math.max(e.root, root);
  if (!e.boss || root > 0) {
    e.windup = 0;
    e.ring.visible = false;
    e.cooldown = Math.max(e.cooldown, 0.35);
  }
  floatText(String(amount), e.mesh.position);
  burst(e.mesh.position, e.boss ? "#b8d6c6" : "#acbc8a", 6);
  if (e.hp <= 0) {
    e.alive = false;
    e.mesh.visible = false;
    e.ring.visible = false;
    const reward = adventure.defeat(e.id);
    if (reward) {
      toast(
        `${e.name}消散 · +${reward.coins} 灵石 · +${reward.qi} 修为${e.boss ? " · 逆流已平息" : " · 兽粮 +1"}`,
      );
      sound.play("pickup");
      save();
    }
    if (e.boss) toast("守卫沉睡。回到遗迹玉石前，决定残卷去向。");
  }
}
function nearestEnemy(range) {
  return enemies
    .filter(
      (e) => e.alive && e.mesh.position.distanceTo(world.hero.position) < range,
    )
    .sort(
      (a, b) =>
        a.mesh.position.distanceToSquared(world.hero.position) -
        b.mesh.position.distanceToSquared(world.hero.position),
    )[0];
}
function attack() {
  if (!playing || blocked() || attackCooldown > 0 || dodgeTimer > 0) return;
  attackTimer = 0.27;
  attackCooldown = 0.4;
  sound.play("attack");
  const near = nearestEnemy(2.8);
  if (near) {
    const d = near.mesh.position.clone().sub(world.hero.position);
    world.hero.rotation.y = Math.atan2(d.x, d.z);
  }
  const forward = new THREE.Vector3(
    Math.sin(world.hero.rotation.y),
    0,
    Math.cos(world.hero.rotation.y),
  );
  for (const e of enemies) {
    const d = e.mesh.position.clone().sub(world.hero.position);
    if (
      e.alive &&
      d.length() < (e.boss ? 2.8 : 2.1) &&
      forward.dot(d.normalize()) > 0.1
    )
      damageEnemy(e, adventure.damage);
  }
}
function dodge() {
  if (
    !playing ||
    blocked() ||
    dodgeCooldown > 0 ||
    stamina < 25 ||
    attackTimer > 0
  )
    return;
  dodgeTimer = 0.26;
  dodgeCooldown = 0.75;
  invincible = 0.42;
  stamina -= 25;
  burst(world.hero.position, "#bad6ca", 6);
}
function drink() {
  if (!playing || blocked()) return;
  const before = adventure.hp;
  if (adventure.drink()) {
    floatText(`+${adventure.hp - before}`, world.hero.position, "heal");
    burst(world.hero.position, "#c7dfab", 15);
    sound.play("heal");
    result("回春丹化开，气血恢复。");
  } else
    toast(
      adventure.potions < 1
        ? "没有回春丹，采集灵草回丹炉炼制。"
        : "气血已满，无需服丹。",
    );
}
function cast() {
  if (!playing || blocked() || dodgeTimer > 0) return;
  if (!adventure.equipped) {
    toast("还没有功法。完成门派历练或成为散修后可学习。");
    return;
  }
  if (skillCooldown > 0) {
    toast(`功法还需调息 ${Math.ceil(skillCooldown)} 秒。`);
    return;
  }
  if (!adventure.spendMana()) {
    toast("灵力不足，稍作等待或回青禾驿调息。");
    return;
  }
  const s = SCHOOL_BY_ID[adventure.equipped],
    skill = s.skill,
    target = nearestEnemy(skill.range),
    hero = world.hero;
  if (target) {
    const d = target.mesh.position.clone().sub(hero.position);
    hero.rotation.y = Math.atan2(d.x, d.z);
  }
  const forward = new THREE.Vector3(
    Math.sin(hero.rotation.y),
    0,
    Math.cos(hero.rotation.y),
  );
  skillCooldown = skill.cooldown;
  sound.play("attack");
  burst(hero.position, s.color, 10);
  if (["sword", "wander", "dan"].includes(skill.type)) {
    const mesh = new THREE.Mesh(particleGeometry, effectMaterial(s.color));
    mesh.scale.set(
      skill.type === "dan" ? 5 : 2,
      2,
      skill.type === "sword" ? 10 : 4,
    );
    mesh.position.copy(hero.position).add(new THREE.Vector3(0, 0.8, 0));
    mesh.rotation.y = hero.rotation.y;
    world.scene.add(mesh);
    bolts.push({
      mesh,
      direction: forward,
      life: skill.range / 12,
      damage: skill.damage + (adventure.level - 1) * 5,
      type: skill.type,
      touched: new Set(),
    });
  } else if (skill.type === "array") {
    for (const e of enemies)
      if (e.alive && e.mesh.position.distanceTo(hero.position) < skill.range)
        damageEnemy(e, skill.damage, e.boss ? 1 : 3);
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.4, 32),
      new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(hero.position);
    mesh.position.y = 0.12;
    world.scene.add(mesh);
    effects.push({ mesh, life: 3, ring: true, disposable: true });
  } else if (skill.type === "beast") {
    if (companion) world.scene.remove(companion.mesh);
    const mesh = createSpiritFox();
    mesh.position.copy(hero.position).add(forward);
    world.scene.add(mesh);
    companion = {
      mesh,
      life: 10,
      cooldown: 0,
      damage: skill.damage + (adventure.level - 1) * 3,
    };
  } else if (skill.type === "shadow") {
    const travel = target
      ? Math.max(
          0,
          Math.min(5, target.mesh.position.distanceTo(hero.position) - 1),
        )
      : 4;
    world.move(hero, forward.x * travel, forward.z * travel);
    invincible = 0.5;
    if (target && target.mesh.position.distanceTo(hero.position) < 2.8)
      damageEnemy(target, skill.damage + (adventure.level - 1) * 5);
    burst(hero.position, s.color, 15);
  }
  floatText(s.art, hero.position, "heal");
  updateHud();
  save();
}
function hurt(amount) {
  if (invincible > 0 || dead) return;
  const died = adventure.hurt(amount);
  invincible = 0.75;
  floatText(`−${amount}`, world.hero.position, "hurt");
  sound.play("hit");
  if (died) {
    dead = true;
    openModal(
      "仙途未尽",
      '<p>岑照把你带回青禾村，救援花费最多五枚灵石，保留修为、门派与剧情经历。</p><button class="primary-button" id="respawn">回村调息 <span>→</span></button>',
      "一时跌倒 · 不必重来",
    );
    $("respawn").onclick = () => {
      adventure.respawn();
      dead = false;
      clearCombat();
      world.hero.position.set(SPAWN.x, 0, SPAWN.z);
      syncWorld(true);
      closeModal();
      result("你在青禾驿醒来。仙途还在继续。");
    };
  }
}
function updateEnemies(dt, t) {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.root = Math.max(0, e.root - dt);
    const delta = world.hero.position.clone().sub(e.mesh.position),
      d = delta.length();
    if (e.root > 0) continue;
    if (e.windup > 0) {
      e.windup -= dt;
      e.ring.position.set(e.mesh.position.x, 0.1, e.mesh.position.z);
      e.ring.visible = true;
      if (e.windup <= 0) {
        e.ring.visible = false;
        if (d < (e.boss ? 3.4 : 1.7)) hurt(e.boss ? 36 : 14);
        e.cooldown = e.boss ? 1.9 : 1.3;
      }
    } else if (d < (e.boss ? 3 : 1.4) && e.cooldown <= 0)
      e.windup = e.boss ? 0.95 : 0.4;
    else if (d < (e.boss ? 10 : 5.5) && d > (e.boss ? 2.1 : 1.15)) {
      delta.normalize();
      world.move(
        e.mesh,
        delta.x * (e.boss ? 2.1 : 1.7) * dt,
        delta.z * (e.boss ? 2.1 : 1.7) * dt,
      );
      e.mesh.rotation.y = Math.atan2(delta.x, delta.z);
    } else if (!e.boss && d > 5.5) {
      const dest = new THREE.Vector3(
        e.x + Math.sin(t * 0.5 + e.phase) * 1.5,
        0,
        e.z + Math.cos(t * 0.4 + e.phase) * 1.5,
      ).sub(e.mesh.position);
      if (dest.length() > 0.2) {
        dest.normalize();
        world.move(e.mesh, dest.x * dt * 0.6, dest.z * dt * 0.6);
        e.mesh.rotation.y = Math.atan2(dest.x, dest.z);
      }
    }
    e.mesh.userData.body.position.y = Math.sin(t * 3 + e.phase) * 0.04;
  }
}
function updatePlayer(dt, t) {
  attackCooldown = Math.max(0, attackCooldown - dt);
  dodgeCooldown = Math.max(0, dodgeCooldown - dt);
  skillCooldown = Math.max(0, skillCooldown - dt);
  invincible = Math.max(0, invincible - dt);
  stamina = Math.min(100, stamina + dt * 23);
  adventure.mana = Math.min(adventure.maxMana, adventure.mana + dt * 5);
  adventure.playTime += dt;
  const h =
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) +
      touchMove.x,
    v =
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) +
      touchMove.y,
    move = new THREE.Vector3(h + v, 0, v - h);
  if (move.length() > 1) move.normalize();
  if (move.length() > 0.1) cancelWalk();
  if (targetEnemy) {
    if (!targetEnemy.alive) cancelWalk();
    else if (
      targetEnemy.mesh.position.distanceTo(world.hero.position) <
      (targetEnemy.boss ? 2.7 : 1.85)
    ) {
      walkPath = [];
      destinationMarker.visible = false;
      attack();
    } else if (!walkPath.length)
      walkPath = findPath(
        world.hero.position,
        targetEnemy.mesh.position,
        (x, z) => world.canWalk(x, z),
      );
  }
  if (walkPath.length) {
    const p = walkPath[0],
      d = new THREE.Vector3(
        p.x - world.hero.position.x,
        0,
        p.z - world.hero.position.z,
      );
    if (d.length() < 0.17) {
      walkPath.shift();
      if (!walkPath.length) destinationMarker.visible = false;
    } else move.copy(d.normalize());
  }
  const moving = move.length() > 0.1;
  if (dodgeTimer > 0) {
    dodgeTimer -= dt;
    world.move(
      world.hero,
      Math.sin(world.hero.rotation.y) * 11 * dt,
      Math.cos(world.hero.rotation.y) * 11 * dt,
    );
  } else if (moving) {
    world.hero.rotation.y = Math.atan2(move.x, move.z);
    world.move(
      world.hero,
      move.x * (attackTimer > 0 ? 1.6 : 4.3) * dt,
      move.z * (attackTimer > 0 ? 1.6 : 4.3) * dt,
    );
  }
  const pose = world.hero.userData,
    swing = moving ? Math.sin(t * 12) * 0.5 : 0;
  pose.leftLeg.rotation.x = swing;
  pose.rightLeg.rotation.x = -swing;
  if (attackTimer > 0) {
    attackTimer -= dt;
    pose.arm.rotation.x = -1.2;
    pose.arm.rotation.y =
      Math.sin(((0.27 - attackTimer) / 0.27) * Math.PI) * -1.9;
  } else {
    pose.arm.rotation.x = -swing * 0.25;
    pose.arm.rotation.y = 0;
  }
  world.hero.visible =
    invincible <= 0 || Math.floor(t * 15) % 2 === 0 || dodgeTimer > 0;
  if ((keys.has("KeyJ") || keys.has("Digit1")) && attackCooldown <= 0) attack();
}
function updateMagic(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.life -= dt;
    b.mesh.position.addScaledVector(b.direction, dt * 12);
    let hit = false;
    for (const e of enemies)
      if (
        e.alive &&
        !b.touched.has(e.id) &&
        Math.hypot(
          e.mesh.position.x - b.mesh.position.x,
          e.mesh.position.z - b.mesh.position.z,
        ) < (e.boss ? 1.7 : 0.9)
      ) {
        hit = true;
        if (b.type !== "dan") {
          damageEnemy(e, b.damage);
          b.touched.add(e.id);
        }
        if (b.type !== "sword") break;
      }
    if (b.life <= 0 || (hit && b.type !== "sword")) {
      if (b.type === "dan") {
        for (const e of enemies)
          if (
            e.alive &&
            Math.hypot(
              e.mesh.position.x - b.mesh.position.x,
              e.mesh.position.z - b.mesh.position.z,
            ) < 3
          )
            damageEnemy(e, b.damage);
        burst(b.mesh.position, "#e1a15f", 25);
      }
      world.scene.remove(b.mesh);
      bolts.splice(i, 1);
    }
  }
  if (companion) {
    companion.life -= dt;
    companion.cooldown -= dt;
    const target = nearestEnemy(8),
      goal = target ? target.mesh.position : world.hero.position,
      d = goal.clone().sub(companion.mesh.position);
    d.y = 0;
    if (d.length() > (target ? 1 : 1.4)) {
      d.normalize();
      world.move(companion.mesh, d.x * dt * 6, d.z * dt * 6);
      companion.mesh.rotation.y = Math.atan2(d.x, d.z);
    }
    if (
      target &&
      companion.mesh.position.distanceTo(target.mesh.position) < 1.5 &&
      companion.cooldown <= 0
    ) {
      damageEnemy(target, companion.damage);
      companion.cooldown = 0.8;
    }
    if (companion.life <= 0) {
      world.scene.remove(companion.mesh);
      companion = null;
    }
  }
}
function updateLabels(dt) {
  for (const p of labels) {
    const screen = world.project(
      new THREE.Vector3(p.x, p.kind === "school" ? 3.7 : 2.7, p.z),
    );
    p.el.style.left = `${screen.x}px`;
    p.el.style.top = `${screen.y}px`;
    p.el.style.display =
      playing && screen.visible && !modalOpen ? "block" : "none";
  }
  const target = findInteraction(),
    prompt = $("interaction-prompt");
  if (target) {
    const s = world.project(new THREE.Vector3(target.x, 2.2, target.z));
    prompt.style.left = `${s.x}px`;
    prompt.style.top = `${s.y}px`;
    prompt.querySelector("span").textContent = target.name;
    prompt.classList.toggle("hidden", !s.visible);
  } else prompt.classList.add("hidden");
  if (blocked()) return;
  for (let i = floating.length - 1; i >= 0; i--) {
    const f = floating[i];
    f.life -= dt;
    f.position.y += dt * 0.8;
    const p = world.project(f.position);
    f.el.style.left = `${p.x}px`;
    f.el.style.top = `${p.y}px`;
    f.el.style.opacity = String(Math.min(1, f.life * 2));
    if (f.life <= 0) {
      f.el.remove();
      floating.splice(i, 1);
    }
  }
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life -= dt;
    if (e.velocity) {
      e.velocity.y -= dt * 5;
      e.mesh.position.addScaledVector(e.velocity, dt);
      e.mesh.scale.setScalar(Math.min(1, e.life * 3));
    }
    if (e.ring) e.mesh.rotation.z += dt * 0.7;
    if (e.life <= 0) {
      world.scene.remove(e.mesh);
      if (e.disposable) {
        e.mesh.geometry.dispose();
        e.mesh.material.dispose();
      }
      effects.splice(i, 1);
    }
  }
}
function frame(now) {
  const t = now * 0.001,
    dt = lastFrame ? Math.min(0.045, t - lastFrame) : 0.016;
  lastFrame = t;
  elapsed += dt;
  if (playing && !blocked() && !document.hidden) {
    updatePlayer(dt, elapsed);
    updateMagic(dt);
    updateEnemies(dt, elapsed);
    saveClock += dt;
    if (saveClock > 5) {
      saveClock = 0;
      save();
    }
  } else world.hero.visible = true;
  world.animate(elapsed, dt, playing);
  updateLabels(document.hidden ? 0 : dt);
  if (playing && t - lastHud > 0.15) {
    updateHud();
    lastHud = t;
  }
  requestAnimationFrame(frame);
}
window.addEventListener("keydown", (e) => {
  const code = resolveKey(e);
  if (e.ctrlKey || e.altKey || e.metaKey || e.target?.isContentEditable) return;
  if (
    ["INPUT", "SELECT", "TEXTAREA"].includes(e.target?.tagName) &&
    code !== "Escape"
  )
    return;
  if (code === "Tab" && modalOpen) {
    const list = [
        ...$("modal").querySelectorAll(
          "button:not(.hidden):not(:disabled),select",
        ),
      ],
      first = list[0],
      last = list.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      last?.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first?.focus();
      e.preventDefault();
    }
    return;
  }
  if (code === "Escape" && !e.repeat) {
    e.preventDefault();
    if (dead) return;
    modalOpen ? closeModal() : showSettings();
    return;
  }
  if (modalOpen) {
    if (
      code === "KeyE" &&
      !e.repeat &&
      document.activeElement?.tagName === "BUTTON"
    ) {
      e.preventDefault();
      document.activeElement.click();
    }
    return;
  }
  if (!playing) {
    if (code === "Enter" && !e.repeat) {
      e.preventDefault();
      start(Boolean(saved));
    }
    return;
  }
  const handled = handleGameplayKey(e, keys, {
    attack,
    dodge,
    interact,
    drink,
    cast,
    cultivation: showCultivation,
    sects: showSects,
    inventory: showInventory,
    map: showMap,
  });
  if (handled && !e.repeat) {
    $("keyboard-feedback").textContent = `${handled.label} → ${handled.action}`;
    $("keyboard-feedback").classList.remove("hidden");
  }
});
window.addEventListener("keyup", (e) => keys.delete(resolveKey(e)));
window.addEventListener("blur", () => {
  keys.clear();
  touchMove.x = touchMove.y = 0;
});
window.addEventListener("focus", () => {
  if (playing && !blocked()) $("world").focus({ preventScroll: true });
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  if (document.hidden) save();
});
window.addEventListener("pagehide", () => save());
window.addEventListener("resize", () => world.resize());
$("world").addEventListener("contextmenu", (e) => e.preventDefault());
$("world").addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch" || !playing || blocked()) return;
  $("world").focus({ preventScroll: true });
  const ray = new THREE.Raycaster();
  ray.setFromCamera(
    new THREE.Vector2(
      (e.clientX / innerWidth) * 2 - 1,
      1 - (e.clientY / innerHeight) * 2,
    ),
    world.camera,
  );
  const target = new THREE.Vector3();
  if (
    !ray.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      target,
    )
  )
    return;
  if (e.button === 2) {
    cancelWalk();
    const d = target.sub(world.hero.position);
    world.hero.rotation.y = Math.atan2(d.x, d.z);
    attack();
    return;
  }
  const enemy = enemies.find(
    (e) => e.alive && ray.intersectObject(e.mesh, true).length,
  );
  navigateTo(enemy?.mesh.position ?? target, enemy ?? null);
});
$("start-button").onclick = () =>
  saved
    ? choices(
        "开启新的仙途",
        "新旅程将替换当前修仙存档，旧版苔光物语存档仍保留。",
        [
          { label: "开启新的修仙人生", run: () => start(false) },
          { label: "继续当前仙途", run: () => start(true) },
        ],
      )
    : start();
$("continue-button").onclick = () => start(true);
for (const [id, fn] of Object.entries({
  "help-button": showHelp,
  "settings-button": showSettings,
  "audio-button": toggleSound,
  "attack-button": attack,
  "dodge-button": dodge,
  "potion-button": drink,
  "skill-button": cast,
  "inventory-button": showInventory,
  "map-button": showMap,
  "journal-button": showJournal,
  "cultivation-button": showCultivation,
  "sects-button": showSects,
  "touch-interact": interact,
  "modal-close": closeModal,
}))
  $(id).onclick = fn;
$("home-button").onclick = (e) => {
  e.preventDefault();
  showSettings();
};
$("modal-shade").onclick = (e) => {
  if (e.target === $("modal-shade")) closeModal();
};
const stick = $("touch-stick"),
  knob = stick.querySelector("span");
let touchId = null;
function moveStick(e) {
  if (e.pointerId !== touchId) return;
  const r = stick.getBoundingClientRect(),
    x = (e.clientX - r.left - r.width / 2) / 32,
    y = (e.clientY - r.top - r.height / 2) / 32,
    len = Math.max(1, Math.hypot(x, y));
  touchMove.x = x / len;
  touchMove.y = y / len;
  knob.style.transform = `translate(${touchMove.x * 24}px,${touchMove.y * 24}px)`;
}
stick.onpointerdown = (e) => {
  touchId = e.pointerId;
  stick.setPointerCapture(touchId);
  moveStick(e);
};
stick.onpointermove = moveStick;
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  stick.addEventListener(event, () => {
    touchId = null;
    touchMove.x = touchMove.y = 0;
    knob.style.transform = "";
  });
requestAnimationFrame(frame);
setTimeout(() => {
  $("loading").style.opacity = "0";
  setTimeout(() => $("loading").classList.add("hidden"), 500);
}, 250);
