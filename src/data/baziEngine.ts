import { DateTime } from "luxon";
import { Solar } from "lunar-javascript";
import { findLocationProfile, getDefaultLocationProfile } from "./locationProfiles";
import { runRuleEngine } from "./ruleEngine";
import { DEFAULT_RULE_CONFIG, Element, ElementRole } from "./ruleConfig";
import { BaziResult, BirthInput, DaYunInsight, DaYunItem, LiuNianItem, LiuYueItem, LiuZhouItem, MasterNarrative, MetricName, ShenShaName, TimeCalibration, TopicReport } from "../types";

type ParsedBirthContext = {
  corrected: { year: number; month: number; day: number; hour: number; minute: number };
  birthYearForAge: number;
  calibration: TimeCalibration;
};

const STEM_ELEMENT: Record<string, Element> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水"
};

const ZHI_ELEMENT: Record<string, Element> = {
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "金",
  酉: "金",
  戌: "土",
  亥: "水"
};

const PRODUCE_MAP: Record<Element, Element> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木"
};

const CONTROL_MAP: Record<Element, Element> = {
  木: "土",
  火: "金",
  土: "水",
  金: "木",
  水: "火"
};

const ELEMENT_STEMS: Record<Element, string[]> = {
  木: ["甲", "乙"],
  火: ["丙", "丁"],
  土: ["戊", "己"],
  金: ["庚", "辛"],
  水: ["壬", "癸"]
};

const TAG_POOL: Record<MetricName, string[]> = {
  事业: ["执行力", "组织力", "目标感"],
  财务: ["稳健财运", "资源整合", "交易判断"],
  关系: ["沟通力", "关系修复", "协同力"],
  成长: ["学习力", "复盘力", "洞察力"],
  健康: ["节律管理", "抗压性", "长期主义"]
};

const THEMES = ["布局", "协同", "聚焦", "修正", "突破", "沉淀", "扩张", "守成"];

const TEN_GOD_KEYS = [
  "正官",
  "七杀",
  "正财",
  "偏财",
  "正印",
  "偏印",
  "食神",
  "伤官",
  "比肩",
  "劫财"
];

const GROUP_MAP: Record<string, "申子辰" | "寅午戌" | "亥卯未" | "巳酉丑"> = {
  申: "申子辰",
  子: "申子辰",
  辰: "申子辰",
  寅: "寅午戌",
  午: "寅午戌",
  戌: "寅午戌",
  亥: "亥卯未",
  卯: "亥卯未",
  未: "亥卯未",
  巳: "巳酉丑",
  酉: "巳酉丑",
  丑: "巳酉丑"
};

const TAO_HUA_TARGET: Record<"申子辰" | "寅午戌" | "亥卯未" | "巳酉丑", string> = {
  申子辰: "酉",
  寅午戌: "卯",
  亥卯未: "子",
  巳酉丑: "午"
};

const YI_MA_TARGET: Record<"申子辰" | "寅午戌" | "亥卯未" | "巳酉丑", string> = {
  申子辰: "寅",
  寅午戌: "申",
  亥卯未: "巳",
  巳酉丑: "亥"
};

const WEN_CHANG_BY_DAY_GAN: Record<string, string> = {
  甲: "巳",
  乙: "午",
  丙: "申",
  丁: "酉",
  戊: "申",
  己: "酉",
  庚: "亥",
  辛: "子",
  壬: "寅",
  癸: "卯"
};

const TIAN_YI_BY_DAY_GAN: Record<string, string[]> = {
  甲: ["丑", "未"],
  戊: ["丑", "未"],
  乙: ["子", "申"],
  己: ["子", "申"],
  丙: ["亥", "酉"],
  丁: ["亥", "酉"],
  庚: ["午", "寅"],
  辛: ["午", "寅"],
  壬: ["卯", "巳"],
  癸: ["卯", "巳"]
};

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toArray(input: unknown): string[] {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.map((item) => String(item)).filter(Boolean);
  }
  const text = String(input).trim();
  if (!text) {
    return [];
  }
  if (text.includes(",")) {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [text];
}

function inferGenderFlag(gender: string): 0 | 1 {
  const text = gender.trim().toLowerCase();
  if (text.includes("男") || text.includes("male") || text === "m") {
    return 1;
  }
  return 0;
}

function reverseMapValue(map: Record<Element, Element>, target: Element): Element {
  const found = (Object.keys(map) as Element[]).find((key) => map[key] === target);
  return found || "土";
}

function makeTenGodCounter(): Record<string, number> {
  return TEN_GOD_KEYS.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function incTenGod(counter: Record<string, number>, key: string, weight: number): void {
  if (key in counter) {
    counter[key] += weight;
  }
}

function toSummary(strength: string, focus: MetricName, currentDaYun: string, patternSummary: string): string {
  if (strength === "偏强") {
    return `${patternSummary} 命盘能量偏强，当前大运${currentDaYun}阶段更适合“收敛目标、释放产出”，优先推进${focus}方向。`;
  }
  if (strength === "偏弱") {
    return `${patternSummary} 命盘能量偏弱，当前大运${currentDaYun}阶段建议“先补资源再求突破”，主线可放在${focus}。`;
  }
  return `${patternSummary} 命盘能量中和，当前大运${currentDaYun}阶段节奏稳定，适合围绕${focus}做持续积累。`;
}

function toThemes(score: number, index: number): string {
  const bias = score >= 78 ? 2 : score <= 55 ? 5 : 0;
  return THEMES[(index + bias) % THEMES.length];
}

function startOfIsoWeek(date: Date): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  const dayIndex = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - dayIndex);
  return out;
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

function toMonthDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

function toWeekLabel(startDate: Date, endDate: Date): string {
  return `${toMonthDay(startDate)}-${toMonthDay(endDate)}`;
}

function getWeekOfMonth(weekStart: Date, focusYear: number, focusMonth: number): number {
  const monthStart = new Date(focusYear, focusMonth - 1, 1);
  const monthFirstWeekStart = startOfIsoWeek(monthStart);
  const diffWeeks = Math.floor((weekStart.getTime() - monthFirstWeekStart.getTime()) / (7 * DAY_MS));
  return Math.max(1, diffWeeks + 1);
}

function getMonthGanZhiByDate(date: Date): string {
  const lunar = Solar.fromYmdHms(date.getFullYear(), date.getMonth() + 1, date.getDate(), 12, 0, 0).getLunar();
  if (typeof (lunar as any).getMonthInGanZhiExact === "function") {
    return String((lunar as any).getMonthInGanZhiExact());
  }
  return String((lunar as any).getMonthInGanZhi());
}

