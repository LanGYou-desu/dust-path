import {
  SPAWN,
  SCHOOL_BY_ID,
  SCHOOLS,
  CLUES,
  HERBS,
  ENCOUNTERS,
  ENCOUNTER_POINTS,
  ENEMIES,
  encounterDeck,
} from "./content.js";
export { SPAWN } from "./content.js";
export const SAVE_KEY = "dust-path-save-v1";
export const LEGACY_SAVE_KEY = "moss-ember-save-v1";
const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const schoolId = (id) => Object.hasOwn(SCHOOL_BY_ID, id);
export class Adventure {
  constructor(seed = Math.floor(Math.random() * 4294967296)) {
    Object.assign(this, {
      level: 0,
      qi: 0,
      hp: 100,
      mana: 100,
      coins: 25,
      potions: 3,
      herbs: 0,
      food: 0,
      sect: null,
      equipped: null,
      learned: [],
      trials: [],
      history: [],
      reputation: Object.fromEntries(SCHOOLS.map((s) => [s.id, 0])),
      choices: { origin: null, resolution: null, ending: null },
      clues: [],
      sigils: [],
      foxFed: false,
      cacheTaken: false,
      openedChest: false,
      brewed: 0,
      kills: 0,
      bountyKills: 0,
      defeatCycles: {},
      harvested: [],
      cycle: 0,
      playTime: 0,
      nextRefresh: 0,
      bossAwake: false,
      endingPath: null,
      seed,
      encounters: encounterDeck(seed),
      encounterResults: {},
      position: { ...SPAWN },
    });
  }
  get maxHp() {
    return 100 + this.level * 20;
  }
  get maxMana() {
    return 100 + this.level * 10 + (this.choices.ending === "keep" ? 20 : 0);
  }
  get damage() {
    return 25 + Math.max(0, this.level - 1) * 5;
  }
  get nextXp() {
    return this.level <= 1 ? 80 : 140;
  }
  get realm() {
    return this.level ? `炼气${["", "一", "二", "三"][this.level]}层` : "凡人";
  }
  get path() {
    return SCHOOL_BY_ID[this.sect]?.name ?? "尚未入道";
  }
  get complete() {
    return Boolean(this.choices.ending);
  }
  gainQi(amount) {
    this.qi = Math.min(999999, this.qi + amount);
  }
  begin() {
    if (this.level !== 0) return false;
    this.level = 1;
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.gainQi(20);
    return true;
  }
  chooseOrigin(choice) {
    if (
      this.level === 0 ||
      this.choices.origin ||
      !["rescue", "explore"].includes(choice)
    )
      return false;
    this.choices.origin = choice;
    if (choice === "rescue") {
      this.potions++;
      this.herbs += 2;
      this.gainQi(15);
    } else {
      this.coins += 15;
      this.gainQi(25);
    }
    return true;
  }
  breakthrough() {
    const fee = this.level === 1 ? 20 : 30;
    if (
      this.level < 1 ||
      this.level >= 3 ||
      this.qi < this.nextXp ||
      this.coins < fee ||
      this.hp <= 0
    )
      return false;
    this.qi -= this.nextXp;
    this.coins -= fee;
    this.level++;
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    return true;
  }
  trialReady(id) {
    if (this.level === 0) return false;
    return (
      {
        sword: this.kills >= 3,
        dan: this.brewed >= 1 && this.potions >= 1,
        array: this.sigils.join(",") === "earth,wood,sky",
        beast: this.foxFed,
        shadow: this.cacheTaken,
        wander: this.coins >= 5,
      }[id] ?? false
    );
  }
  finishTrial(id) {
    if (!schoolId(id) || this.trials.includes(id) || !this.trialReady(id))
      return false;
    if (id === "dan") this.potions--;
    if (id === "wander") this.coins -= 5;
    this.trials.push(id);
    this.coins += 15;
    this.gainQi(30);
    return true;
  }
  joinSect(id) {
    if (
      !schoolId(id) ||
      this.sect ||
      !this.trials.includes(id) ||
      this.reputation[id] < 0 ||
      this.level === 0
    )
      return false;
    this.sect = id;
    this.equipped = id;
    if (!this.learned.includes(id)) this.learned.push(id);
    this.history.push({ type: "join", sect: id });
    return true;
  }
  leaveSect() {
    if (!this.sect) return false;
    this.history.push({ type: "leave", sect: this.sect });
    this.reputation[this.sect] = Math.max(
      -100,
      this.reputation[this.sect] - 20,
    );
    this.sect = null;
    return true;
  }
  equip(id) {
    if (!this.learned.includes(id)) return false;
    this.equipped = id;
    return true;
  }
  skillCost(id = this.equipped) {
    const s = SCHOOL_BY_ID[id];
    return s
      ? Math.ceil(s.skill.cost * (this.sect === id ? 1 : 1.25))
      : Infinity;
  }
  spendMana() {
    const cost = this.skillCost();
    if (!this.equipped || this.level === 0 || this.mana < cost || this.hp <= 0)
      return false;
    this.mana -= cost;
    return true;
  }
  harvest(id) {
    if (!HERBS.some((h) => h.id === id) || this.harvested.includes(id))
      return false;
    this.harvested.push(id);
    this.herbs += 2;
    this.gainQi(5);
    return true;
  }
  brew(kind) {
    if (
      !["heal", "qi"].includes(kind) ||
      this.herbs < (kind === "heal" ? 2 : 3) ||
      this.level === 0
    )
      return false;
    this.herbs -= kind === "heal" ? 2 : 3;
    this.brewed++;
    if (kind === "heal") this.potions++;
    else this.gainQi(35);
    return true;
  }
  feedFox() {
    if (this.foxFed || this.food < 2) return false;
    this.food -= 2;
    this.foxFed = true;
    this.gainQi(20);
    return true;
  }
  takeCache() {
    if (this.cacheTaken) return false;
    this.cacheTaken = true;
    this.coins += 15;
    this.gainQi(20);
    return true;
  }
  readClue(id) {
    if (!CLUES.some((c) => c.id === id)) return false;
    if (!this.clues.includes(id)) {
      this.clues.push(id);
      this.gainQi(15);
    }
    const next = ["earth", "wood", "sky"][this.sigils.length];
    if (id === next) this.sigils.push(id);
    else if (this.sigils.length < 3) this.sigils = id === "earth" ? [id] : [];
    return true;
  }
  commission(id, kind) {
    if (!schoolId(id) || this.level === 0) return false;
    if (kind === "herbs" && this.herbs >= 3) {
      this.herbs -= 3;
      this.coins += 10;
      this.gainQi(30);
    } else if (kind === "hunt" && this.bountyKills >= 3) {
      this.bountyKills -= 3;
      this.coins += 20;
      this.gainQi(45);
    } else return false;
    this.reputation[id] = Math.min(100, this.reputation[id] + 10);
    return true;
  }
  defeat(id) {
    const enemy = ENEMIES.find((e) => e.id === id);
    if (
      !enemy ||
      this.defeatCycles[id] === this.cycle ||
      (enemy.boss && (!this.bossAwake || this.choices.resolution))
    )
      return null;
    if (enemy.boss) {
      this.choices.resolution = "battle";
      this.bossAwake = false;
      this.coins += 30;
      this.gainQi(40);
    } else {
      this.defeatCycles[id] = this.cycle;
      this.kills++;
      this.bountyKills++;
      this.food++;
      this.coins += 8;
      this.gainQi(18);
    }
    return { coins: enemy.boss ? 30 : 8, qi: enemy.boss ? 40 : 18 };
  }
  awakenBoss() {
    if (
      this.level < 3 ||
      this.choices.resolution ||
      this.bossAwake ||
      !this.choices.origin ||
      !this.sect
    )
      return false;
    this.bossAwake = true;
    return true;
  }
  seal() {
    if (
      this.level < 3 ||
      this.clues.length !== 3 ||
      this.choices.resolution ||
      !this.choices.origin ||
      !this.sect
    )
      return false;
    this.choices.resolution = "seal";
    this.bossAwake = false;
    this.coins += 30;
    this.gainQi(40);
    return true;
  }
  finish(choice) {
    if (
      !this.choices.resolution ||
      this.complete ||
      !this.sect ||
      !["report", "keep", "neutral"].includes(choice)
    )
      return false;
    this.choices.ending = choice;
    this.endingPath = this.sect;
    if (choice === "report") {
      this.coins += 40;
      this.reputation[this.sect] = Math.min(
        100,
        this.reputation[this.sect] + 20,
      );
    } else if (choice === "keep") {
      this.gainQi(40);
      this.mana = this.maxMana;
    } else {
      this.coins += 30;
      this.herbs += 3;
    }
    return true;
  }
  encounter(id) {
    return ENCOUNTERS.find((e) => e.id === this.encounters[id]);
  }
  canChooseEncounter(id, index) {
    const option = this.encounter(id)?.options[index];
    return Boolean(
      option &&
        !Object.hasOwn(this.encounterResults, id) &&
        Object.entries(option.cost ?? {}).every(
          ([key, amount]) => this[key] >= amount,
        ) &&
        this.hp > (option.damage ?? 0),
    );
  }
  chooseEncounter(id, index) {
    if (!this.canChooseEncounter(id, index)) return false;
    const o = this.encounter(id).options[index];
    for (const [key, amount] of Object.entries(o.cost ?? {}))
      this[key] -= amount;
    for (const [key, amount] of Object.entries(o.reward ?? {}))
      if (key === "qi") this.gainQi(amount);
      else this[key] += amount;
    this.hp = Math.min(this.maxHp, this.hp - (o.damage ?? 0) + (o.heal ?? 0));
    this.encounterResults[id] = index;
    return true;
  }
  hurt(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp === 0;
  }
  drink() {
    if (this.potions <= 0 || this.hp >= this.maxHp || this.hp <= 0)
      return false;
    this.potions--;
    this.hp = Math.min(
      this.maxHp,
      this.hp + (this.choices.origin === "rescue" ? 60 : 50),
    );
    return true;
  }
  openChest() {
    if (this.openedChest) return false;
    this.openedChest = true;
    this.coins += 20;
    this.potions += 2;
    return true;
  }
  rest() {
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    if (this.playTime < this.nextRefresh) return false;
    this.cycle++;
    this.harvested = [];
    this.nextRefresh = this.playTime + 30;
    return true;
  }
  respawn() {
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.coins = Math.max(0, this.coins - 5);
    this.position = { ...SPAWN };
  }
  serialize() {
    return JSON.stringify({ version: 1, ...this });
  }
  static restore(raw) {
    try {
      const s = JSON.parse(raw);
      if (s && s.endingPath === undefined) s.endingPath = null;
      if (
        !s ||
        s.version !== 1 ||
        !integer(s.seed, 0, 4294967295) ||
        !integer(s.level, 0, 3)
      )
        return null;
      const a = new Adventure(s.seed);
      if (
        (s.endingPath !== null && !schoolId(s.endingPath)) ||
        (s.choices?.ending && !s.endingPath)
      )
        return null;
      const intKeys = [
        "qi",
        "hp",
        "coins",
        "potions",
        "herbs",
        "food",
        "brewed",
        "kills",
        "bountyKills",
        "cycle",
      ];
      if (
        intKeys.some((k) => !integer(s[k], 0, 999999)) ||
        !Number.isFinite(s.mana) ||
        s.mana < 0 ||
        !Number.isFinite(s.playTime) ||
        s.playTime < 0 ||
        !Number.isFinite(s.nextRefresh) ||
        s.nextRefresh < 0
      )
        return null;
      const lists = {
        learned: SCHOOLS.map((v) => v.id),
        trials: SCHOOLS.map((v) => v.id),
        clues: CLUES.map((v) => v.id),
        harvested: HERBS.map((v) => v.id),
      };
      for (const [key, allowed] of Object.entries(lists))
        if (
          !Array.isArray(s[key]) ||
          new Set(s[key]).size !== s[key].length ||
          s[key].some((v) => !allowed.includes(v))
        )
          return null;
      if (
        !Array.isArray(s.sigils) ||
        !["", "earth", "earth,wood", "earth,wood,sky"].includes(
          s.sigils.join(","),
        )
      )
        return null;
      if (
        (s.sect !== null && !schoolId(s.sect)) ||
        (s.equipped !== null && !s.learned.includes(s.equipped)) ||
        s.learned.some((id) => !s.trials.includes(id)) ||
        (s.sect && !s.learned.includes(s.sect))
      )
        return null;
      if (
        !s.choices ||
        ![null, "rescue", "explore"].includes(s.choices.origin) ||
        ![null, "battle", "seal"].includes(s.choices.resolution) ||
        ![null, "report", "keep", "neutral"].includes(s.choices.ending) ||
        (s.choices.ending && !s.choices.resolution) ||
        (s.choices.resolution && (s.level !== 3 || !s.choices.origin))
      )
        return null;
      if (
        ["foxFed", "cacheTaken", "openedChest", "bossAwake"].some(
          (k) => typeof s[k] !== "boolean",
        ) ||
        (s.bossAwake && (s.level !== 3 || s.choices.resolution))
      )
        return null;
      if (
        !s.reputation ||
        SCHOOLS.some((v) => !integer(s.reputation[v.id], -100, 100)) ||
        !Array.isArray(s.history) ||
        s.history.some(
          (v) => !v || !["join", "leave"].includes(v.type) || !schoolId(v.sect),
        )
      )
        return null;
      if (
        !s.defeatCycles ||
        typeof s.defeatCycles !== "object" ||
        Array.isArray(s.defeatCycles) ||
        Object.entries(s.defeatCycles).some(
          ([id, c]) =>
            !ENEMIES.some((e) => e.id === id && !e.boss) ||
            !integer(c, 0, s.cycle),
        )
      )
        return null;
      if (
        !s.encounterResults ||
        typeof s.encounterResults !== "object" ||
        Array.isArray(s.encounterResults) ||
        Object.entries(s.encounterResults).some(
          ([id, n]) =>
            !ENCOUNTER_POINTS.some((p) => p.id === id) || !integer(n, 0, 1),
        ) ||
        JSON.stringify(s.encounters) !== JSON.stringify(a.encounters)
      )
        return null;
      if (
        !s.position ||
        !Number.isFinite(s.position.x) ||
        !Number.isFinite(s.position.z) ||
        Math.abs(s.position.x) > 31 ||
        Math.abs(s.position.z) > 31
      )
        return null;
      for (const key of Object.keys(a)) a[key] = s[key];
      if (a.hp > a.maxHp || a.mana > a.maxMana) return null;
      if (a.hp === 0) a.respawn();
      return a;
    } catch {
      return null;
    }
  }
}
export function questInfo(a) {
  if (a.complete)
    return {
      title: "前路未定",
      description:
        "首章结束。仍可探索、修炼与转道；更远的修仙世界将在后续章节展开。",
      objective: "灵井异变 · 已完成",
      count: "✓",
    };
  let title, description, objective, count;
  if (a.level === 0)
    [title, description, objective, count] = [
      "一介凡人",
      "村中灵井逆流。先与岑照交谈，学会引气。",
      "与村中岑照交谈",
      "0 / 1",
    ];
  else if (!a.choices.origin)
    [title, description, objective, count] = [
      "路在脚下",
      "东边的采药人受了伤。帮他，或抢先探寻遗迹，由你决定。",
      "与东边采药人交谈",
      "0 / 1",
    ];
  else if (!a.sect)
    [title, description, objective, count] = [
      "问道何门",
      "五宗正在招募。完成一项历练后入门，或往西岸寻找散修道人。",
      "选择自己的修仙道路",
      "0 / 1",
    ];
  else if (a.level < 3)
    [title, description, objective, count] = [
      "积微成道",
      "历练、炼制养气丹或完成门派委托积累修为，在修炼界面主动突破。",
      "突破至炼气三层",
      `${a.level} / 3`,
    ];
  else if (!a.choices.resolution)
    [title, description, objective, count] = [
      "荒脉之下",
      "前往遗迹。可挑战荒脉守卫，也可读取地、木、天阵纹修复封印。",
      "平息灵脉逆流",
      `${a.clues.length} / 3 阵纹`,
    ];
  else if (!a.complete)
    [title, description, objective, count] = [
      "一卷三途",
      "遗迹中的残卷揭示有人刻意破坏灵井。它的去向，会影响你的未来。",
      "在遗迹决定残卷去向",
      "0 / 1",
    ];
  else
    [title, description, objective, count] = [
      "前路未定",
      "首章结束。仍可探索、修炼与转道；更远的修仙世界将在后续章节展开。",
      "灵井异变 · 已完成",
      "✓",
    ];
  return { title, description, objective, count };
}
