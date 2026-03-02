import { BaziResult, MetricName } from "../types";
import { DEFAULT_QA_CONFIG, QaConfig, QaIntentConfig, QaIntentId, QaToneId } from "./qaConfig";

export type QaResponse = {
  intentId: QaIntentId;
  intentTitle: string;
  tone: QaToneId;
  confidence: number;
  answer: string;
  references: string[];
  psychFrameworks: string[];
};

export type QaAnswerOptions = {
  tone?: QaToneId;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

function metricValue(result: BaziResult, metric: MetricName): number {
  return result.radarMetrics.find((item) => item.label === metric)?.value ?? result.yearlyScore;
}

function keywordScore(question: string, intent: QaIntentConfig): number {
  const q = normalize(question);
  return intent.keywords.reduce((score, keyword) => {
    const key = normalize(keyword);
    if (!key) {
      return score;
    }
    return q.includes(key) ? score + (key.length >= 3 ? 2 : 1) : score;
  }, 0);
}

function detectIntent(question: string, config: QaConfig): { intent: QaIntentConfig; rawScore: number } {
  const ranked = config.intents
    .map((intent) => ({ intent, rawScore: keywordScore(question, intent) }))
    .sort((a, b) => b.rawScore - a.rawScore);

  const top = ranked[0];
  if (top && top.rawScore > 0) {
    return top;
  }

  const fallback = config.intents.find((item) => item.id === "general") || config.intents[0];
  return { intent: fallback, rawScore: 0 };
}

function topMonths(result: BaziResult, count: number): string[] {
  return [...result.liuYue]
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => `${item.monthLabel}(${item.ganZhi})`);
}

function topWeeks(result: BaziResult, count: number): string[] {
  return [...result.liuZhou]
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => item.weekLabel);
}

function lowestMonths(result: BaziResult, count: number): string[] {
  return [...result.liuYue]
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((item) => `${item.monthLabel}(${item.ganZhi})`);
}

function windowsForIntent(intentId: QaIntentId, result: BaziResult): string[] {
  if (intentId === "wealth_growth") {
    return result.topicReports?.wealth.windows?.length ? result.topicReports.wealth.windows : topMonths(result, 3);
  }
  if (intentId === "love_relationship") {
    return result.topicReports?.peachBlossom.windows?.length ? result.topicReports.peachBlossom.windows : topMonths(result, 2);
  }
  if (intentId === "interpersonal_conflict") {
    return result.topicReports?.relationship.windows?.length ? result.topicReports.relationship.windows : topMonths(result, 3);
  }
  if (intentId === "health_stress") {
    return lowestMonths(result, 3);
  }
  if (intentId === "career_timing") {
    return [...topMonths(result, 2), ...topWeeks(result, 1)];
  }
  if (intentId === "big_decision") {
    return [...topMonths(result, 2), ...topWeeks(result, 1)];
  }
  return topMonths(result, 2);
}

function topicSummary(intentId: QaIntentId, result: BaziResult): string {
  if (intentId === "wealth_growth") {
    return result.topicReports?.wealth.summary || "财务宜先稳后进，控制风险敞口。";
  }
  if (intentId === "love_relationship") {
    return result.topicReports?.peachBlossom.summary || "感情节奏宜慢，重质量不重数量。";
  }
  if (intentId === "interpersonal_conflict") {
    return result.topicReports?.relationship.summary || "关系管理关键在边界与沟通质量。";
  }
  if (intentId === "health_stress") {
    return "健康与压力问题优先做节律修复，先稳身心再谈冲刺。";
  }
  return result.summary;
}

function strategySteps(intent: QaIntentConfig, windows: string[]): string {
  const firstWindow = windows[0] || "下一轮顺势窗口";
  const secondWindow = windows[1] || "随后窗口";
  return `1) 先定主目标：围绕「${intent.focusMetric}」只留一个核心主线；` +
    `2) 再定节奏：把关键动作优先安排在${firstWindow}，把复盘与修正安排在${secondWindow}；` +
    `3) 最后定机制：按「${intent.actionFramework.join(" → ")}」形成每周可执行清单。`;
}

function resolveTone(config: QaConfig, tone?: QaToneId) {
  const target = tone || config.defaultTone;
  return config.tones.find((item) => item.id === target) || config.tones[0];
}

function blessingForMetric(metric: MetricName): string {
  if (metric === "事业") {
    return "吉语：愿你事业得位，所谋之事多逢助力，步步见实功。";
  }
  if (metric === "财务") {
    return "吉语：愿你财路有序，进有尺度、守有根基，积微成丰。";
  }
  if (metric === "关系") {
    return "吉语：愿你良缘相应，善缘常伴，所遇皆能相互成就。";
  }
  if (metric === "健康") {
    return "吉语：愿你身心安和，气定神清，日拱一卒自见长稳。";
  }
  return "吉语：愿你顺势而行，心定事成，行稳则福至。";
}