function getStandardOffsetMinutes(zone: string, year: number): number {
  const jan = DateTime.fromObject({ year, month: 1, day: 1, hour: 12 }, { zone });
  const jul = DateTime.fromObject({ year, month: 7, day: 1, hour: 12 }, { zone });

  if (!jan.isValid || !jul.isValid) {
    throw new Error(`无法读取时区偏移：${zone}`);
  }

  return Math.min(jan.offset, jul.offset);
}

function calcEquationOfTimeMinutes(dayOfYear: number): number {
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function parseBirthContext(input: BirthInput): ParsedBirthContext {
  const dateMatch = input.birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = input.birthTime.match(/^(\d{2}):(\d{2})$/);

  if (!dateMatch || !timeMatch) {
    throw new Error("出生日期或时间格式错误，日期用 YYYY-MM-DD，时间用 HH:MM");
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    throw new Error("出生日期或时间超出有效范围");
  }

  const profile = findLocationProfile(input.birthCity) || getDefaultLocationProfile();
  const timezone = input.timezone.trim() || profile.timezone;

  const longitudeRaw = input.longitude.trim();
  const longitude = longitudeRaw ? Number(longitudeRaw) : profile.longitude;
  if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("经度必须在 -180 到 180 之间");
  }

  const localInput = DateTime.fromObject(
    {
      year,
      month,
      day,
      hour,
      minute,
      second: 0,
      millisecond: 0
    },
    { zone: timezone }
  );

  if (!localInput.isValid) {
    throw new Error(`无效时区或时间：${timezone}`);
  }

  const standardOffsetMinutes = getStandardOffsetMinutes(timezone, year);
  const timezoneOffsetMinutes = localInput.offset;
  const dstOffsetMinutes = timezoneOffsetMinutes - standardOffsetMinutes;
  const standardMeridian = (standardOffsetMinutes / 60) * 15;
  const equationOfTimeMinutes = calcEquationOfTimeMinutes(localInput.ordinal);

  const trueSolarCorrectionMinutes =
    4 * (longitude - standardMeridian) + equationOfTimeMinutes - dstOffsetMinutes;

  const correctedMillis = Math.round((localInput.toMillis() + trueSolarCorrectionMinutes * 60000) / 60000) * 60000;
  const correctedSolar = DateTime.fromMillis(correctedMillis, { zone: timezone });

  const calibration: TimeCalibration = {
    timezone,
    cityLongitude: Number(longitude.toFixed(4)),
    standardMeridian: Number(standardMeridian.toFixed(2)),
    timezoneOffsetMinutes,
    standardOffsetMinutes,
    dstOffsetMinutes,
    equationOfTimeMinutes: Number(equationOfTimeMinutes.toFixed(2)),
    trueSolarCorrectionMinutes: Number(trueSolarCorrectionMinutes.toFixed(2)),
    inputLocalTime: localInput.toFormat("yyyy-LL-dd HH:mm"),
    correctedSolarTime: correctedSolar.toFormat("yyyy-LL-dd HH:mm")
  };

  return {
    corrected: {
      year: correctedSolar.year,
      month: correctedSolar.month,
      day: correctedSolar.day,
      hour: correctedSolar.hour,
      minute: correctedSolar.minute
    },
    birthYearForAge: correctedSolar.year,
    calibration
  };
}

function calcCurrentAge(corrected: ParsedBirthContext["corrected"]): number {
  const now = new Date();
  let age = now.getFullYear() - corrected.year;
  const beforeBirthday =
    now.getMonth() + 1 < corrected.month ||
    (now.getMonth() + 1 === corrected.month && now.getDate() < corrected.day);
  if (beforeBirthday) {
    age -= 1;
  }
  return clamp(age, 0, 120);
}

function buildLiuNian(
  daYunRawList: any[],
  daYunList: DaYunItem[],
  baseScore: number,
  dayElement: Element,
  resourceElement: Element,
  controlByElement: Element,
  birthYear: number
): LiuNianItem[] {
  const currentYear = new Date().getFullYear();
  const output: LiuNianItem[] = [];

  for (let i = 0; i < 6; i += 1) {
    const year = currentYear + i;
    let dyRaw = daYunRawList.find((item) => year >= item.getStartYear() && year <= item.getEndYear());
    let dy = daYunList.find((item) => year >= item.startYear && year <= item.endYear) || null;

    if (!dyRaw) {
      dyRaw = daYunRawList[daYunRawList.length - 1];
    }

    if (!dy && daYunList.length) {
      dy = daYunList[daYunList.length - 1];
    }

    const liuNianIndex = clamp(year - dyRaw.getStartYear(), 0, 9);
    const liuNian = dyRaw.getLiuNian(liuNianIndex + 1)[liuNianIndex];
    const ganZhi = liuNian ? liuNian.getGanZhi() : Solar.fromYmd(year, 6, 1).getLunar().getYearInGanZhiExact();
    const stem = ganZhi.slice(0, 1);
    const stemElement = STEM_ELEMENT[stem] || dayElement;

    let delta = 0;
    if (stemElement === dayElement) {
      delta += 5;
    }
    if (stemElement === resourceElement) {
      delta += 6;
    }
    if (stemElement === CONTROL_MAP[dayElement]) {
      delta += 2;
    }
    if (stemElement === controlByElement) {
      delta -= 7;
    }

    const score = clamp(Math.round(baseScore + delta + (i % 2 === 0 ? 2 : -1)), 38, 95);
    output.push({
      year,
      age: liuNian ? liuNian.getAge() : year - birthYear + 1,
      ganZhi,
      daYun: dy ? dy.ganZhi : "-",
      score,
      theme: toThemes(score, i)
    });
  }

  return output;
}

function getElementRole(element: Element, dayElement: Element): ElementRole {
  const resourceElement = reverseMapValue(PRODUCE_MAP, dayElement);
  const wealthElement = CONTROL_MAP[dayElement];
  const officerElement = reverseMapValue(CONTROL_MAP, dayElement);

  if (element === dayElement) {
    return "self";
  }
  if (element === resourceElement) {
    return "resource";
  }
  if (element === PRODUCE_MAP[dayElement]) {
    return "output";
  }
  if (element === wealthElement) {
    return "wealth";
  }
  if (element === officerElement) {
    return "officer";
  }

  return "self";
}

