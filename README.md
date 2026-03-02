# Bazi Flow MVP

一个面向 iOS/Android/Web 的八字命理 App 原型（Expo + React Native）。

## 已实现

- 高颜值首页：出生信息输入 + 表单校验 + 粒子流动背景
- 页面过渡：入场与页面切换动画
- 结果页：四柱展示、年度势能、雷达图（可点击 tooltip）、6 年流年时间轴
- 结果页：新增“当前流年流月图（12个月）”柱状图
- 结果页：新增“未来12周窗口”流周图（自然周边界，周一到周日）
- 结果页：新增“个性化专题报告”（大运阶段解析 / 桃花 / 财运 / 人际）
- 结果页：新增“命理师详批”长文口吻分析（可直接给客户阅读）
- 结果页：新增“咨询问答（可配置）”输入框，可按客户问题自动生成命理+心理学答复
  - 支持三种咨询话术风格：温和陪伴 / 专业咨询 / 直断犀利
- 真实引擎（第一版）：
  - 真实排盘（四柱）
  - 十神（天干/地支）
  - 起运/大运
  - 未来流年评分模型
- 时间校正链路：
  - IANA 时区
  - DST（夏令时）
  - 真太阳时修正（经度 + 均时差）
- 规则引擎层（新增，可配置）：
  - 格局规则（主格局识别）
  - 用神策略（按强弱映射）
  - 神煞权重（对各维度的可调影响）
  - 维度评分公式（事业/财务/关系/成长/健康）
  - 流月评分规则（天干/地支角色权重 + 季节偏移 + 神煞与格局加成）
  - 流周评分规则（基线权重 + 周内偏移 + 神煞与格局加成）
- 品牌视觉：自定义 icon / splash / favicon
- 报告导出：一键生成并分享品牌化 PDF
  - 含个性化专题章节（可解释机会、风险、策略）
  - 含命理师长文详批章节

## 运行

```bash
cd ~/Desktop/divination_library/bazi_app_mvp
npm install
npm run start
```

Expo 控制台快捷键：
- `i`：iOS 模拟器
- `a`：Android 模拟器
- `w`：Web 预览

## 线上分享（Vercel）

### 1) 本地构建 Web

```bash
cd ~/Desktop/divination_library/bazi_app_mvp
npm run build:web
```

构建产物在 `dist/` 目录。

### 2) 一键部署到 Vercel（推荐）

1. 把项目推到 GitHub 仓库
2. 登录 [Vercel](https://vercel.com/) 并 `Add New Project`
3. 选择这个仓库，保持默认设置并点击 `Deploy`
4. 部署完成后会得到 `https://xxx.vercel.app`，把这个链接发给朋友即可在线打开

项目已内置：
- `package.json` 中的 `build:web` 脚本
- `vercel.json`（自动使用 `npm run build:web`，发布 `dist/`）

### 3) 本地预览构建结果（可选）

```bash
npm run preview:web
```

## 输入说明

- `出生城市`: 用于自动匹配默认 `时区` 和 `经度`（命中内置城市库时）
- `时区`: IANA 格式，例如 `Asia/Shanghai` / `America/New_York`
- `经度`: 东经为正，西经为负，例如上海 `121.47`、纽约 `-74.01`

## 配置规则（你可直接改）

- `src/data/ruleConfig.ts`
  - `strength`: 强弱阈值与压力系数
  - `metrics`: 各维度 ten-god 系数 + 神煞系数
  - `patterns`: 格局识别规则（阈值、summary、boost）
  - `usefulElementPolicy`: 用神策略
  - `monthly`: 流月评分规则
  - `weekly`: 流周评分规则

## 配置问答规则（你可直接改）

- `src/data/qaConfig.ts`
  - `tones`: 咨询话术风格模板（开场、判断语气、行动语气、收束语）
  - `intents`: 问题意图分类（事业/财运/桃花/人际/健康/决策等）
  - `keywords`: 问题关键词触发
  - `baziReferences`: 八字理论依据（经典术语与判断框架）
  - `psychReferences`: 心理学框架（沟通、决策、执行）
  - `interpretationGuide` / `actionFramework`: 输出口径与行动处方
- `src/data/qaEngine.ts`
  - 关键词匹配意图
  - 结合盘面结果动态生成长文答复
  - 输出匹配度、八字依据、心理框架

## 目录

- `App.tsx`: 入口与页面切换
- `src/data/baziEngine.ts`: 真实八字排盘、时区/DST/真太阳时校正、运势模型
- `src/data/ruleConfig.ts`: 可配置规则参数
- `src/data/ruleEngine.ts`: 规则执行引擎
- `src/data/qaConfig.ts`: 咨询问答配置
- `src/data/qaEngine.ts`: 咨询问答引擎
- `src/components/LiuYueChart.tsx`: 流月柱状图组件
- `src/components/LiuZhouChart.tsx`: 流周柱状图组件
- `src/data/locationProfiles.ts`: 城市时区与经度映射
- `src/screens/HomeScreen.tsx`: 首页输入与入场动效
- `src/screens/ResultScreen.tsx`: 结果页与导出
- `src/components/RadarChart.tsx`: 雷达图（可交互）
- `src/components/TimelineChart.tsx`: 时间轴图
- `src/components/ParticleFlow.tsx`: 粒子背景
- `src/utils/reportHtml.ts`: PDF 模板生成
- `src/theme/tokens.ts`: 设计 token

## 下一步建议

1. 增加“地区经纬度搜索”与地图选点，降低手填成本
2. 接入真实节气分界与历法边界测试（跨时区/夏令时样本）
3. 增加订阅页（IAP / Play Billing）和报告历史云同步