function classicalHint(intentId: QaIntentId): string {
  if (intentId === "wealth_growth") {
    return "古法提要：财星若旺，须借食神生财，忌比劫夺财；先护本再求快，方可久。";
  }
  if (intentId === "love_relationship") {
    return "古法提要：看情缘不独看桃花，还要看合冲刑害。合则近，冲则远，贵在先明边界。";
  }
  if (intentId === "career_timing") {
    return "古法提要：官杀主位，印星护身；天干地支得其时，事业自有台阶可登。";
  }
  if (intentId === "interpersonal_conflict") {
    return "古法提要：人际先辨生克，后谈情绪。若见冲克，先缓锋芒，再定分寸。";
  }
  if (intentId === "health_stress") {
    return "古法提要：阴阳失衡则神不宁，先调息养气，再图外事。";
  }
  return "古法提要：五行贵在相生流通，不宜逆势硬推；顺时而为，事半功倍。";
}

export function answerClientQuestion(
  question: string,
  result: BaziResult,
  config: QaConfig = DEFAULT_QA_CONFIG,
  options: QaAnswerOptions = {}
): QaResponse {
  const trimmed = question.trim();
  const safeQuestion = trimmed || "请做综合分析";
  const { intent, rawScore } = detectIntent(safeQuestion, config);
  const tone = resolveTone(config, options.tone);
  const confidence = clamp(Math.round(58 + rawScore * 7 + Math.min(10, safeQuestion.length / 4)), 52, 96);

  const currentDaYun = result.daYun.current
    ? `${result.daYun.current.ganZhi}(${result.daYun.current.startYear}-${result.daYun.current.endYear})`
    : "起运前后";
  const windows = windowsForIntent(intent.id, result);
  const focusScore = metricValue(result, intent.focusMetric);
  const focusBand = focusScore >= 80 ? "偏强" : focusScore >= 65 ? "平稳" : "需稳";
  const topicDigest = topicSummary(intent.id, result);
  const bestPhase = result.daYunInsights?.length
    ? [...result.daYunInsights].sort((a, b) => b.score - a.score)[0]
    : null;

  const answer = [
    `${tone.opening} 我会按“命局结构 + 大运阶段 + 心理执行”三层来断。先说结论：` +
      `你的命盘当前并非无机可乘，而是典型的“节奏型盘”，抓对窗口会明显顺，踩错节律就会感觉费力。` +
      `日主${result.dayMaster}，命局强弱为${result.chartExtra.strength}，主格局「${result.ruleTrace.mainPattern.name}（${result.ruleTrace.mainPattern.level}）」；` +
      `当前大运在${currentDaYun}，这是你近几年判断大事的底盘。` +
      `天干地支有合有冲，见合可借势，见冲宜缓进。` +
      ` ${tone.verdictStyle}`,
    `再按你问的「${safeQuestion}」聚焦来看：` +
      `该主题在盘中对应${intent.focusMetric}维度，当前整体状态为${focusBand}。` +
      `${intent.interpretationGuide} ` +
      `从流月与流周看，建议重点观察这些窗口：${windows.join("、") || "近期先稳态观察"}。` +
      `${topicDigest} ` +
      `${bestPhase ? `另外你的大运关键阶段是${bestPhase.phase}${bestPhase.ganZhi}，做决策时应尽量贴合其主线${bestPhase.focus}。` : ""}`,
    `命理依据上，我参考的是：${intent.baziReferences.join("；")}。` +
      `心理执行上，我建议你并行使用：${intent.psychReferences.join("；")}。` +
      `原因是命理告诉你“何时顺势”，心理学告诉你“如何稳定执行”，两者结合才会让结果可复现，而不是靠一次运气。`,
    classicalHint(intent.id),
    `给你一个可落地的咨询师处方：${strategySteps(intent, windows)}` +
      ` 若遇贵人窗口，优先做关键协同与资源置换；若遇冲克窗口，先稳边界再动决策。` +
      ` ${tone.actionStyle}` +
      ` 如果你愿意，我下一轮可以按你具体场景（例如“要不要换工作”“要不要继续这段关系”）做A/B决策推演，给出更细的分支路径。`,
    tone.closing,
    blessingForMetric(intent.focusMetric),
    config.caution
  ].join("\n\n");

  return {
    intentId: intent.id,
    intentTitle: intent.title,
    tone: tone.id,
    confidence,
    answer,
    references: intent.baziReferences,
    psychFrameworks: intent.psychReferences
  };
}