function buildLiuYueForYear(
  daYunRawList: any[],
  targetYear: number,
  yearlyScore: number,
  dayElement: Element,
  patternLevel: "高" | "中" | "低",
  shenshaActiveCount: number
): LiuYueItem[] {
  const monthlyCfg = DEFAULT_RULE_CONFIG.monthly;

  let dyRaw = daYunRawList.find((item) => targetYear >= item.getStartYear() && targetYear <= item.getEndYear());
  if (!dyRaw) {
    dyRaw = daYunRawList[daYunRawList.length - 1];
  }

  const liuNianIndex = clamp(targetYear - dyRaw.getStartYear(), 0, 9);
  const liuNian = dyRaw.getLiuNian(liuNianIndex + 1)[liuNianIndex];
  const liuYueRaw = liuNian.getLiuYue();

  const patternBoost =
    patternLevel === "高"
      ? monthlyCfg.patternBoostByLevel.high
      : patternLevel === "中"
        ? monthlyCfg.patternBoostByLevel.medium
        : monthlyCfg.patternBoostByLevel.low;

  return liuYueRaw.map((item: any, idx: number) => {
    const ganZhi = String(item.getGanZhi());
    const stem = ganZhi.slice(0, 1);
    const zhi = ganZhi.slice(1, 2);

    const stemElement = STEM_ELEMENT[stem] || dayElement;
    const branchElement = ZHI_ELEMENT[zhi] || dayElement;

    const stemRole = getElementRole(stemElement, dayElement);
    const branchRole = getElementRole(branchElement, dayElement);

    const scoreRaw =
      yearlyScore * monthlyCfg.baselineWeight +
      monthlyCfg.stemWeights[stemRole] +
      monthlyCfg.branchWeights[branchRole] +
      monthlyCfg.seasonOffsets[idx] +
      shenshaActiveCount * monthlyCfg.shenshaActiveBoost +
      patternBoost +
      (idx % 2 === 0 ? 0.8 : -0.6);

    const score = clamp(Math.round(scoreRaw), monthlyCfg.min, monthlyCfg.max);

    return {
      year: targetYear,
      monthIndex: idx + 1,
      monthLabel: `${idx + 1}月`,
      ganZhi,
      score,
      theme: toThemes(score, idx)
    };
  });
}

function buildLiuZhou(
  liuYuePool: LiuYueItem[],
  patternLevel: "高" | "中" | "低",
  shenshaActiveCount: number
): LiuZhouItem[] {
  const weeklyCfg = DEFAULT_RULE_CONFIG.weekly;
  const patternBoost =
    patternLevel === "高"
      ? weeklyCfg.patternBoostByLevel.high
      : patternLevel === "中"
        ? weeklyCfg.patternBoostByLevel.medium
        : weeklyCfg.patternBoostByLevel.low;

  const monthMap = new Map<string, LiuYueItem>();
  liuYuePool.forEach((item) => {
    monthMap.set(`${item.year}-${item.monthIndex}`, item);
  });

  const currentWeekStart = startOfIsoWeek(new Date());
  const output: LiuZhouItem[] = [];

  for (let seq = 0; seq < 12; seq += 1) {
    const weekStart = addDays(currentWeekStart, seq * 7);
    const weekEnd = addDays(weekStart, 6);
    const weekCenter = addDays(weekStart, 3);

    const focusYear = weekCenter.getFullYear();
    const focusMonth = weekCenter.getMonth() + 1;
    const weekOfMonth = getWeekOfMonth(weekStart, focusYear, focusMonth);
    const weekOffset = weeklyCfg.weekOffsets[(weekOfMonth - 1) % weeklyCfg.weekOffsets.length] || 0;

    const monthItem =
      monthMap.get(`${focusYear}-${focusMonth}`) ||
      liuYuePool.find((item) => item.monthIndex === focusMonth) ||
      liuYuePool[seq % liuYuePool.length];
    const monthGanZhi = monthItem ? monthItem.ganZhi : getMonthGanZhiByDate(weekCenter);

    const rawScore =
      monthItem.score * weeklyCfg.baselineWeight +
      weekOffset +
      patternBoost +
      shenshaActiveCount * weeklyCfg.shenshaActiveBoost +
      ((weekCenter.getDate() + focusMonth) % 3 === 0 ? 0.7 : (weekCenter.getDate() + focusMonth) % 3 === 1 ? -0.5 : 0.2);

    const score = clamp(Math.round(rawScore), weeklyCfg.min, weeklyCfg.max);

    output.push({
      sequence: seq + 1,
      year: focusYear,
      monthIndex: focusMonth,
      weekOfMonth,
      weekLabel: toWeekLabel(weekStart, weekEnd),
      monthGanZhi,
      score,
      theme: toThemes(score, seq)
    });
  }

  return output;
}

function buildProfileTags(metricRank: MetricName[]): string[] {
  const tags: string[] = [];
  metricRank.forEach((label) => {
    (TAG_POOL[label] || []).forEach((tag) => {
      if (tags.length < 3 && !tags.includes(tag)) {
        tags.push(tag);
      }
    });
  });
  return tags;
}

function detectShensha(eight: any): Record<ShenShaName, boolean> {
  const dayGan = String(eight.getDayGan());
  const yearZhi = String(eight.getYearZhi());
  const dayZhi = String(eight.getDayZhi());
  const branches = [String(eight.getYearZhi()), String(eight.getMonthZhi()), String(eight.getDayZhi()), String(eight.getTimeZhi())];

  const yearGroup = GROUP_MAP[yearZhi];
  const dayGroup = GROUP_MAP[dayZhi];

  const taoHuaTargets = [TAO_HUA_TARGET[yearGroup], TAO_HUA_TARGET[dayGroup]].filter(Boolean);
  const yiMaTargets = [YI_MA_TARGET[yearGroup], YI_MA_TARGET[dayGroup]].filter(Boolean);

  const wenChangTarget = WEN_CHANG_BY_DAY_GAN[dayGan];
  const tianYiTargets = TIAN_YI_BY_DAY_GAN[dayGan] || [];

  const hit = (targets: string[]) => targets.some((target) => branches.includes(target));

  return {
    天乙贵人: hit(tianYiTargets),
    文昌: Boolean(wenChangTarget && branches.includes(wenChangTarget)),
    桃花: hit(taoHuaTargets),
    驿马: hit(yiMaTargets)
  };
}

function metricValue(metrics: Array<{ label: MetricName; value: number }>, label: MetricName, fallback: number): number {
  return metrics.find((item) => item.label === label)?.value ?? fallback;
}

function scoreLevel(score: number): "高" | "中" | "低" {
  if (score >= 78) {
    return "高";
  }
  if (score >= 62) {
    return "中";
  }
  return "低";
}

