import { BaziResult, BirthInput, MetricName, TimelinePoint } from "../types";

const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const tags = ["执行力", "洞察力", "贵人运", "学习力", "稳健财运", "表达力", "组织力", "抗压性"];
const focusPool: MetricName[] = ["事业", "财务", "关系", "成长", "健康"];
const summaryPool = [
  "你的命盘呈现“先稳后进”的节奏，适合在清晰目标下做持续积累型突破。",
  "整体格局偏向“厚积薄发”，前期打基础，关键窗口在中后段出现。",
  "今年更适合做结构化成长，减少临时性决策，收益会更稳定。"
];
const advicePool = [
  "把今年目标压缩到 2 个主线项目，避免分散精力。",
  "每周固定 2 小时做复盘，关注投入产出比最高的任务。",
  "重要决策前预留 24 小时冷静期，降低情绪驱动风险。",
  "把支出按“必要/成长/弹性”三类记账，优先稳现金流。",
  "主动维护 3 位关键关系，长期会形成明显支持网络。",
  "设一个“止损阈值”，超过阈值的方向及时调整而不是硬扛。"
];
const themes = ["布局", "协同", "聚焦", "修正", "突破", "沉淀", "扩张", "守成"];
const radarLabels: MetricName[] = ["事业", "财务", "关系", "成长", "健康"];
const DAY_MS = 24 * 60 * 60 * 1000;

