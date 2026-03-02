import { MetricName, ShenShaName } from "../types";

export type Element = "木" | "火" | "土" | "金" | "水";

export type TenGodVector = {
  officer: number;
  wealth: number;
  resource: number;
  output: number;
  peer: number;
};

export type MetricRule = {
  base: number;
  tenGod: TenGodVector;
  variance: number;
  shensha: Partial<Record<ShenShaName, number>>;
  min: number;
  max: number;
};

export type PatternRule = {
  name: string;
  coefficients: TenGodVector;
  threshold: number;
  focusMetric: MetricName;
  boost: number;
  summary: string;
};

export type StrengthRule = {
  base: number;
  scale: number;
  pressureOutputFactor: number;
  thresholds: {
    strong: number;
    weak: number;
  };
};

export type UsefulSymbol = "self" | "resource" | "output" | "wealth";

export type ElementRole = "self" | "resource" | "output" | "wealth" | "officer";

export type MonthlyRule = {
  baselineWeight: number;
  stemWeights: Record<ElementRole, number>;
  branchWeights: Record<ElementRole, number>;
  seasonOffsets: number[];
  shenshaActiveBoost: number;
  patternBoostByLevel: {
    high: number;
    medium: number;
    low: number;
  };
  min: number;
  max: number;
};

export type WeeklyRule = {
  baselineWeight: number;
  weekOffsets: number[];
  shenshaActiveBoost: number;
  patternBoostByLevel: {
    high: number;
    medium: number;
    low: number;
  };
  min: number;
  max: number;
};

export type RuleConfig = {
  version: string;
  strength: StrengthRule;
  metrics: Record<MetricName, MetricRule>;
  patterns: PatternRule[];
  usefulElementPolicy: {
    strong: UsefulSymbol[];
    weak: UsefulSymbol[];
    balanced: UsefulSymbol[];
  };
  monthly: MonthlyRule;
  weekly: WeeklyRule;
};

export const DEFAULT_RULE_CONFIG: RuleConfig = {
  version: "rule-v1.2.0",
  strength: {
    base: 38,
    scale: 62,
    pressureOutputFactor: 0.72,
    thresholds: {
      strong: 78,
      weak: 54
    }
  },
  metrics: {
    事业: {
      base: 44,
      tenGod: { officer: 8, wealth: 1, resource: 4, output: 2, peer: -2 },
      variance: -6,
      shensha: { 天乙贵人: 4, 文昌: 3, 驿马: 2, 桃花: 1 },
      min: 35,
      max: 95
    },
    财务: {
      base: 43,
      tenGod: { officer: -1, wealth: 9, resource: 1, output: 4, peer: -4 },
      variance: -5,
      shensha: { 天乙贵人: 1, 文昌: 1, 驿马: 2, 桃花: 2 },
      min: 35,
      max: 95
    },
    关系: {
      base: 45,
      tenGod: { officer: 3, wealth: 4, resource: 2, output: -2, peer: 1 },
      variance: -6,
      shensha: { 天乙贵人: 2, 文昌: 0, 驿马: 1, 桃花: 4 },
      min: 35,
      max: 95
    },
    成长: {
      base: 46,
      tenGod: { officer: 2, wealth: 1, resource: 8, output: 5, peer: 1 },
      variance: -4,
      shensha: { 天乙贵人: 2, 文昌: 4, 驿马: 1, 桃花: 0 },
      min: 35,
      max: 95
    },
    健康: {
      base: 86,
      tenGod: { officer: 0, wealth: 0, resource: 1, output: -1, peer: 0 },
      variance: -24,
      shensha: { 天乙贵人: 1, 文昌: 1, 驿马: -2, 桃花: -1 },
      min: 35,
      max: 95
    }
  },
  patterns: [
    {
      name: "官印相生",
      coefficients: { officer: 1.2, wealth: 0.1, resource: 1.1, output: -0.2, peer: -0.3 },
      threshold: 5.2,
      focusMetric: "事业",
      boost: 4,
      summary: "官星与印星协同，宜走结构化晋升路线。"
    },
    {
      name: "食伤生财",
      coefficients: { officer: -0.2, wealth: 1.1, resource: 0.1, output: 1.2, peer: -0.2 },
      threshold: 5.2,
      focusMetric: "财务",
      boost: 4,
      summary: "输出能力带动财富，适合产品化与交易化路径。"
    },
    {
      name: "比劫助身",
      coefficients: { officer: -0.2, wealth: -0.2, resource: 0.6, output: 0.3, peer: 1.2 },
      threshold: 4.8,
      focusMetric: "成长",
      boost: 3,
      summary: "自驱与同侪力量强，适合建立长期学习与协作系统。"
    }
  ],
  usefulElementPolicy: {
    strong: ["output", "wealth"],
    weak: ["resource", "self"],
    balanced: ["resource", "output"]
  },
  monthly: {
    baselineWeight: 0.88,
    stemWeights: {
      self: 3,
      resource: 4,
      output: 1,
      wealth: 2,
      officer: -4
    },
    branchWeights: {
      self: 2,
      resource: 3,
      output: 1,
      wealth: 1,
      officer: -2
    },
    seasonOffsets: [2, 1, 2, 1, 0, -1, -2, -1, 0, 1, 0, 1],
    shenshaActiveBoost: 0.6,
    patternBoostByLevel: {
      high: 2,
      medium: 1,
      low: 0
    },
    min: 30,
    max: 96
  },
  weekly: {
    baselineWeight: 0.94,
    weekOffsets: [2, 0, -1, 1],
    shenshaActiveBoost: 0.35,
    patternBoostByLevel: {
      high: 1.5,
      medium: 0.8,
      low: 0
    },
    min: 28,
    max: 98
  }
};