function topMonthWindows(liuYue: LiuYueItem[], count: number): string[] {
  return [...liuYue]
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => `${item.monthLabel}(${item.ganZhi})`);
}

function topYearWindows(liuNian: LiuNianItem[], count: number): string[] {
  return [...liuNian]
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => `${item.year}年(${item.ganZhi})`);
}

function summarizeTrend(liuNian: LiuNianItem[]): "上升" | "平稳" | "回落" {
  if (liuNian.length < 4) {
    return "平稳";
  }
  const first = liuNian.slice(0, 3).reduce((sum, item) => sum + item.score, 0) / 3;
  const last = liuNian.slice(-3).reduce((sum, item) => sum + item.score, 0) / 3;
  if (last - first >= 3) {
    return "上升";
  }
  if (first - last >= 3) {
    return "回落";
  }
  return "平稳";
}

function roleFromDaYun(ganZhi: string, dayElement: Element): ElementRole {
  const stem = ganZhi.slice(0, 1);
  const stemElement = STEM_ELEMENT[stem] || dayElement;
  return getElementRole(stemElement, dayElement);
}

function buildDaYunInsights(
  daYunList: DaYunItem[],
  currentDaYun: DaYunItem | null,
  dayElement: Element,
  yearlyScore: number,
  patternLevel: "高" | "中" | "低",
  metrics: Array<{ label: MetricName; value: number }>
): DaYunInsight[] {
  if (!daYunList.length) {
    return [];
  }

  const focusByRole: Record<ElementRole, MetricName> = {
    self: "关系",
    resource: "成长",
    output: "事业",
    wealth: "财务",
    officer: "事业"
  };

  const opportunityByRole: Record<ElementRole, string> = {
    self: "自主主导与个人品牌积累空间更大。",
    resource: "学习、认证、贵人背书能力提升明显。",
    output: "表达、产品化与影响力释放更有效。",
    wealth: "项目变现与现金流效率提升窗口出现。",
    officer: "组织协同和制度化推进更易见效。"
  };

  const riskByRole: Record<ElementRole, string> = {
    self: "同类竞争与内耗风险上升。",
    resource: "节奏偏慢，容易停留在准备阶段。",
    output: "表达过载，承诺过多导致交付压力。",
    wealth: "短期收益诱惑可能放大风险敞口。",
    officer: "责任压力上升，需防精力透支。"
  };

  const strategyByRole: Record<ElementRole, string> = {
    self: "明确差异化定位，避免同赛道正面消耗。",
    resource: "每季度设置一个可验证成长里程碑，避免只学不产出。",
    output: "围绕一个核心主题连续输出，形成长期复利。",
    wealth: "先设预算与止损线，再做增量投入决策。",
    officer: "用流程和复盘模板承接压力，不靠临时冲刺。"
  };

  const roleScoreDelta: Record<ElementRole, number> = {
    self: 0,
    resource: 3,
    output: 5,
    wealth: 6,
    officer: 2
  };

  const phaseDelta: Record<DaYunInsight["phase"], number> = {
    上一运: -1,
    当前运: 3,
    下一运: 1
  };

  let currentIndex = currentDaYun ? daYunList.findIndex((item) => item.index === currentDaYun.index) : 0;
  if (currentIndex < 0) {
    currentIndex = 0;
  }

  const patternDelta = patternLevel === "高" ? 2 : patternLevel === "低" ? -2 : 0;
  const phaseDefs: Array<{ phase: DaYunInsight["phase"]; idx: number }> = [
    { phase: "上一运", idx: currentIndex - 1 },
    { phase: "当前运", idx: currentIndex },
    { phase: "下一运", idx: currentIndex + 1 }
  ];

  return phaseDefs
    .filter((item) => item.idx >= 0 && item.idx < daYunList.length)
    .map(({ phase, idx }) => {
      const item = daYunList[idx];
      const role = roleFromDaYun(item.ganZhi, dayElement);
      const focus = focusByRole[role];
      const focusMetric = metricValue(metrics, focus, yearlyScore);
      const score = clamp(
        Math.round(yearlyScore + roleScoreDelta[role] + phaseDelta[phase] + patternDelta + (focusMetric - 70) / 6),
        35,
        95
      );

      return {
        phase,
        ganZhi: item.ganZhi,
        range: `${item.startYear}-${item.endYear}（${item.startAge}-${item.endAge}岁）`,
        focus,
        score,
        opportunity: opportunityByRole[role],
        risk: riskByRole[role],
        strategy: strategyByRole[role]
      };
    });
}

function buildPeachBlossomReport(
  shenshaFlags: Record<ShenShaName, boolean>,
  tenGodSummary: { officer: number; wealth: number; resource: number; output: number; peer: number },
  relationMetric: number,
  liuYue: LiuYueItem[],
  liuZhou: LiuZhouItem[]
): TopicReport {
  const base =
    relationMetric +
    (shenshaFlags.桃花 ? 12 : 0) +
    tenGodSummary.output * 1.8 +
    tenGodSummary.peer * 1.1 -
    tenGodSummary.officer * 0.6;
  const score = clamp(Math.round(base), 35, 95);
  const level = scoreLevel(score);
  const topWeeks = [...liuZhou]
    .sort((a, b) => b.score - a.score)
    .slice(0, 1)
    .map((item) => `周窗口${item.weekLabel}`);

  const summary =
    level === "高"
      ? "情感互动与吸引力窗口明显，适合主动拓展优质连接。"
      : level === "中"
        ? "桃花势能中等，重质量胜过重数量。"
        : "桃花势能偏弱，建议先稳住节奏和边界，优先提升自身稳定性。";

  const suggestions =
    level === "高"
      ? [
          "社交密度提升时优先筛选价值观匹配对象，避免关系噪声。",
          "高热度阶段不宜过快承诺，留出观察周期。",
          "把关键见面安排在精力最好的时间段，提高判断质量。"
        ]
      : level === "中"
        ? [
            "优先通过共同目标和长期合作建立关系信任。",
            "减少无效社交，维持每周稳定的高质量沟通频次。",
            "对关键关系建立明确边界，降低误解和消耗。"
          ]
      : [
          "先做作息与情绪管理，避免低状态下做关系决策。",
          "通过学习圈、兴趣圈拓展连接，不强求短期结果。",
          "把关系目标拆成小步行动，保持连续性。"
        ];

  return {
    score,
    level,
    summary,
    windows: [...topMonthWindows(liuYue, 2), ...topWeeks],
    suggestions
  };
}

