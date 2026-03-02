import { MetricName } from "../types";

export type QaIntentId =
  | "career_timing"
  | "wealth_growth"
  | "love_relationship"
  | "interpersonal_conflict"
  | "health_stress"
  | "big_decision"
  | "self_growth"
  | "general";

export type QaToneId = "温和陪伴" | "专业咨询" | "直断犀利";

export type QaIntentConfig = {
  id: QaIntentId;
  title: string;
  keywords: string[];
  focusMetric: MetricName;
  baziReferences: string[];
  psychReferences: string[];
  interpretationGuide: string;
  actionFramework: string[];
};

export type QaConfig = {
  persona: string;
  caution: string;
  defaultTone: QaToneId;
  tones: Array<{
    id: QaToneId;
    opening: string;
    verdictStyle: string;
    actionStyle: string;
    closing: string;
  }>;
  intents: QaIntentConfig[];
};

export const DEFAULT_QA_CONFIG: QaConfig = {
  persona: "资深子平命理师 + 咨询心理学教练",
  caution: "命理用于认知与规划，不替代医疗、法律、投资等专业意见。",
  defaultTone: "专业咨询",
  tones: [
    {
      id: "温和陪伴",
      opening: "我会先接住你的焦虑，再给你清晰的判断。",
      verdictStyle: "先稳情绪，再稳策略；结论以可执行为先。",
      actionStyle: "动作拆小、节奏平稳、允许迭代。",
      closing: "你不需要一次到位，按节奏推进就会看到变化。愿你心有定盘，步步生安。"
    },
    {
      id: "专业咨询",
      opening: "我按“命局结构-运势阶段-执行方案”给你结论。",
      verdictStyle: "先给判断，再给证据，最后给步骤。",
      actionStyle: "顺势窗口推进，沉淀窗口修正，保持复盘闭环。",
      closing: "把方法做成系统，结果会比情绪更稳定。愿你顺势得时，所行皆有回响。"
    },
    {
      id: "直断犀利",
      opening: "我直接说结论，不绕弯子。",
      verdictStyle: "先砍无效动作，再押核心窗口。",
      actionStyle: "主线不清就会消耗，主线清晰才会放大。",
      closing: "该收的收，该打的打，别在中间地带内耗。愿你定则能进，进则有成。"
    }
  ],
  intents: [
    {
      id: "career_timing",
      title: "事业时机",
      keywords: ["事业", "工作", "升职", "跳槽", "offer", "创业", "时机", "何时", "岗位", "职场"],
      focusMetric: "事业",
      baziReferences: ["《子平真诠》先看月令再辨格局", "《滴天髓》重平衡与流通", "《穷通宝鉴》重四时调候"],
      psychReferences: ["目标分解(Goal Breakdown)", "行为激活(Behavioral Activation)", "复盘回路(Feedback Loop)"],
      interpretationGuide: "先判断大运底盘，再看流年流月窗口，避免在低势能周期做高杠杆决策。",
      actionFramework: ["锁定主线目标", "顺势窗口推进关键动作", "沉淀窗口做修正和积累"]
    },
    {
      id: "wealth_growth",
      title: "财运增长",
      keywords: ["财运", "钱", "收入", "副业", "投资", "理财", "赚钱", "现金流", "存款"],
      focusMetric: "财务",
      baziReferences: ["《滴天髓》旺衰取用神", "《三命通会》财官印食伤取象", "《穷通宝鉴》随时令调配"],
      psychReferences: ["损失规避管理", "风险预算(Risk Budgeting)", "延迟满足(Delayed Gratification)"],
      interpretationGuide: "财运看结构，不看一时冲高；先守现金流，再做扩张配置。",
      actionFramework: ["预算分层", "止损前置", "月度复盘投入产出比"]
    },
    {
      id: "love_relationship",
      title: "桃花感情",
      keywords: ["桃花", "感情", "恋爱", "对象", "结婚", "复合", "暧昧", "婚姻", "脱单"],
      focusMetric: "关系",
      baziReferences: ["《渊海子平》看夫妻星与日主关系", "《滴天髓》重中和与节律", "桃花与合冲刑害并看"],
      psychReferences: ["依恋风格识别", "边界管理(Boundary Setting)", "沟通脚本(Nonviolent Communication)"],
      interpretationGuide: "感情不只看桃花多寡，更看关系质量与长期稳定性。",
      actionFramework: ["筛选价值观匹配", "降低情绪性承诺", "建立稳定沟通节奏"]
    },
    {
      id: "interpersonal_conflict",
      title: "人际协同",
      keywords: ["人际", "同事", "上级", "团队", "冲突", "沟通", "关系", "合作", "贵人"],
      focusMetric: "关系",
      baziReferences: ["十神看角色关系", "合冲刑害看关系摩擦", "神煞仅作辅助不作唯一结论"],
      psychReferences: ["冲突降温(De-escalation)", "非暴力沟通(NVC)", "双赢谈判框架"],
      interpretationGuide: "先看角色边界与资源交换，再谈情绪；关系管理优先于关系数量。",
      actionFramework: ["先对齐事实", "再协商边界", "最后固化机制"]
    },
    {
      id: "health_stress",
      title: "健康压力",
      keywords: ["健康", "焦虑", "压力", "失眠", "情绪", "内耗", "疲惫", "睡眠", "抑郁"],
      focusMetric: "健康",
      baziReferences: ["五行平衡看节律", "强弱失衡先调作息", "低势能期不宜过度透支"],
      psychReferences: ["情绪命名(Emotion Labeling)", "呼吸与躯体放松", "压力接种(Stress Inoculation)"],
      interpretationGuide: "健康类问题先做节律修复，再谈效率提升，避免硬扛。",
      actionFramework: ["恢复睡眠与作息", "降低任务复杂度", "逐步恢复负荷"]
    },
    {
      id: "big_decision",
      title: "重大决策",
      keywords: ["要不要", "是否", "选择", "A还是B", "决策", "买房", "出国", "转行", "换城市"],
      focusMetric: "成长",
      baziReferences: ["大运定方向，流年定节奏", "用神与忌神决定风险敞口", "喜忌与现实约束并行判断"],
      psychReferences: ["决策矩阵", "预先验尸(Pre-mortem)", "机会成本评估"],
      interpretationGuide: "先问方向是否顺运，再问时间是否顺势，最后看成本是否可承受。",
      actionFramework: ["列清三种情景", "设立触发条件", "分阶段试错推进"]
    },
    {
      id: "self_growth",
      title: "天赋成长",
      keywords: ["天赋", "适合", "优势", "学习", "成长", "擅长", "定位", "方向"],
      focusMetric: "成长",
      baziReferences: ["格局决定上限方向", "十神决定发力方式", "用神决定补能路径"],
      psychReferences: ["优势识别(Strengths)", "刻意练习(Deliberate Practice)", "身份型习惯(Identity Habit)"],
      interpretationGuide: "成长路径要和命盘优势一致，避免长期逆势消耗。",
      actionFramework: ["聚焦一个能力主轴", "建立周复盘", "季度输出可见成果"]
    },
    {
      id: "general",
      title: "综合咨询",
      keywords: ["运势", "怎么看", "建议", "分析", "请教", "帮我看"],
      focusMetric: "成长",
      baziReferences: ["命局看结构，大运看阶段", "流年流月看窗口", "喜忌看资源配置"],
      psychReferences: ["目标清晰化", "执行意图(Implementation Intention)", "复盘和迭代"],
      interpretationGuide: "综合问题先抓主线，再拆分为可执行动作。",
      actionFramework: ["先定主线", "再抓窗口", "最后做闭环复盘"]
    }
  ]
};
