export const TITLE = "尘途问仙";
export const MAP_SIZE = 64;
export const SPAWN = { x: 2, z: 6 };
export const SCHOOLS = [
  {
    id: "sword",
    name: "青岚剑宗",
    short: "剑宗",
    art: "青岚飞剑",
    color: "#b4d5d5",
    symbol: "剑",
    x: 9,
    z: 9,
    master: "沈砚",
    role: "以剑问道",
    description: "一剑破障，也要知晓为何拔剑。",
    trial: "击败任意三只山道妖物。",
    skill: { type: "sword", cost: 20, cooldown: 6, damage: 65, range: 9 },
  },
  {
    id: "dan",
    name: "丹霞谷",
    short: "丹谷",
    art: "赤霞火丹",
    color: "#d69a66",
    symbol: "丹",
    x: -5,
    z: 11,
    master: "温蘅",
    role: "丹火济世",
    description: "药可救人，丹火也能护住自己的道路。",
    trial: "在村中丹炉炼制一枚回春丹，再交付一枚。",
    skill: { type: "dan", cost: 22, cooldown: 8, damage: 48, range: 5 },
  },
  {
    id: "array",
    name: "玄衍门",
    short: "阵门",
    art: "玄衍定身阵",
    color: "#d3c794",
    symbol: "阵",
    x: 6,
    z: -17,
    master: "陆微",
    role: "借势布阵",
    description: "地承其形，木生其息，天定其序。",
    trial: "依次读取地、木、天三处阵纹；错序可重新读取。",
    skill: { type: "array", cost: 25, cooldown: 10, damage: 30, range: 4.5 },
  },
  {
    id: "beast",
    name: "万灵山",
    short: "灵山",
    art: "唤灵狐",
    color: "#9fbd86",
    symbol: "灵",
    x: -18,
    z: 16,
    master: "叶弥",
    role: "与灵兽同行",
    description: "相伴而行，比驱使更长久。",
    trial: "击败妖物获得兽粮，给西岸受伤灵狐两份兽粮。",
    skill: { type: "beast", cost: 30, cooldown: 15, damage: 16, range: 7 },
  },
  {
    id: "shadow",
    name: "归影阁",
    short: "影阁",
    art: "归影步",
    color: "#b6afc8",
    symbol: "影",
    x: 23,
    z: 4,
    master: "许无声",
    role: "进退由心",
    description: "避开锋芒，或迎着锋芒破局，都由你决定。",
    trial: "取得东岸密匣。附近有敌人时无法开启，可绕开或击败巡逻者。",
    skill: { type: "shadow", cost: 20, cooldown: 8, damage: 75, range: 6 },
  },
  {
    id: "wander",
    name: "散修",
    short: "散修",
    art: "木灵箭",
    color: "#87bbae",
    symbol: "游",
    x: -20,
    z: -16,
    master: "无名道人",
    role: "天地为师",
    description: "不必把自己的命，交给任何一个门派。",
    trial: "以五枚灵石向西岸道人换取修炼心得。",
    skill: { type: "wander", cost: 15, cooldown: 5, damage: 45, range: 8 },
  },
];
export const SCHOOL_BY_ID = Object.fromEntries(SCHOOLS.map((s) => [s.id, s]));
export const PATH_EPILOGUES = {
  sword: "沈砚认出残卷上的剑痕来自青岚旧式。宗门里有人认识破坏封印的人。",
  dan: "温蘅发现卷中藏着一味禁用药引。失踪的丹师，或许仍活在山境之外。",
  array: "陆微补出被撕去的阵图一角。逆流并非事故，而是一场尚未完成的实验。",
  beast: "叶弥与灵狐辨出灵井下的兽魂气息。有人正在以灵兽供养另一条灵脉。",
  shadow:
    "许无声发现残卷印记与密匣委托同源。委托人一直在借不同门派的手搜集旧物。",
  wander:
    "无名道人只让你自己看完残卷：五宗之外，还有一条从未写进门谱的问道之路。",
};
export const CLUES = [
  { id: "earth", name: "地字阵纹", symbol: "地", x: -18, z: -10 },
  { id: "wood", name: "木字阵纹", symbol: "木", x: 18, z: 15 },
  { id: "sky", name: "天字阵纹", symbol: "天", x: 23, z: -20 },
];
export const HERBS = [
  { id: "herb-1", x: 4, z: 11 },
  { id: "herb-2", x: 8, z: -5 },
  { id: "herb-3", x: 21, z: -6 },
  { id: "herb-4", x: 16, z: 8 },
  { id: "herb-5", x: -20, z: 7 },
  { id: "herb-6", x: -18, z: -13 },
  { id: "herb-7", x: -6, z: 17 },
  { id: "herb-8", x: 25, z: 18 },
];
export const ENCOUNTER_POINTS = [
  { id: "chance-west", x: -26, z: 3 },
  { id: "chance-east", x: 26, z: -13 },
  { id: "chance-south", x: -3, z: 24 },
  { id: "chance-north", x: 9, z: -26 },
];
export const ENCOUNTERS = [
  {
    id: "traveler",
    title: "路边药客",
    text: "药客的行囊翻落在泥里。他愿用丹药换一些灵草，也可以把山中所见告诉你。",
    options: [
      {
        label: "给他三份灵草",
        cost: { herbs: 3 },
        reward: { potions: 3, qi: 15 },
        consequence: "获得三枚回春丹与 15 修为。",
      },
      {
        label: "听听他的见闻",
        reward: { qi: 12 },
        consequence: "获得 12 修为，不消耗资源。",
      },
    ],
  },
  {
    id: "cache",
    title: "石缝旧匣",
    text: "匣中灵气躁动。慢慢拆解可以保住草药，强开则能取出更多灵石。",
    options: [
      {
        label: "慢慢拆解",
        reward: { herbs: 4, coins: 8 },
        consequence: "获得四份灵草、八枚灵石。",
      },
      {
        label: "直接破开",
        damage: 20,
        reward: { coins: 28 },
        consequence: "损失 20 生命，获得 28 灵石。",
      },
    ],
  },
  {
    id: "merchant",
    title: "行脚商人",
    text: "一位商人把灵草包和引气札记摊在布上。没有灵石也可以替他辨认药材。",
    options: [
      {
        label: "花十枚灵石买草药",
        cost: { coins: 10 },
        reward: { herbs: 6 },
        consequence: "十枚灵石换六份灵草。",
      },
      {
        label: "帮他辨认草药",
        reward: { qi: 18, herbs: 1 },
        consequence: "获得 18 修为和一份灵草。",
      },
    ],
  },
  {
    id: "echo",
    title: "古剑回响",
    text: "断剑中残留着一式剑意。顺势感悟，或者顶着剑意尝试破招，各有所获。",
    options: [
      { label: "顺势感悟", reward: { qi: 25 }, consequence: "获得 25 修为。" },
      {
        label: "试着破招",
        damage: 25,
        reward: { qi: 45, coins: 10 },
        consequence: "损失 25 生命，获得 45 修为、十枚灵石。",
      },
    ],
  },
  {
    id: "fox",
    title: "灵兽足迹",
    text: "一串小小的足印通向浆果丛。可以留下食物，也可以搜寻灵兽藏起的果实。",
    options: [
      {
        label: "留下两份兽粮",
        cost: { food: 2 },
        reward: { qi: 30, herbs: 3 },
        consequence: "获得 30 修为、三份灵草。",
      },
      {
        label: "采摘周围浆果",
        reward: { food: 2 },
        consequence: "获得两份兽粮。",
      },
    ],
  },
  {
    id: "rain",
    title: "雨后灵泉",
    text: "灵泉边的石刻已模糊。静心饮泉能恢复气血，潜入泉底则可能找到旧物。",
    options: [
      {
        label: "饮泉调息",
        heal: 80,
        reward: { qi: 12 },
        consequence: "恢复 80 生命，获得 12 修为。",
      },
      {
        label: "潜入泉底",
        damage: 15,
        reward: { coins: 24, herbs: 2 },
        consequence: "损失 15 生命，获得 24 灵石、两份灵草。",
      },
    ],
  },
  {
    id: "scribe",
    title: "无字残页",
    text: "有墨迹在阳光下浮现。可以沿着旧人的笔法临摹，也可以将纸中的灵力收为己用。",
    options: [
      { label: "临摹残页", reward: { qi: 30 }, consequence: "获得 30 修为。" },
      {
        label: "汲取纸中灵力",
        reward: { coins: 15, potions: 1 },
        consequence: "获得 15 灵石、一枚回春丹。",
      },
    ],
  },
  {
    id: "pilgrim",
    title: "迷路香客",
    text: "香客不知道回村的方向。指路可得谢礼，交换沿途消息也能增长见识。",
    options: [
      {
        label: "为他指路",
        reward: { coins: 15, food: 2 },
        consequence: "获得 15 灵石、两份兽粮。",
      },
      {
        label: "交换沿途见闻",
        reward: { qi: 25, herbs: 2 },
        consequence: "获得 25 修为、两份灵草。",
      },
    ],
  },
];
export const POINTS = [
  { id: "mentor", kind: "mentor", name: "岑照 · 村中引路人", x: 1, z: 1 },
  { id: "fire", kind: "rest", name: "青禾驿 · 调息", x: -1, z: 5 },
  { id: "furnace", kind: "furnace", name: "村中丹炉", x: -4, z: 5 },
  { id: "traveler", kind: "origin", name: "受伤采药人", x: 8, z: 0 },
  { id: "chest", kind: "chest", name: "西岸补给匣", x: -15, z: 9 },
  { id: "shrine", kind: "shrine", name: "荒脉遗迹", x: 16, z: -14 },
  { id: "cache", kind: "cache", name: "东岸密匣", x: 24, z: 10 },
  { id: "fox", kind: "fox", name: "受伤灵狐", x: -21, z: 19 },
  ...SCHOOLS.map((s) => ({
    ...s,
    id: `school-${s.id}`,
    school: s.id,
    kind: "school",
    name: s.name,
  })),
  ...CLUES.map((c) => ({ ...c, kind: "clue" })),
  ...HERBS.map((h, i) => ({
    ...h,
    kind: "herb",
    name: [
      "溪边灵草",
      "山道灵草",
      "东坡灵草",
      "松下灵草",
      "西岸灵草",
      "古碑灵草",
      "南坡灵草",
      "远山灵草",
    ][i],
  })),
  ...ENCOUNTER_POINTS.map((e, i) => ({
    ...e,
    kind: "encounter",
    name: ["西岸机缘", "东坡机缘", "南坡机缘", "北岭机缘"][i],
  })),
];
export const ENEMIES = [
  { id: "fern", name: "山道木魈", x: 12, z: 2 },
  { id: "moss", name: "山道木魈", x: 15, z: -4 },
  { id: "clover", name: "山道木魈", x: 12, z: -9 },
  { id: "east-1", name: "巡林木魈", x: 24, z: 14 },
  { id: "east-2", name: "巡林木魈", x: 26, z: 7 },
  { id: "south-1", name: "山道木魈", x: 14, z: 20 },
  { id: "west-1", name: "山道木魈", x: -24, z: 12 },
  { id: "west-2", name: "山道木魈", x: -23, z: -7 },
  { id: "north-1", name: "山道木魈", x: 13, z: -24 },
  { id: "guardian", name: "荒脉守卫", x: 16, z: -20, boss: true },
];
export function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function encounterDeck(seed) {
  const list = [...ENCOUNTERS],
    random = seededRandom(seed);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return Object.fromEntries(ENCOUNTER_POINTS.map((p, i) => [p.id, list[i].id]));
}