function buildWealthReport(
  shenshaFlags: Record<ShenShaName, boolean>,
  tenGodSummary: { officer: number; wealth: number; resource: number; output: number; peer: number },
  wealthMetric: number,
  liuNian: LiuNianItem[]
): TopicReport {
  const trend = summarizeTrend(liuNian);
  const trendDelta = trend === "上升" ? 3 : trend === "回落" ? -3 : 0;
  const base =
    wealthMetric +
    tenGodSummary.wealth * 2.2 +
    tenGodSummary.output * 1.1 -
    tenGodSummary.peer * 1.2 +
    (shenshaFlags.天乙贵人 ? 2 : 0) +
    trendDelta;
  const score = clamp(Math.round(base), 35, 95);
  const level = scoreLevel(score);

  const summary =
    level === "高"
      ? `财运处于可进攻区间，未来走势${trend}，适合“控风险下扩增量”。`
      : level === "中"
        ? `财运处于稳健区间，未来走势${trend}，关键是提升决策命中率。`
        : `财运处于修复区间，未来走势${trend}，应优先守住现金流安全线。`;

  const suggestions =
    level === "高"
      ? [
          "把收入分为“稳定盘+增长盘”，避免单一来源波动。",
          "高分年份做结构性投入，低分年份控制杠杆与扩张节奏。",
          "每月复盘一次投入产出比，及时关闭低效率项目。"
        ]
      : level === "中"
        ? [
            "先做预算与资金分层，再做新增配置。",
            "把变现路径标准化，减少临时决策成本。",
            "建立止损机制，避免情绪化追涨追高。"
          ]
      : [
          "优先压缩非必要开支，先稳定现金流。",
          "将大决策拆为小试错，控制单次损失上限。",
          "把精力集中在确定性较高的主业和核心项目。"
        ];

  return {
    score,
    level,
    summary,
    windows: topYearWindows(liuNian, 3),
    suggestions
  };
}

function buildRelationshipReport(
  shenshaFlags: Record<ShenShaName, boolean>,
  tenGodSummary: { officer: number; wealth: number; resource: number; output: number; peer: number },
  relationMetric: number,
  liuYue: LiuYueItem[]
): TopicReport {
  const base =
    relationMetric +
    (shenshaFlags.天乙贵人 ? 6 : 0) +
    (shenshaFlags.文昌 ? 4 : 0) +
    tenGodSummary.resource * 1.3 -
    tenGodSummary.peer * 0.8;
  const score = clamp(Math.round(base), 35, 95);
  const level = scoreLevel(score);

  const summary =
    level === "高"
      ? "人际协同势能强，适合主动整合资源与跨团队合作。"
      : level === "中"
        ? "人际势能稳定，关键在于沟通节奏和边界管理。"
        : "人际势能偏弱，建议先减少消耗型关系，重建信任资产。";

  const suggestions =
    level === "高"
      ? [
          "明确合作角色分工，放大协同效率。",
          "关键合作采用书面共识，减少执行偏差。",
          "主动维护核心人脉的长期互惠关系。"
        ]
      : level === "中"
        ? [
            "优先深耕少量高价值关系，避免广撒网。",
            "重要沟通提前准备目标和底线，减少误解。",
            "冲突出现时先对齐事实，再讨论立场。"
          ]
      : [
          "先降低无效社交频率，保护注意力和情绪预算。",
          "从小协作任务开始重建信任与反馈循环。",
          "保持稳定回应节奏，逐步恢复他人预期。"
        ];

  return {
    score,
    level,
    summary,
    windows: topMonthWindows(liuYue, 3),
    suggestions
  };
}

