import { BaziResult, BirthInput } from "../types";

function esc(raw: unknown): string {
  const text = raw === null || raw === undefined ? "" : String(raw);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function listOf<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function band(value: number): string {
  if (value >= 80) {
    return "偏强";
  }
  if (value >= 65) {
    return "平稳";
  }
  return "需稳";
}

export function buildReportHtml(input: BirthInput, result: BaziResult): string {
  const timestamp = new Date().toLocaleString("zh-CN", { hour12: false });

  const tags = listOf(result.profileTags).map((tag) => `<span class="chip">${esc(tag)}</span>`).join("");
  const adviceRows = listOf(result.suggestions)
    .map((item, idx) => `<li><span class="idx">${idx + 1}</span>${esc(item)}</li>`)
    .join("");
  const radarRows = listOf(result.radarMetrics)
    .map((metric) => `<tr><td>${esc(metric.label)}</td><td>${band(metric.value)}</td></tr>`)
    .join("");
  const timelineRows = listOf(result.liuNian)
    .map(
      (item) =>
        `<tr><td>${item.year}</td><td>${esc(item.ganZhi)}</td><td>${esc(item.daYun)}</td><td>${esc(item.theme)}</td></tr>`
    )
    .join("");
  const liuYueRows = listOf(result.liuYue)
    .map(
      (item) =>
        `<tr><td>${item.monthLabel}</td><td>${esc(item.ganZhi)}</td><td>${esc(item.theme)}</td></tr>`
    )
    .join("");
  const liuZhouRows = listOf(result.liuZhou)
    .map(
      (item) =>
        `<tr><td>${esc(item.weekLabel)}</td><td>${esc(item.monthGanZhi)}</td><td>${esc(item.theme)}</td></tr>`
    )
    .join("");
  const daYunRows = listOf(result.daYun?.list)
    .map(
      (item) =>
        `<tr><td>${item.index}</td><td>${esc(item.ganZhi)}</td><td>${item.startYear}-${item.endYear}</td><td>${item.startAge}-${item.endAge}</td></tr>`
    )
    .join("");
  const daYunInsightRows = listOf(result.daYunInsights)
    .map(
      (item) =>
        `<tr><td>${esc(item.phase)}</td><td>${esc(item.ganZhi)}</td><td>${esc(item.range)}</td><td>${esc(item.focus)}</td><td>${esc(item.opportunity)}</td><td>${esc(item.risk)}</td><td>${esc(item.strategy)}</td></tr>`
    )
    .join("");
  const masterNarrative = result.masterNarrative || {
    overall: "暂无命理师详批。",
    dayun: "",
    peach: "",
    wealth: "",
    relationship: "",
    closing: ""
  };

  const renderTopicCard = (title: string, report: unknown): string => {
    if (!report || typeof report !== "object") {
      return `<div class="card"><h3>${esc(title)}</h3><p class="muted">暂无数据</p></div>`;
    }
    const topic = report as {
      score?: number;
      level?: string;
      summary?: string;
      windows?: string[];
      suggestions?: string[];
    };
    const windows = listOf(topic.windows).map((item) => esc(item)).join("、") || "暂无";
    const suggestions = listOf(topic.suggestions)
      .map((item, idx) => `<li><span class="idx">${idx + 1}</span>${esc(item)}</li>`)
      .join("");
    return `<div class="card">
      <h3>${esc(title)}（${esc(topic.level || "-")}势）</h3>
      <p class="muted">${esc(topic.summary || "暂无摘要")}</p>
      <p class="muted">窗口：${windows}</p>
      <ol>${suggestions}</ol>
    </div>`;
  };

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Bazi Flow 报告</title>
<style>
  body {
    margin: 0;
    font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
    background: #f8f4ec;
    color: #1f1c18;
  }
  .page {
    width: 100%;
    box-sizing: border-box;
    padding: 28px;
  }
  .hero {
    background: linear-gradient(135deg, #1e5e52 0%, #2e7d6e 52%, #cdaa5b 100%);
    border-radius: 18px;
    color: #fffdf8;
    padding: 20px 24px;
  }
  .brand {
    font-size: 14px;
    opacity: 0.92;
    letter-spacing: 0.3px;
  }
  .title {
    margin: 8px 0 4px;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 0.2px;
  }
  .meta {
    font-size: 13px;
    opacity: 0.92;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-top: 14px;
  }
  .card {
    background: #fffdf8;
    border: 1px solid #ebdfc8;
    border-radius: 14px;
    padding: 14px 16px;
  }
  .card h3 {
    margin: 0 0 10px;
    font-size: 15px;
    color: #3a332c;
  }
  .pillars {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .pillar {
    background: rgba(205, 170, 91, 0.16);
    border-radius: 10px;
    padding: 8px 4px;
    text-align: center;
  }
  .pillar .label {
    font-size: 11px;
    color: #6d6459;
  }
  .pillar .value {
    margin-top: 2px;
    font-size: 18px;
    font-weight: 800;
  }
  .score {
    margin-top: 8px;
    font-size: 28px;
    font-weight: 800;
    color: #c4512d;
  }
  .muted {
    color: #6d6459;
    font-size: 13px;
    line-height: 1.5;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    background: rgba(46, 125, 110, 0.12);
    color: #1e5e52;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 700;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th, td {
    border-bottom: 1px solid #efe5d4;
    padding: 7px 6px;
    text-align: left;
  }
  th {
    color: #6d6459;
    font-weight: 700;
    font-size: 11px;
  }
  ol {
    margin: 0;
    padding-left: 0;
    list-style: none;
  }
  li {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    line-height: 1.5;
    font-size: 13px;
  }
  .idx {
    width: 18px;
    height: 18px;
    border-radius: 9px;
    background: rgba(205, 170, 91, 0.24);
    color: #7f6227;
    text-align: center;
    line-height: 18px;
    font-size: 11px;
    font-weight: 700;
    flex: 0 0 auto;
    margin-top: 1px;
  }
  .footer {
    margin-top: 12px;
    font-size: 11px;
    color: #8a7f71;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <div class="brand">Bazi Flow · 命理可视化策略引擎</div>
      <div class="title">个人命盘报告</div>
      <div class="meta">${esc(input.name)} · ${esc(input.birthDate)} ${esc(input.birthTime)} · ${esc(input.birthCity)} · ${esc(input.timezone)} · 生成时间 ${esc(timestamp)}</div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>四柱与命局</h3>
        <div class="pillars">
          <div class="pillar"><div class="label">年柱</div><div class="value">${esc(result.pillars.year)}</div></div>
          <div class="pillar"><div class="label">月柱</div><div class="value">${esc(result.pillars.month)}</div></div>
          <div class="pillar"><div class="label">日柱</div><div class="value">${esc(result.pillars.day)}</div></div>
          <div class="pillar"><div class="label">时柱</div><div class="value">${esc(result.pillars.hour)}</div></div>
        </div>
        <p class="muted">日主：${esc(result.dayMaster)} ｜ 强弱：${esc(result.chartExtra.strength)} ｜ 用神建议：${esc(result.chartExtra.usefulElements.join("、"))}</p>
      </div>

      <div class="card">
        <h3>年度主线与节奏</h3>
        <p class="muted">年度状态：${band(result.yearlyScore)}</p>
        <p class="muted">${esc(result.summary)}</p>
        <p class="muted">当前主线：${esc(result.monthlyFocus)}</p>
      </div>

      <div class="card">
        <h3>大运信息</h3>
        <p class="muted">起运：${esc(result.daYun.startSolar)} ｜ 方向：${result.daYun.isForward ? "顺行" : "逆行"}</p>
        <p class="muted">主格局：${esc(result.ruleTrace.mainPattern.name)}（${esc(result.ruleTrace.mainPattern.level)}）</p>
        <p class="muted">神煞：${esc(result.ruleTrace.shensha.active.length ? result.ruleTrace.shensha.active.join("、") : "无明显触发")} ｜ 规则版本：${esc(result.ruleTrace.configVersion)}</p>
        <table>
          <thead><tr><th>序</th><th>大运</th><th>年份</th><th>年龄</th></tr></thead>
          <tbody>${daYunRows}</tbody>
        </table>
      </div>

      <div class="card">
        <h3>时区与真太阳时校正</h3>
        <p class="muted">输入时间：${esc(result.timeCalibration.inputLocalTime)}（${esc(result.timeCalibration.timezone)}）</p>
        <p class="muted">校正时间：${esc(result.timeCalibration.correctedSolarTime)}（修正 ${result.timeCalibration.trueSolarCorrectionMinutes} 分钟）</p>
        <table>
          <thead><tr><th>参数</th><th>值</th></tr></thead>
          <tbody>
            <tr><td>经度</td><td>${result.timeCalibration.cityLongitude}</td></tr>
            <tr><td>标准子午线</td><td>${result.timeCalibration.standardMeridian}</td></tr>
            <tr><td>DST 偏移(分钟)</td><td>${result.timeCalibration.dstOffsetMinutes}</td></tr>
            <tr><td>均时差(分钟)</td><td>${result.timeCalibration.equationOfTimeMinutes}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3>优势标签</h3>
        <div class="chips">${tags}</div>
      </div>

      <div class="card">
        <h3>行动建议</h3>
        <ol>${adviceRows}</ol>
      </div>

      <div class="card">
        <h3>雷达维度倾向</h3>
        <table>
          <thead><tr><th>维度</th><th>状态</th></tr></thead>
          <tbody>${radarRows}</tbody>
        </table>
      </div>

      <div class="card">
        <h3>未来6年流年</h3>
        <table>
          <thead><tr><th>年份</th><th>流年</th><th>所属大运</th><th>主题</th></tr></thead>
          <tbody>${timelineRows}</tbody>
        </table>
      </div>

      <div class="card">
        <h3>当前流年流月（12个月）</h3>
        <table>
          <thead><tr><th>月份</th><th>流月</th><th>主题</th></tr></thead>
          <tbody>${liuYueRows}</tbody>
        </table>
      </div>

      <div class="card">
        <h3>未来12周窗口</h3>
        <table>
          <thead><tr><th>周次</th><th>月令</th><th>主题</th></tr></thead>
          <tbody>${liuZhouRows}</tbody>
        </table>
      </div>

      <div class="card">
        <h3>大运阶段个性解析</h3>
        <table>
          <thead><tr><th>阶段</th><th>大运</th><th>区间</th><th>主线</th><th>机会</th><th>风险</th><th>策略</th></tr></thead>
          <tbody>${daYunInsightRows}</tbody>
        </table>
      </div>

      ${renderTopicCard("桃花报告", result.topicReports?.peachBlossom)}
      ${renderTopicCard("财运建议", result.topicReports?.wealth)}
      ${renderTopicCard("人际关系建议", result.topicReports?.relationship)}

      <div class="card">
        <h3>命理师详批</h3>
        <p class="muted">${esc(masterNarrative.overall)}</p>
        <p class="muted">${esc(masterNarrative.dayun)}</p>
        <p class="muted">${esc(masterNarrative.peach)}</p>
        <p class="muted">${esc(masterNarrative.wealth)}</p>
        <p class="muted">${esc(masterNarrative.relationship)}</p>
        <p class="muted">${esc(masterNarrative.closing)}</p>
      </div>
    </div>

    <div class="footer">注：本报告用于个人认知与规划参考，不替代医疗、法律、投资等专业意见。</div>
  </div>
</body>
</html>`;
}