function hashSeed(input: BirthInput): number {
  const raw = `${input.name}|${input.gender}|${input.birthDate}|${input.birthTime}|${input.birthCity}|${input.timezone}|${input.longitude}`;
  let h = 0;
  for (let i = 0; i < raw.length; i += 1) {
    h = (h * 131 + raw.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(arr: T[], seed: number, offset: number): T {
  return arr[(seed + offset * 13) % arr.length];
}

function pillar(seed: number, offset: number): string {
  return `${pick(stems, seed, offset)}${pick(branches, seed, offset * 5)}`;
}

function clampScore(value: number): number {
  return Math.max(38, Math.min(95, value));
}

function inferAgeFromBirthDate(birthDate: string): number {
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return 28;
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const now = new Date();
  let age = now.getFullYear() - y;
  const beforeBirthday = now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeBirthday) {
    age -= 1;
  }
  return Math.max(0, Math.min(120, age));
}

function makeTimeline(seed: number): TimelinePoint[] {
  const currentYear = new Date().getFullYear();
  const points: TimelinePoint[] = [];

  for (let i = 0; i < 6; i += 1) {
    const year = currentYear + i;
    const shifted = (seed >>> (i % 5)) & 0xff;
    const score = clampScore(48 + (shifted % 46) + (i % 2 === 0 ? 3 : -2));
    points.push({
      label: String(year),
      score,
      theme: pick(themes, seed, i + 1)
    });
  }

  return points;
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

function getWeekOfMonth(weekStart: Date, year: number, month: number): number {
  const monthStart = new Date(year, month - 1, 1);
  const monthFirstWeekStart = startOfIsoWeek(monthStart);
  const diffWeeks = Math.floor((weekStart.getTime() - monthFirstWeekStart.getTime()) / (7 * DAY_MS));
  return Math.max(1, diffWeeks + 1);
}

export function generateMockResult(input: BirthInput): BaziResult {
  const seed = hashSeed(input);
  const currentAge = inferAgeFromBirthDate(input.birthDate);
  const timeline = makeTimeline(seed);
  const yearlyScore = Math.round(timeline.reduce((sum, item) => sum + item.score, 0) / timeline.length);
  const currentYear = new Date().getFullYear();

  const liuYue = Array.from({ length: 12 }, (_, idx) => {
    const score = clampScore(48 + (((seed >>> (idx % 5)) & 0xff) % 42) + (idx % 3 === 0 ? 4 : -1));
    return {
      year: currentYear,
      monthIndex: idx + 1,
      monthLabel: `${idx + 1}月`,
      ganZhi: `${pick(stems, seed, idx + 1)}${pick(branches, seed, idx + 5)}`,
      score,
      theme: pick(themes, seed, idx + 1)
    };
  });

  const liuYueMap = new Map<string, (typeof liuYue)[number]>();
  liuYue.forEach((item) => {
    liuYueMap.set(`${item.year}-${item.monthIndex}`, item);
  });

  const weekStart0 = startOfIsoWeek(new Date());
  const liuZhou = Array.from({ length: 12 }, (_, idx) => {
    const weekStart = addDays(weekStart0, idx * 7);
    const weekEnd = addDays(weekStart, 6);
    const weekCenter = addDays(weekStart, 3);
    const focusYear = weekCenter.getFullYear();
    const focusMonth = weekCenter.getMonth() + 1;
    const weekOfMonth = getWeekOfMonth(weekStart, focusYear, focusMonth);
    const weekShift = [2, 0, -1, 1, 0][(weekOfMonth - 1) % 5];

    const monthItem = liuYueMap.get(`${focusYear}-${focusMonth}`) || liuYue[(focusMonth - 1 + 12) % 12];
    const score = clampScore(
      monthItem.score * 0.94 + weekShift + (weekOfMonth === 1 ? 1 : weekOfMonth === 3 ? -1 : 0)
    );

    return {
      sequence: idx + 1,
      year: focusYear,
      monthIndex: focusMonth,
      weekOfMonth,
      weekLabel: toWeekLabel(weekStart, weekEnd),
      monthGanZhi: monthItem.ganZhi,
      score,
      theme: pick(themes, seed, idx + 2)
    };
  });

  const radarMetrics = radarLabels.map((label, idx) => {
    const base = timeline[idx % timeline.length].score;
    const delta = ((seed >>> (idx + 2)) & 0x0f) - 5;
    return {
      label,
      value: clampScore(base + delta)
    };
  });

  const liuNian = timeline.map((item, idx) => ({
    year: Number(item.label),
    age: 25 + idx,
    ganZhi: `${pick(stems, seed, idx + 1)}${pick(branches, seed, idx + 2)}`,
    daYun: idx < 3 ? "庚午" : "己巳",
    score: item.score,
    theme: item.theme
  }));

  const daYunList = [
    {
      index: 2,
      ganZhi: "辛未",
      startYear: currentYear - 12,
      endYear: currentYear - 3,
      startAge: 15,
      endAge: 24
    },
    {
      index: 3,
      ganZhi: "庚午",
      startYear: currentYear - 2,
      endYear: currentYear + 7,
      startAge: 25,
      endAge: 34
    },
    {
      index: 4,
      ganZhi: "己巳",
      startYear: currentYear + 8,
      endYear: currentYear + 17,
      startAge: 35,
      endAge: 44
    }
  ];

  const daYunInsights = [
    {
      phase: "上一运" as const,
      ganZhi: daYunList[0].ganZhi,
      range: `${daYunList[0].startYear}-${daYunList[0].endYear}（${daYunList[0].startAge}-${daYunList[0].endAge}岁）`,
      focus: "成长" as const,
      score: 67,
      opportunity: "学习与能力积累窗口较强，适合打基础。",
      risk: "行动转化速度偏慢，容易准备过度。",
      strategy: "把学习结果绑定到可交付项目，避免空转。"
    },
    {
      phase: "当前运" as const,
      ganZhi: daYunList[1].ganZhi,
      range: `${daYunList[1].startYear}-${daYunList[1].endYear}（${daYunList[1].startAge}-${daYunList[1].endAge}岁）`,
      focus: "财务" as const,
      score: 75,
      opportunity: "变现和资源整合效率提升，适合做规模化尝试。",
      risk: "扩张过快会带来现金流压力。",
      strategy: "先做预算和止损线，再逐步放大投入规模。"
    },
    {
      phase: "下一运" as const,
      ganZhi: daYunList[2].ganZhi,
      range: `${daYunList[2].startYear}-${daYunList[2].endYear}（${daYunList[2].startAge}-${daYunList[2].endAge}岁）`,
      focus: "事业" as const,
      score: 71,
      opportunity: "组织协同能力提升，适合做系统化管理。",
      risk: "责任增加可能带来精力透支。",
      strategy: "提前建立流程模板和授权机制，降低管理负担。"
    }
  ];

  const topicReports = {
    peachBlossom: {
      score: 72,
      level: "中" as const,
      summary: "桃花势能中等，适合用高质量互动提升关系确定性。",
      windows: [...liuYue.slice(0, 2).map((item) => `${item.monthLabel}(${item.ganZhi})`), `周窗口${liuZhou[0].weekLabel}`],
      suggestions: [
        "优先选择价值观匹配的连接对象，不追求数量。",
        "在互动前明确边界和预期，减少误解。",
        "保持稳定沟通节奏，建立信任复利。"
      ]
    },
    wealth: {
      score: 76,
      level: "中" as const,
      summary: "财务处于稳健向上区间，适合“先稳现金流再做增长”。",
      windows: liuNian.slice(0, 3).map((item) => `${item.year}年(${item.ganZhi})`),
      suggestions: [
        "收入做稳定盘和增长盘分层管理。",
        "把预算和止损规则前置，降低波动风险。",
        "每月复盘一次投入产出比，及时收敛低效项目。"
      ]
    },
    relationship: {
      score: 74,
      level: "中" as const,
      summary: "人际协同势能稳中有升，关键在于边界和沟通质量。",
      windows: liuYue.slice(2, 5).map((item) => `${item.monthLabel}(${item.ganZhi})`),
      suggestions: [
        "优先深耕核心关系，减少无效社交。",
        "重要合作采用书面共识，降低执行偏差。",
        "冲突场景先对齐事实，再讨论立场。"
      ]
    }
  };
  const masterNarrative = {
    overall:
      [
        "【性格简述】",
        "命主这张盘属于“稳中见势”的结构，表面不张扬，但内里有持续积累后的放大力，做事偏务实、偏结果导向。古法讲五行相生为吉，阴阳得中为贵；天干地支若合则势顺，若冲则先守后攻，此盘正是先稳后发之象。",
        "【性格优点】",
        "坚韧务实，执行稳定：面对压力和复杂任务时，能守住节奏并持续推进，不轻易半途而废。",
        "独立担当，目标感强：在关键节点愿意承担责任，能够把抽象目标拆成可执行步骤。",
        "【性格缺点】",
        "有时过于坚持己见：当已经投入较多时，不容易快速换轨，需要主动引入复盘和外部反馈。",
        "压力内化倾向明显：容易把标准拉高到长期紧绷，需留意工作与恢复节奏平衡。",
        "【做事风格（工作表现）】",
        "更擅长先搭框架再扩规模，适合在流程和规则明确后放大产出，长期效率更高。",
        "【金钱观】",
        "偏向稳健经营，重视现金流和风险控制；先守底线再做增长，财务走势更可持续。",
        "【爱情观】",
        "偏向长期稳定关系，慢热但重承诺，重视责任、价值观与现实协同。",
        "【成长轨迹推演（7-18岁）】",
        "7-12岁通常更在意“被理解和被肯定”，会对家庭氛围的稳定度非常敏感。若父母沟通风格偏强，孩子会更早学会察言观色与自我防御。",
        "13-18岁常见表现是：在成绩、比较、自我认同之间反复拉扯。你更可能在“先建立方法、再稳定输出”时成绩起色明显，而不是靠短期硬冲。",
        "【成长轨迹推演（18-25岁）】",
        "18-22岁阶段更像“方向试错期”，常在升学、就业、城市选择之间做权衡；22-25岁开始更在意现实回报与长期成长是否同向。",
        "这一段若压力大，容易出现“外表正常推进、内心长期紧绷”的状态。建议把目标拆成季度里程碑，降低一次性成败焦虑。",
        "【当前年龄定位与未来大运建议】",
        `你当前实龄约${currentAge}岁，正处于“把能力变成稳定结果”的关键阶段。`,
        "建议你把未来三年的重心放在一条主赛道：先稳住现金流与节律，再逐步放大项目影响力；逢贵人窗口积极协同，遇冲克窗口先稳边界后做决策。",
        "【给外人的感受】",
        "第一印象通常是稳重、可靠、有分寸，深入接触后会被认可为可托付、可协作的类型。",
        "【潜在MBTI性格】",
        "综合行为倾向更接近 INTJ/ISTJ：重结构、重执行、重长期复利。",
        "【吉言寓意】",
        "愿你顺势而行、心定事成；厚积之下，自有花开之时。"
      ].join("\n"),
    dayun:
      "大运层面呈现先蓄后发的节奏：上一运重在打基础，当前运重在兑现资源价值，下一运重在系统化管理与影响力扩张。若能在当前运把方法论沉淀下来，下一运会更容易进入“借势放大”的状态。",
    peach:
      "桃花并非弱项，但更偏“质量型桃花”而非“数量型热闹”。你在高窗口期容易遇到吸引力强但节奏快的关系，建议慢半拍确认价值观与边界，再做承诺，反而更容易走向稳定长线。遇冲克时先缓言，少争一时之胜。",
    wealth:
      "财运属于可经营、可放大的类型。你更适合先做现金流稳定盘，再做增长盘扩张；短期波动并不可怕，可怕的是没有规则。把预算、止损、复盘做成固定动作，财运会更容易形成复利曲线。可借“食神生财”之法，先增值后增收。",
    relationship:
      "人际关系的关键不是拓圈，而是筛圈与深耕。你与少数高质量关系的协同收益，远高于大量浅连接。遇到分歧时先对齐事实与目标，再处理情绪，能明显降低关系摩擦成本。",
    closing:
      "命理上看，你的胜负手不在“是否有好运”，而在“是否把好运用成长期结构”。若逢贵人月当主动协同，若见冲克月宜先稳阵脚。只要持续按主线推进、按周期复盘，这张盘是会越走越稳、越做越厚的。愿你守得住节律，也等得到回响。"
  };

  return {
    pillars: {
      year: pillar(seed, 1),
      month: pillar(seed, 2),
      day: pillar(seed, 3),
      hour: pillar(seed, 4)
    },
    dayMaster: pick(stems, seed, 5),
    summary: pick(summaryPool, seed, 1),
    profileTags: [pick(tags, seed, 1), pick(tags, seed, 3), pick(tags, seed, 5)],
    yearlyScore,
    monthlyFocus: pick(focusPool, seed, 2),
    suggestions: [pick(advicePool, seed, 0), pick(advicePool, seed, 2), pick(advicePool, seed, 4)],
    radarMetrics,
    timeline,
    liuYue,
    liuZhou,
    tenGods: {
      yearGan: "偏财",
      monthGan: "正印",
      dayGan: "日主",
      timeGan: "食神",
      yearZhi: ["比肩"],
      monthZhi: ["偏印"],
      dayZhi: ["日主"],
      timeZhi: ["食神"]
    },
    chartExtra: {
      mingGong: "己丑",
      shenGong: "壬午",
      taiYuan: "己卯",
      strength: "中和（66）",
      usefulElements: ["木", "火"]
    },
    timeCalibration: {
      timezone: input.timezone,
      cityLongitude: Number(input.longitude || "121.47"),
      standardMeridian: 120,
      timezoneOffsetMinutes: 480,
      standardOffsetMinutes: 480,
      dstOffsetMinutes: 0,
      equationOfTimeMinutes: 0,
      trueSolarCorrectionMinutes: 0,
      inputLocalTime: `${input.birthDate} ${input.birthTime}`,
      correctedSolarTime: `${input.birthDate} ${input.birthTime}`
    },
    ruleTrace: {
      configVersion: "mock",
      mainPattern: {
        name: "食伤生财",
        score: 5.8,
        level: "中",
        summary: "输出能力带动财富，适合产品化与交易化路径。"
      },
      shensha: {
        active: ["文昌"],
        metricAdjustments: {
          事业: 1,
          财务: 1,
          关系: 0,
          成长: 3,
          健康: 1
        }
      }
    },
    daYunInsights,
    topicReports,
    masterNarrative,
    daYun: {
      startSolar: `${currentYear - 8}-02-18`,
      isForward: true,
      current: daYunList[1],
      list: daYunList
    },
    liuNian
  };
}