function buildMasterNarrative(
  dayMaster: string,
  strengthText: string,
  patternName: string,
  patternLevel: "高" | "中" | "低",
  monthlyFocus: MetricName,
  currentAge: number,
  bestMonth: LiuYueItem | undefined,
  shenshaText: string,
  daYunInsights: DaYunInsight[],
  tenGodSummary: { officer: number; wealth: number; resource: number; output: number; peer: number },
  topicReports: {
    peachBlossom: TopicReport;
    wealth: TopicReport;
    relationship: TopicReport;
  },
  calibration: TimeCalibration
): MasterNarrative {
  const currentPhase = daYunInsights.find((item) => item.phase === "当前运") || daYunInsights[0];
  const dayunDigest = daYunInsights.length
    ? daYunInsights
        .map(
          (item) =>
            `${item.phase}${item.ganZhi}（${item.range}）主线在${item.focus}，先看${item.opportunity}再防${item.risk}`
        )
        .join("；")
    : "当前大运信息尚不完整，建议先用近三个月的事件复盘来校准盘感。";

  const peachWindows = topicReports.peachBlossom.windows.length ? topicReports.peachBlossom.windows.join("、") : "近期窗口偏内敛";
  const wealthWindows = topicReports.wealth.windows.length ? topicReports.wealth.windows.join("、") : "先以稳健经营为主";
  const relationWindows = topicReports.relationship.windows.length ? topicReports.relationship.windows.join("、") : "先做关系清理再扩展";
  const patternTone = patternLevel === "高" ? "格局清晰、势能集中" : patternLevel === "中" ? "格局成形、可稳步放大" : "格局尚在打底、宜守中求进";
  const bestMonthShort = bestMonth ? `${bestMonth.monthLabel}（${bestMonth.ganZhi}）` : "顺势窗口月";
  const hasNoble = shenshaText.includes("天乙贵人");
  const wealthDigest =
    tenGodSummary.wealth >= tenGodSummary.output
      ? "财星偏旺而食神稍敛，宜先立财纲再谈扩张"
      : "食神有力可生财，宜先做价值输出再承接财源";
  const relationDigest =
    tenGodSummary.peer >= tenGodSummary.resource
      ? "比劫较显，关系中要先立边界再谈亲密"
      : "印星偏和，关系中更易以包容与共识化解冲克";

  const parentCareerHint =
    tenGodSummary.officer + tenGodSummary.resource >= tenGodSummary.wealth + tenGodSummary.output
      ? "家庭中至少一位照料者通常更重规则与稳定路径，常见为体制内或大型组织风格。"
      : "家庭中至少一位照料者通常更重市场效率与结果，常见为体制外或经营型风格。";
  const parentRelationHint =
    tenGodSummary.peer > tenGodSummary.resource
      ? "父母或家庭沟通里更容易出现观点碰撞，你小时候可能较早学会自我保护与独立表达。"
      : "家庭基调偏支持与托底，小时候更容易获得情绪安抚和持续鼓励。";
  const studyModeHint =
    tenGodSummary.resource >= tenGodSummary.output
      ? "学习方式更适合“先搭框架、后做题巩固”，遇到好老师时成绩通常会有台阶式提升。"
      : "理解与表达更有灵气，兴趣学科容易拉开优势，但对重复刷题的耐受度偏低。";
  const examPressureHint =
    tenGodSummary.officer >= tenGodSummary.peer
      ? "对排名与评价较敏感，容易把“被认可”作为阶段目标，考前会有明显压力感。"
      : "更在意自主节奏与自我表达，若外部管束过强，容易出现阶段性逆反或拖延。";
  const ageStageLabel =
    currentAge <= 18
      ? "基础教育与人格定型期"
      : currentAge <= 25
        ? "升学就业转换期"
        : currentAge <= 35
          ? "职业建立与结构成长期"
          : currentAge <= 45
            ? "事业放大与责任加深期"
            : "稳盘回报与影响力沉淀期";

  const currentPhaseText = currentPhase
    ? `${currentPhase.phase}${currentPhase.ganZhi}（${currentPhase.range}）`
    : "当前运势阶段";
  const nextPhase = daYunInsights.find((item) => item.phase === "下一运");
  const path1825Hint =
    tenGodSummary.resource + tenGodSummary.officer >= tenGodSummary.wealth + tenGodSummary.output
      ? "18-22岁更容易走“升学/考证/门槛型机会”路径，22-25岁会经历一次现实校准，逐步从“被安排”转向“主动选择”。"
      : "18-22岁更容易走“实战/就业/项目驱动”路径，22-25岁会出现能力升级需求，一边做事一边补方法论与证书更有利。";
  const currentAgeAdvice =
    currentAge <= 25
      ? "你当前最重要的不是立刻证明自己，而是把可迁移能力做深：表达、协作、交付、复盘。"
      : currentAge <= 35
        ? "你当前最重要的是定主赛道并连续深耕，把“会做事”升级为“可复制地带团队做成事”。"
        : currentAge <= 45
          ? "你当前最重要的是平衡扩张与健康，把业务增长放在流程与组织能力之上。"
          : "你当前最重要的是稳现金流与身心节律，把经验转成可传承的方法体系。";
  const nextPhaseAdvice = nextPhase
    ? `下一运${nextPhase.ganZhi}主线落在${nextPhase.focus}，建议提前一年做资源预排：保留现金与时间缓冲，把关键合作放进顺势窗口。`
    : "下一运信息暂不完整，建议先按年度窗口做滚动复盘与策略微调。";

  const dominant = [
    { key: "官杀", value: tenGodSummary.officer },
    { key: "财星", value: tenGodSummary.wealth },
    { key: "印星", value: tenGodSummary.resource },
    { key: "食伤", value: tenGodSummary.output },
    { key: "比劫", value: tenGodSummary.peer }
  ].sort((a, b) => b.value - a.value)[0]?.key || "比劫";

  const mbti =
    dominant === "官杀"
      ? "ESTJ"
      : dominant === "财星"
        ? "ENTJ"
        : dominant === "印星"
          ? "INTJ"
          : dominant === "食伤"
            ? "ENFJ"
            : "ISTJ";

  const personalityReport = [
    "【性格简述】",
    `命主以${dayMaster}日主为核心，命局呈现${strengthText}，格局为「${patternName}」（${patternLevel}），整体呈现${patternTone}。古法有云：五行贵流通，阴阳重平衡。您这张盘的主气不在浮华，而在稳步生发，重视可落地、可交付、可复盘的结果。`,
    `从命盘节奏看，您不是“靠爆发吃饭”的类型，而是“先压实基本盘，再逐步放大成果”的类型；当行动主线对齐${monthlyFocus}后，整体效率和稳定度会明显提升。`,
    "【性格优点】",
    `坚韧务实，抗压性强：面对复杂任务能守住节奏，不轻易自乱阵脚，遇到阻力时更倾向于拆解问题并持续推进。`,
    `独立担当，执行到位：比劫与主观能量不弱，遇到关键节点愿意扛责任、做决断，不会长期停留在“等别人拍板”的状态。`,
    `外柔内稳，善于谋定后动：表面沟通克制，但对目标和边界有清晰判断，关键时点会体现出强执行和资源整合能力。`,
    "【性格缺点】",
    `容易固守路径，不愿轻易换轨：当既定方案已经投入较多时，可能出现“继续加码”而非及时止损的倾向。`,
    `高标准带来自我压力：对成果质量要求高，容易把外部压力内化为长期紧绷感，阶段性会出现“做得多、放松少”的状态。`,
    `关系里偶有慢热与防御：在没有充分信任前，表达会偏保留，容易被外界误读为“距离感强”或“不易亲近”。`,
    "【做事风格（工作表现）】",
    `善于在压力中找抓手：尤其在${bestMonthShort}这类天干地支顺势窗口，若把资源集中在一个核心任务上，推进效率会明显高于多线并行。`,
    `偏好先建规则再扩规模：您更适合先沉淀流程、指标和复盘机制，再做团队或项目扩张，这种打法更能体现长期竞争力。`,
    "【金钱观】",
    `重视积累与可控增长：财运整体处于${topicReports.wealth.level}势，更适合“预算先行、风控前置、稳步放大”的经营型路径。`,
    `追求收益但不盲目冒险：${wealthDigest}。对收益有追求，但会在关键动作前评估成本与下行风险；把规则立稳后，财富曲线通常更平滑、更可持续。`,
    "【爱情观】",
    `偏向长期稳定关系：桃花整体处于${topicReports.peachBlossom.level}势，更看重价值观、责任感和长期协同，而不是短期情绪刺激。`,
    `慢热但重承诺：确认关系后投入度高，愿意在现实层面给支持与承担；建议在窗口期（${peachWindows}）多做高质量沟通，少做情绪化判断。遇冲克之月先缓言、后决断，可避口舌之耗。`,
    "【成长轨迹推演（7-18岁）】",
    `从社会化路径看，7-12岁阶段你更可能在“规矩与安全感”之间寻找平衡。${parentCareerHint}${parentRelationHint}`,
    `进入13-18岁（初高中）后，你在学业上的体验往往与家庭期待强绑定。${studyModeHint}${examPressureHint} 若当年遇到合冲较重之岁，容易出现“努力很多但情绪起伏也大”的阶段。`,
    "【成长轨迹推演（18-25岁）】",
    `${path1825Hint} 这一阶段你最在乎的核心议题，多半是“我是谁、我值不值、我该往哪条路持续投入”。`,
    `若关系与原生家庭议题未被看见，18-25岁常会出现“外表能扛、内心很累”的体验；建议把自我价值从“结果一次定输赢”改成“长期复利的成长曲线”。`,
    "【当前年龄定位与未来大运建议】",
    `你当前实龄约${currentAge}岁，处在「${ageStageLabel}」。命盘主轴仍是${currentPhaseText}，请把注意力优先放在${currentPhase ? currentPhase.focus : monthlyFocus}主线。`,
    `${currentAgeAdvice} ${nextPhaseAdvice}`,
    "【给外人的感受】",
    `初次接触往往会被评价为稳重、可靠、有分寸。随着深入合作，别人会更明显感受到您在目标管理、问题拆解和资源落地上的专业度。${hasNoble ? "盘中有贵人之象，关键节点常能得人提携。" : "贵人之缘在后发，先修内功则后有相助。"}`
    ,
    "【潜在MBTI性格】",
    `综合命盘主导能量，您的潜在MBTI更接近 ${mbti} 类型：重目标、重结构、重执行，擅长把抽象目标转成阶段动作并持续推进。`,
    `命理不是给人贴死标签，而是提示“优势放大路径”。若持续优化表达弹性与情绪恢复节奏，您的优势会更完整地兑现。`,
    "【吉言寓意】",
    `愿你守正得时，顺势有为；愿你所行皆稳，所求有应，福随心定而来。`
  ].join("\n");

  return {
    overall: personalityReport,
    dayun:
      `大运是你十年尺度的“底盘风向”，流年流月只是其上的波动。当前盘面显示：${dayunDigest}。` +
      `其中${currentPhase ? `${currentPhase.phase}${currentPhase.ganZhi}` : "当前阶段"}是你近年的主战场，判断标准不应只看短期结果，而要看是否沿着该阶段主线持续累积。` +
      `若你感到阶段性阻滞，往往不是运势本身失效，而是行动路径偏离了大运给出的发力点。`,
    peach:
      `桃花层面整体为${topicReports.peachBlossom.level}势，主判断是：${topicReports.peachBlossom.summary}` +
      `重点窗口在${peachWindows}。这类盘不怕“没人”，怕的是“关系噪声太多”。` +
      `建议把情感与社交的筛选标准提前写清楚，把互动节奏放慢半拍，先看长期价值观与稳定性，再谈深度投入。`,
    wealth:
      `财运层面整体为${topicReports.wealth.level}势，主判断是：${topicReports.wealth.summary}` +
      `重点年份窗口在${wealthWindows}。${wealthDigest}。你的财运不是“偏财暴冲型”，而更接近“结构经营型”：` +
      `先立规则（预算、止损、仓位），再谈放大（项目、合作、扩张），这样既能吃到上行，又能在回撤期守住底线。`,
    relationship:
      `人际协同层面整体为${topicReports.relationship.level}势，主判断是：${topicReports.relationship.summary}` +
      `重点月份窗口在${relationWindows}。${relationDigest}。这张盘的人际关键，不在“认识更多人”，而在“把正确关系经营成长期资产”。` +
      `遇到冲突时，先对齐事实与边界，再谈情绪与立场，反而更容易把关系从消耗型转成协同型。`,
    closing:
      `最后给你一句命理师口吻的落点：盘是天时，事是人做。` +
      `你已完成时区与真太阳时校正（${calibration.correctedSolarTime}），这意味着基准盘的时间误差已被收敛；` +
      `后续成败的分水岭，不在“有没有机会”，而在“是否按大运主线做连续、可复盘、可迭代的行动”。` +
      `守住节奏，你这张盘是有后劲、能见长期回报的。` +
      `愿你气顺心明，步步逢机，终得厚积而发。`
  };
}

