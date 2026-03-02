import { MetricName, ShenShaName } from "../types";
import { DEFAULT_RULE_CONFIG, Element, RuleConfig, UsefulSymbol } from "./ruleConfig";

export type TenGodSummary = {
  officer: number;
  wealth: number;
  resource: number;
  output: number;
  peer: number;
};

export type RuleEngineInput = {
  dayElement: Element;
  elementCount: Record<Element, number>;
  tenGod: TenGodSummary;
  variance: number;
  shenshaFlags: Record<ShenShaName, boolean>;
};

export type RuleEngineOutput = {
  strengthScore: number;
  strengthLabel: "偏强" | "中和" | "偏弱";
  usefulElements: Element[];
  radarMetrics: Array<{ label: MetricName; value: number }>;
  monthlyFocus: MetricName;
  pattern: {
    name: string;
    score: number;
    level: "高" | "中" | "低";
    summary: string;
  };
  shensha: {
    active: ShenShaName[];
    metricAdjustments: Record<MetricName, number>;
  };
  configVersion: string;
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

const METRICS: MetricName[] = ["事业", "财务", "关系", "成长", "健康"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function reverseMapValue(map: Record<Element, Element>, target: Element): Element {
  const found = (Object.keys(map) as Element[]).find((key) => map[key] === target);
  return found || "土";
}

function strengthLabel(score: number, config: RuleConfig): "偏强" | "中和" | "偏弱" {
  if (score >= config.strength.thresholds.strong) {
    return "偏强";
  }
  if (score <= config.strength.thresholds.weak) {
    return "偏弱";
  }
  return "中和";
}

function resolveUsefulElement(symbol: UsefulSymbol, dayElement: Element): Element {
  if (symbol === "self") {
    return dayElement;
  }
  if (symbol === "resource") {
    return reverseMapValue(PRODUCE_MAP, dayElement);
  }
  if (symbol === "output") {
    return PRODUCE_MAP[dayElement];
  }
  return CONTROL_MAP[dayElement];
}

export function runRuleEngine(input: RuleEngineInput, config: RuleConfig = DEFAULT_RULE_CONFIG): RuleEngineOutput {
  const resourceElement = reverseMapValue(PRODUCE_MAP, input.dayElement);
  const officerElement = reverseMapValue(CONTROL_MAP, input.dayElement);

  const support = input.elementCount[input.dayElement] + input.elementCount[resourceElement];
  const pressure =
    input.elementCount[officerElement] +
    input.elementCount[PRODUCE_MAP[input.dayElement]] * config.strength.pressureOutputFactor;

  const ratio = support / (support + pressure + 0.01);
  const strengthScore = clamp(Math.round(config.strength.base + ratio * config.strength.scale), 35, 95);
  const label = strengthLabel(strengthScore, config);

  const activeShensha = (Object.keys(input.shenshaFlags) as ShenShaName[]).filter((name) => input.shenshaFlags[name]);

  const patternScores = config.patterns.map((pattern) => {
    const score =
      pattern.coefficients.officer * input.tenGod.officer +
      pattern.coefficients.wealth * input.tenGod.wealth +
      pattern.coefficients.resource * input.tenGod.resource +
      pattern.coefficients.output * input.tenGod.output +
      pattern.coefficients.peer * input.tenGod.peer;
    return { pattern, score };
  });

  const bestPattern = patternScores.sort((a, b) => b.score - a.score)[0] || {
    pattern: {
      name: "平衡格局",
      threshold: 999,
      focusMetric: "成长" as MetricName,
      boost: 0,
      summary: "当前命局以平衡为主，建议稳步推进。"
    },
    score: 0
  };

  const patternLevel: "高" | "中" | "低" =
    bestPattern.score >= bestPattern.pattern.threshold + 1 ? "高" :
    bestPattern.score >= bestPattern.pattern.threshold ? "中" : "低";

  const patternMetricBoost: Record<MetricName, number> = {
    事业: 0,
    财务: 0,
    关系: 0,
    成长: 0,
    健康: 0
  };

  if (bestPattern.score >= bestPattern.pattern.threshold - 0.4) {
    patternMetricBoost[bestPattern.pattern.focusMetric] =
      bestPattern.score >= bestPattern.pattern.threshold ? bestPattern.pattern.boost : Math.round(bestPattern.pattern.boost / 2);
  }

  const shenshaMetricAdjustments: Record<MetricName, number> = {
    事业: 0,
    财务: 0,
    关系: 0,
    成长: 0,
    健康: 0
  };

  const radarMetrics = METRICS.map((metric) => {
    const rule = config.metrics[metric];

    let score =
      rule.base +
      rule.tenGod.officer * input.tenGod.officer +
      rule.tenGod.wealth * input.tenGod.wealth +
      rule.tenGod.resource * input.tenGod.resource +
      rule.tenGod.output * input.tenGod.output +
      rule.tenGod.peer * input.tenGod.peer +
      rule.variance * input.variance;

    activeShensha.forEach((name) => {
      const delta = rule.shensha[name] || 0;
      score += delta;
      shenshaMetricAdjustments[metric] += delta;
    });

    score += patternMetricBoost[metric];

    return {
      label: metric,
      value: clamp(Math.round(score), rule.min, rule.max)
    };
  });

  const sorted = [...radarMetrics].sort((a, b) => b.value - a.value);
  const monthlyFocus = sorted[0]?.label || "成长";

  const usefulSymbols =
    label === "偏强"
      ? config.usefulElementPolicy.strong
      : label === "偏弱"
        ? config.usefulElementPolicy.weak
        : config.usefulElementPolicy.balanced;

  const usefulElements = Array.from(new Set(usefulSymbols.map((symbol) => resolveUsefulElement(symbol, input.dayElement))));

  return {
    strengthScore,
    strengthLabel: label,
    usefulElements,
    radarMetrics,
    monthlyFocus,
    pattern: {
      name: bestPattern.pattern.name,
      score: Number(bestPattern.score.toFixed(2)),
      level: patternLevel,
      summary: bestPattern.pattern.summary
    },
    shensha: {
      active: activeShensha,
      metricAdjustments: shenshaMetricAdjustments
    },
    configVersion: config.version
  };
}
