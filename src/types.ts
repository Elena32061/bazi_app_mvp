export type BirthInput = {
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  timezone: string;
  longitude: string;
};

export type MetricName = "事业" | "财务" | "关系" | "成长" | "健康";

export type ShenShaName = "天乙贵人" | "文昌" | "桃花" | "驿马";

export type RadarMetric = {
  label: MetricName;
  value: number;
};

export type TimelinePoint = {
  label: string;
  score: number;
  theme: string;
};

export type DaYunItem = {
  index: number;
  ganZhi: string;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
};

export type LiuNianItem = {
  year: number;
  age: number;
  ganZhi: string;
  daYun: string;
  score: number;
  theme: string;
};

export type LiuYueItem = {
  year: number;
  monthIndex: number;
  monthLabel: string;
  ganZhi: string;
  score: number;
  theme: string;
};

export type LiuZhouItem = {
  sequence: number;
  year: number;
  monthIndex: number;
  weekOfMonth: number;
  weekLabel: string;
  monthGanZhi: string;
  score: number;
  theme: string;
};

export type TimeCalibration = {
  timezone: string;
  cityLongitude: number;
  standardMeridian: number;
  timezoneOffsetMinutes: number;
  standardOffsetMinutes: number;
  dstOffsetMinutes: number;
  equationOfTimeMinutes: number;
  trueSolarCorrectionMinutes: number;
  inputLocalTime: string;
  correctedSolarTime: string;
};

export type RuleTrace = {
  configVersion: string;
  mainPattern: {
    name: string;
    score: number;
    level: "高" | "中" | "低";
    summary: string;
  };
  shensha: {
    active: ShenShaName[];
    metricAdjustments: Record<MetricName, number>;
  };
};

export type DaYunInsight = {
  phase: "上一运" | "当前运" | "下一运";
  ganZhi: string;
  range: string;
  focus: MetricName;
  score: number;
  opportunity: string;
  risk: string;
  strategy: string;
};

export type TopicReport = {
  score: number;
  level: "高" | "中" | "低";
  summary: string;
  windows: string[];
  suggestions: string[];
};

export type MasterNarrative = {
  overall: string;
  dayun: string;
  peach: string;
  wealth: string;
  relationship: string;
  closing: string;
};

export type BaziResult = {
  pillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  dayMaster: string;
  summary: string;
  profileTags: string[];
  yearlyScore: number;
  monthlyFocus: MetricName;
  suggestions: string[];
  radarMetrics: RadarMetric[];
  timeline: TimelinePoint[];
  liuYue: LiuYueItem[];
  liuZhou: LiuZhouItem[];
  tenGods: {
    yearGan: string;
    monthGan: string;
    dayGan: string;
    timeGan: string;
    yearZhi: string[];
    monthZhi: string[];
    dayZhi: string[];
    timeZhi: string[];
  };
  chartExtra: {
    mingGong: string;
    shenGong: string;
    taiYuan: string;
    strength: string;
    usefulElements: string[];
  };
  timeCalibration: TimeCalibration;
  ruleTrace: RuleTrace;
  daYunInsights: DaYunInsight[];
  topicReports: {
    peachBlossom: TopicReport;
    wealth: TopicReport;
    relationship: TopicReport;
  };
  masterNarrative: MasterNarrative;
  daYun: {
    startSolar: string;
    isForward: boolean;
    current: DaYunItem | null;
    list: DaYunItem[];
  };
  liuNian: LiuNianItem[];
};