export function generateBaziResult(input: BirthInput): BaziResult {
  const birthContext = parseBirthContext(input);
  const { year, month, day, hour, minute } = birthContext.corrected;

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const eight = lunar.getEightChar();
  const genderFlag = inferGenderFlag(input.gender);
  const yun = eight.getYun(genderFlag, 2);

  const yearHide = toArray(eight.getYearHideGan());
  const monthHide = toArray(eight.getMonthHideGan());
  const dayHide = toArray(eight.getDayHideGan());
  const timeHide = toArray(eight.getTimeHideGan());

  const yearShiShenZhi = toArray(eight.getYearShiShenZhi());
  const monthShiShenZhi = toArray(eight.getMonthShiShenZhi());
  const dayShiShenZhi = toArray(eight.getDayShiShenZhi());
  const timeShiShenZhi = toArray(eight.getTimeShiShenZhi());

  const dayMaster = eight.getDayGan();
  const dayElement = STEM_ELEMENT[dayMaster] || "土";
  const resourceElement = reverseMapValue(PRODUCE_MAP, dayElement);
  const controlByElement = reverseMapValue(CONTROL_MAP, dayElement);

  const elementCount: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  const visibleStems = [eight.getYearGan(), eight.getMonthGan(), eight.getDayGan(), eight.getTimeGan()];
  visibleStems.forEach((stem) => {
    const element = STEM_ELEMENT[stem];
    if (element) {
      elementCount[element] += 1.15;
    }
  });

  [yearHide, monthHide, dayHide, timeHide].flat().forEach((stem) => {
    const element = STEM_ELEMENT[stem];
    if (element) {
      elementCount[element] += 0.56;
    }
  });

  const tenGodCount = makeTenGodCounter();
  [
    eight.getYearShiShenGan(),
    eight.getMonthShiShenGan(),
    eight.getTimeShiShenGan(),
    ...yearShiShenZhi,
    ...monthShiShenZhi,
    ...dayShiShenZhi,
    ...timeShiShenZhi
  ].forEach((item, index) => {
    const weight = index < 3 ? 1 : 0.82;
    incTenGod(tenGodCount, item, weight);
  });

  const tenGodSummary = {
    officer: tenGodCount["正官"] + tenGodCount["七杀"],
    wealth: tenGodCount["正财"] + tenGodCount["偏财"],
    resource: tenGodCount["正印"] + tenGodCount["偏印"],
    output: tenGodCount["食神"] + tenGodCount["伤官"],
    peer: tenGodCount["比肩"] + tenGodCount["劫财"]
  };

  const mean = (elementCount.木 + elementCount.火 + elementCount.土 + elementCount.金 + elementCount.水) / 5;
  const variance =
    ((elementCount.木 - mean) ** 2 +
      (elementCount.火 - mean) ** 2 +
      (elementCount.土 - mean) ** 2 +
      (elementCount.金 - mean) ** 2 +
      (elementCount.水 - mean) ** 2) /
    5;

  const shenshaFlags = detectShensha(eight);
  const ruleOutput = runRuleEngine({
    dayElement,
    elementCount,
    tenGod: tenGodSummary,
    variance,
    shenshaFlags
  });

  const metricRank = [...ruleOutput.radarMetrics]
    .sort((a, b) => b.value - a.value)
    .map((item) => item.label);
  const monthlyFocus = ruleOutput.monthlyFocus;

  const daYunRawList = yun.getDaYun(9).slice(1);
  const daYunList: DaYunItem[] = daYunRawList.map((item: any, index: number) => ({
    index: index + 1,
    ganZhi: item.getGanZhi(),
    startYear: item.getStartYear(),
    endYear: item.getEndYear(),
    startAge: item.getStartAge(),
    endAge: item.getEndAge()
  }));

  const currentYear = new Date().getFullYear();
  const currentDaYun = daYunList.find((item) => currentYear >= item.startYear && currentYear <= item.endYear) || null;

  const yearlyScore = clamp(
    Math.round(ruleOutput.radarMetrics.reduce((sum, item) => sum + item.value, 0) / ruleOutput.radarMetrics.length),
    35,
    95
  );

  const liuNian = buildLiuNian(
    daYunRawList,
    daYunList,
    yearlyScore,
    dayElement,
    resourceElement,
    controlByElement,
    birthContext.birthYearForAge
  );

  const liuYue = buildLiuYueForYear(
    daYunRawList,
    currentYear,
    yearlyScore,
    dayElement,
    ruleOutput.pattern.level,
    ruleOutput.shensha.active.length
  );
  const liuYuePool = [
    ...buildLiuYueForYear(
      daYunRawList,
      currentYear - 1,
      yearlyScore,
      dayElement,
      ruleOutput.pattern.level,
      ruleOutput.shensha.active.length
    ),
    ...liuYue,
    ...buildLiuYueForYear(
      daYunRawList,
      currentYear + 1,
      yearlyScore,
      dayElement,
      ruleOutput.pattern.level,
      ruleOutput.shensha.active.length
    )
  ];
  const liuZhou = buildLiuZhou(liuYuePool, ruleOutput.pattern.level, ruleOutput.shensha.active.length);

  const timeline = liuNian.map((item) => ({
    label: String(item.year),
    score: item.score,
    theme: item.theme
  }));

  const summary = toSummary(
    ruleOutput.strengthLabel,
    monthlyFocus,
    currentDaYun ? currentDaYun.ganZhi : "起运前后",
    ruleOutput.pattern.summary
  );

  const shenshaText = ruleOutput.shensha.active.length ? ruleOutput.shensha.active.join("、") : "无明显神煞触发";
  const bestMonth = [...liuYue].sort((a, b) => b.score - a.score)[0];
  const relationMetric = metricValue(ruleOutput.radarMetrics, "关系", yearlyScore);
  const wealthMetric = metricValue(ruleOutput.radarMetrics, "财务", yearlyScore);

  const daYunInsights = buildDaYunInsights(
    daYunList,
    currentDaYun,
    dayElement,
    yearlyScore,
    ruleOutput.pattern.level,
    ruleOutput.radarMetrics
  );
  const peachBlossomReport = buildPeachBlossomReport(shenshaFlags, tenGodSummary, relationMetric, liuYue, liuZhou);
  const wealthReport = buildWealthReport(shenshaFlags, tenGodSummary, wealthMetric, liuNian);
  const relationshipReport = buildRelationshipReport(shenshaFlags, tenGodSummary, relationMetric, liuYue);
  const masterNarrative = buildMasterNarrative(
    dayMaster,
    `${ruleOutput.strengthLabel}（${ruleOutput.strengthScore}）`,
    ruleOutput.pattern.name,
    ruleOutput.pattern.level,
    monthlyFocus,
    calcCurrentAge(birthContext.corrected),
    bestMonth,
    shenshaText,
    daYunInsights,
    tenGodSummary,
    {
      peachBlossom: peachBlossomReport,
      wealth: wealthReport,
      relationship: relationshipReport
    },
    birthContext.calibration
  );

  const suggestions = [
    `校正后出生时刻为 ${birthContext.calibration.correctedSolarTime}，主格局“${ruleOutput.pattern.name}”（${ruleOutput.pattern.level}）。`,
    `用神建议：${ruleOutput.usefulElements.join("、")}；神煞命中：${shenshaText}。`,
    `今年流月高点在${bestMonth.monthLabel}（${bestMonth.ganZhi}），建议把关键行动聚焦在“${monthlyFocus}”方向。`
  ];

  return {
    pillars: {
      year: eight.getYear(),
      month: eight.getMonth(),
      day: eight.getDay(),
      hour: eight.getTime()
    },
    dayMaster,
    summary,
    profileTags: buildProfileTags(metricRank),
    yearlyScore,
    monthlyFocus,
    suggestions,
    radarMetrics: ruleOutput.radarMetrics,
    timeline,
    liuYue,
    liuZhou,
    tenGods: {
      yearGan: eight.getYearShiShenGan(),
      monthGan: eight.getMonthShiShenGan(),
      dayGan: eight.getDayShiShenGan(),
      timeGan: eight.getTimeShiShenGan(),
      yearZhi: yearShiShenZhi,
      monthZhi: monthShiShenZhi,
      dayZhi: dayShiShenZhi,
      timeZhi: timeShiShenZhi
    },
    chartExtra: {
      mingGong: eight.getMingGong(),
      shenGong: eight.getShenGong(),
      taiYuan: eight.getTaiYuan(),
      strength: `${ruleOutput.strengthLabel}（${ruleOutput.strengthScore}）`,
      usefulElements: ruleOutput.usefulElements
    },
    timeCalibration: birthContext.calibration,
    ruleTrace: {
      configVersion: ruleOutput.configVersion,
      mainPattern: ruleOutput.pattern,
      shensha: ruleOutput.shensha
    },
    daYunInsights,
    topicReports: {
      peachBlossom: peachBlossomReport,
      wealth: wealthReport,
      relationship: relationshipReport
    },
    masterNarrative,
    daYun: {
      startSolar: yun.getStartSolar().toYmd(),
      isForward: yun.isForward(),
      current: currentDaYun,
      list: daYunList
    },
    liuNian
  };
}
